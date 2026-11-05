import { sse } from 'msw';
import { z } from 'zod';
import * as C from '@/lib/contracts';
import {
  db,
  emitOrder,
  emitSoldOut,
  fail,
  findOrderById,
  idempotent,
  maskPhone,
  MOCK_OTP,
  now,
  onOrderChange,
  publicStaff,
  randomToken,
  requireStaff,
  save,
  transition,
  type CustomerRec,
} from '../db';
import { body, json, ok, param, route } from '../http';

const MANAGERS: C.StaffRole[] = ['owner', 'manager'];
const ORDER_ROLES: C.StaffRole[] = ['owner', 'manager', 'kitchen', 'cashier', 'rider'];
const ACTIVE: C.OrderStatus[] = ['placed', 'accepted', 'preparing', 'ready', 'out_for_delivery'];

/** Who may make which move (ARCHITECTURE §4.2 role check). */
function canMove(role: C.StaffRole, from: C.OrderStatus, to: C.OrderStatus) {
  if (MANAGERS.includes(role)) return true;
  if (role === 'rider')
    return (
      to === 'out_for_delivery' ||
      to === 'delivered' ||
      (from === 'out_for_delivery' && to === 'cancelled')
    );
  if (role === 'kitchen' || role === 'cashier') return to !== 'cancelled' || from === 'placed';
  return false;
}

function adminCustomer(c: CustomerRec): C.AdminCustomer {
  const orders = db.orders.filter((o) => o.customerId === c.id);
  return {
    id: c.id,
    name: c.name,
    phone: c.anonymizedAt ? '—' : maskPhone(c.phone),
    isBlocked: c.isBlocked,
    blockReason: c.blockReason,
    codAllowed: c.codAllowed,
    failedCodCount: c.failedCodCount,
    orderCount: orders.length,
    totalSpent: orders
      .filter((o) => ['delivered', 'picked_up'].includes(o.order.status))
      .reduce((s, o) => s + o.order.total, 0),
    whatsappOptIn: c.whatsappOptIn,
    anonymizedAt: c.anonymizedAt,
    createdAt: c.createdAt,
  };
}

const findCustomer = (id: string) =>
  db.customers.find((c) => c.id === id) ?? fail('NOT_FOUND', 'Customer not found.');
const findItem = (id: string) =>
  db.menu.items.find((i) => i.id === id) ?? fail('NOT_FOUND', 'Item not found.');
const findRefund = (id: string) =>
  db.refunds.find((r) => r.id === id) ?? fail('NOT_FOUND', 'Refund not found.');

function settlement(rider: C.Rider): C.RiderSettlement {
  const orders = db.orders.filter(
    (o) =>
      o.order.rider?.id === rider.id &&
      o.order.paymentMethod === 'cod' &&
      o.order.status === 'delivered' &&
      !o.settled,
  );
  return {
    rider,
    openCash: orders.reduce((s, o) => s + o.order.total, 0),
    orders: orders.map((o) => ({
      token: o.order.token,
      number: o.order.number,
      cashInHand: o.order.total,
      deliveredAt: o.order.completedAt,
    })),
  };
}

export const adminHandlers = [
  /* ---------- Auth ---------- */
  route('post', '/api/admin/auth/login', async ({ request }) => {
    const { email, password } = await body(request, C.AdminLoginRequest);
    const staff = db.staff.find((s) => s.email === email && s.isActive);
    if (!staff || staff.password !== password)
      return fail('UNAUTHENTICATED', 'Email or password is wrong.');
    db.session.staffId = staff.id;
    db.session.staff2faPending = staff.twoFactorEnabled;
    save();
    return json({
      user: publicStaff(staff),
      requires2fa: staff.twoFactorEnabled,
    } satisfies C.AdminLoginResponse);
  }),
  route('post', '/api/admin/auth/2fa', async ({ request }) => {
    const { code } = await body(request, C.Admin2faRequest);
    const staff = db.staff.find((s) => s.id === db.session.staffId);
    if (!staff) return fail('UNAUTHENTICATED', 'Log in first.');
    if (code !== MOCK_OTP) fail('OTP_INVALID', 'That code is not right.');
    db.session.staff2faPending = false;
    save();
    return json(publicStaff(staff));
  }),
  route('post', '/api/admin/auth/logout', () => {
    db.session.staffId = null;
    db.session.staff2faPending = false;
    save();
    return ok();
  }),
  route('get', '/api/admin/me', () => json(publicStaff(requireStaff()))),

  /* ---------- Orders ---------- */
  route('get', '/api/admin/orders', ({ request }) => {
    requireStaff(ORDER_ROLES);
    const q = new URL(request.url).searchParams;
    const statuses = q.getAll('status');
    const from = q.get('from');
    const to = q.get('to');
    return json(
      db.orders
        .map((r) => r.order)
        .filter((o) => !statuses.length || statuses.includes(o.status))
        .filter((o) => !from || o.createdAt >= from)
        .filter((o) => !to || o.createdAt <= to),
    );
  }),
  route('get', '/api/admin/orders/:id', (info) => {
    requireStaff(ORDER_ROLES);
    return json(findOrderById(param(info, 'id')).order);
  }),
  route('post', '/api/admin/orders/:id/transition', async (info) => {
    const staff = requireStaff(ORDER_ROLES);
    const input = await body(info.request, C.TransitionRequest);
    const result = await idempotent(
      info.request.headers.get(C.HEADERS.idempotencyKey),
      { id: param(info, 'id'), ...input },
      async () => {
        const rec = findOrderById(param(info, 'id'));
        const o = rec.order;
        if (o.status === input.to) return { status: 200, body: o }; // no-op success
        if (o.version !== input.version)
          fail('VERSION_CONFLICT', 'Someone else just updated this order.', { current: o });
        const allowed = C.ORDER_TRANSITIONS[o.status].includes(input.to);
        const fitsFulfilment = !(
          (input.to === 'out_for_delivery' && o.fulfilment === 'pickup') ||
          (input.to === 'picked_up' && o.fulfilment === 'delivery')
        );
        if (!allowed || !fitsFulfilment)
          fail('INVALID_TRANSITION', `Cannot move from ${o.status} to ${input.to}.`);
        if (!canMove(staff.role, o.status, input.to))
          fail('FORBIDDEN', 'Your role cannot make that change.');
        rec.autoAdvance = false; // staff took over
        if (input.to === 'cancelled') o.cancelReason = input.note;
        if (input.to === 'cancelled' && o.status === 'out_for_delivery') {
          const c = db.customers.find((x) => x.id === rec.customerId);
          if (c && ++c.failedCodCount >= 2) c.codAllowed = false;
        }
        transition(rec, input.to, 'staff', staff.name, input.note);
        return { status: 200, body: o };
      },
    );
    return json(result.body, result.status);
  }),
  route('post', '/api/admin/orders/:id/assign-rider', async (info) => {
    requireStaff(['owner', 'manager', 'cashier']);
    const { riderId } = await body(info.request, C.AssignRiderRequest);
    const rider =
      db.riders.find((r) => r.id === riderId && r.isActive) ??
      fail('NOT_FOUND', 'Rider not found.');
    const rec = findOrderById(param(info, 'id'));
    rec.order.rider = { id: rider.id, name: rider.name };
    rec.order.version += 1;
    save();
    emitOrder(rec, 'updated');
    return json(rec.order);
  }),

  /* ---------- Menu ---------- */
  route('get', '/api/admin/menu', () => {
    requireStaff(ORDER_ROLES);
    return json(db.menu);
  }),
  route('post', '/api/admin/menu/items', async ({ request }) => {
    requireStaff(MANAGERS);
    const input = await body(request, C.ItemInput);
    if (db.menu.items.some((i) => i.slug === input.slug))
      fail('VALIDATION_FAILED', 'Slug already used.', { field: 'slug' });
    const item: C.Item = { ...input, id: `itm_${randomToken().slice(0, 10)}` };
    db.menu.items.push(item);
    db.menu.updatedAt = now();
    save();
    return json(item, 201);
  }),
  route('patch', '/api/admin/menu/items/:id', async (info) => {
    requireStaff(MANAGERS);
    const item = findItem(param(info, 'id'));
    Object.assign(item, await body(info.request, C.ItemPatch));
    db.menu.updatedAt = now();
    save();
    return json(item);
  }),
  route('delete', '/api/admin/menu/items/:id', (info) => {
    requireStaff(MANAGERS);
    const item = findItem(param(info, 'id'));
    item.isActive = false; // soft delete: orders reference it
    db.menu.updatedAt = now();
    save();
    return json(item);
  }),
  route('post', '/api/admin/menu/items/:id/sold-out', async (info) => {
    requireStaff(['owner', 'manager', 'kitchen']);
    const item = findItem(param(info, 'id'));
    const input = await body(info.request, C.SoldOutRequest);
    item.isSoldOut = input.isSoldOut;
    item.soldOutUntil = input.isSoldOut ? input.soldOutUntil : null;
    db.menu.updatedAt = now();
    save();
    emitSoldOut({ itemId: item.id, isSoldOut: item.isSoldOut, soldOutUntil: item.soldOutUntil });
    return json(item);
  }),
  route('post', '/api/admin/menu/categories', async ({ request }) => {
    requireStaff(MANAGERS);
    const cat: C.Category = {
      ...(await body(request, C.CategoryInput)),
      id: `cat_${randomToken().slice(0, 10)}`,
    };
    db.menu.categories.push(cat);
    save();
    return json(cat, 201);
  }),
  route('patch', '/api/admin/menu/categories/:id', async (info) => {
    requireStaff(MANAGERS);
    const cat =
      db.menu.categories.find((c) => c.id === param(info, 'id')) ??
      fail('NOT_FOUND', 'Category not found.');
    Object.assign(cat, await body(info.request, C.CategoryPatch));
    save();
    return json(cat);
  }),
  route('post', '/api/admin/uploads', async ({ request }) => {
    requireStaff(MANAGERS);
    const { dataUrl } = await body(
      request,
      z.object({ fileName: z.string(), dataUrl: z.string().startsWith('data:image/') }),
    );
    // Mock keeps the data URL as the path; the real backend re-encodes to WebP/AVIF in storage.
    return json({ path: dataUrl } satisfies C.UploadResponse, 201);
  }),

  /* ---------- Store settings & zones ---------- */
  route('get', '/api/admin/store', () => {
    requireStaff(MANAGERS);
    return json(db.settings);
  }),
  route('patch', '/api/admin/store', async ({ request }) => {
    requireStaff(MANAGERS);
    Object.assign(db.settings, await body(request, C.StoreSettingsPatch));
    save();
    return json(db.settings);
  }),
  route('post', '/api/admin/store/pause', async ({ request }) => {
    requireStaff(MANAGERS);
    const { paused, reason } = await body(request, C.PauseRequest);
    db.settings.isAcceptingOrders = !paused;
    db.settings.pauseReason = paused ? reason : null;
    save();
    return json(db.settings);
  }),
  route('get', '/api/admin/zones', () => {
    requireStaff(MANAGERS);
    return json(db.zones);
  }),
  route('post', '/api/admin/zones', async ({ request }) => {
    requireStaff(MANAGERS);
    const zone: C.DeliveryZone = {
      ...(await body(request, C.ZoneInput)),
      id: `zone_${randomToken().slice(0, 10)}`,
    };
    db.zones.push(zone);
    save();
    return json(zone, 201);
  }),
  route('patch', '/api/admin/zones/:id', async (info) => {
    requireStaff(MANAGERS);
    const zone =
      db.zones.find((z) => z.id === param(info, 'id')) ?? fail('NOT_FOUND', 'Zone not found.');
    Object.assign(zone, await body(info.request, C.ZoneInput.partial()));
    save();
    return json(zone);
  }),
  route('delete', '/api/admin/zones/:id', (info) => {
    requireStaff(MANAGERS);
    const zone =
      db.zones.find((z) => z.id === param(info, 'id')) ?? fail('NOT_FOUND', 'Zone not found.');
    zone.isActive = false;
    save();
    return json(zone);
  }),

  /* ---------- Promos ---------- */
  route('get', '/api/admin/promos', () => {
    requireStaff(MANAGERS);
    return json(db.promos);
  }),
  route('post', '/api/admin/promos', async ({ request }) => {
    requireStaff(MANAGERS);
    const input = await body(request, C.PromoInput);
    if (db.promos.some((p) => p.code === input.code))
      fail('VALIDATION_FAILED', 'Code already exists.', { field: 'code' });
    const promo: C.AdminPromo = {
      ...input,
      id: `promo_${randomToken().slice(0, 10)}`,
      usedCount: 0,
    };
    db.promos.push(promo);
    save();
    return json(promo, 201);
  }),
  route('patch', '/api/admin/promos/:id', async (info) => {
    requireStaff(MANAGERS);
    const promo =
      db.promos.find((p) => p.id === param(info, 'id')) ?? fail('NOT_FOUND', 'Promo not found.');
    Object.assign(promo, await body(info.request, C.PromoInput.partial()));
    save();
    return json(promo);
  }),

  /* ---------- Customers ---------- */
  route('get', '/api/admin/customers', ({ request }) => {
    requireStaff(MANAGERS);
    const q = (new URL(request.url).searchParams.get('q') ?? '').toLowerCase();
    return json(
      db.customers
        .filter((c) => !q || c.name?.toLowerCase().includes(q) || c.phone.includes(q))
        .map(adminCustomer),
    );
  }),
  route('post', '/api/admin/customers/:id/block', async (info) => {
    requireStaff(MANAGERS);
    const c = findCustomer(param(info, 'id'));
    c.isBlocked = true;
    c.blockReason = (await body(info.request, C.BlockRequest)).reason;
    save();
    return json(adminCustomer(c));
  }),
  route('post', '/api/admin/customers/:id/unblock', (info) => {
    requireStaff(MANAGERS);
    const c = findCustomer(param(info, 'id'));
    c.isBlocked = false;
    c.blockReason = null;
    save();
    return json(adminCustomer(c));
  }),
  route('post', '/api/admin/customers/:id/anonymize', (info) => {
    requireStaff(['owner']);
    const c = findCustomer(param(info, 'id'));
    c.name = null;
    c.anonymizedAt = now();
    for (const o of db.orders.filter((r) => r.customerId === c.id)) {
      o.order.customer.name = null;
      o.order.customer.phone = '—';
      if (o.order.address)
        o.order.address = {
          ...o.order.address,
          line1: '•••',
          landmark: null,
          recipientName: null,
          recipientPhone: null,
        };
    }
    save();
    return json(adminCustomer(c));
  }),

  /* ---------- Refunds ---------- */
  route('get', '/api/admin/refunds', () => {
    requireStaff(MANAGERS);
    return json(db.refunds);
  }),
  route('post', '/api/admin/refunds', async ({ request }) => {
    const staff = requireStaff(MANAGERS);
    const input = await body(request, C.RefundRequest);
    const result = await idempotent(
      request.headers.get(C.HEADERS.idempotencyKey),
      input,
      async () => {
        const rec =
          db.orders.find((o) => o.order.token === input.orderToken) ??
          fail('NOT_FOUND', 'Order not found.');
        if (rec.order.paymentStatus !== 'paid' || rec.order.paymentMethod === 'cod')
          fail('VALIDATION_FAILED', 'Only paid online orders can be refunded.');
        const refunded = db.refunds
          .filter((r) => r.orderToken === input.orderToken && r.status !== 'rejected')
          .reduce((s, r) => s + r.amount, 0);
        if (input.amount + refunded > rec.order.total)
          fail('VALIDATION_FAILED', 'Refund is more than was paid.');
        const refund: C.Refund = {
          id: `ref_${randomToken().slice(0, 10)}`,
          orderNumber: rec.order.number,
          orderToken: rec.order.token,
          provider: rec.order.paymentMethod,
          amount: input.amount,
          paidAmount: rec.order.total,
          reason: input.reason,
          status: 'requested',
          requestedBy: staff.name,
          processedBy: null,
          processedAt: null,
          createdAt: now(),
        };
        db.refunds.unshift(refund);
        save();
        return { status: 201, body: refund };
      },
    );
    return json(result.body, result.status);
  }),
  route('post', '/api/admin/refunds/:id/:action', (info) => {
    const staff = requireStaff(MANAGERS);
    const refund = findRefund(param(info, 'id'));
    const action = param(info, 'action');
    if (action === 'approve') {
      if (staff.role !== 'owner') fail('FORBIDDEN', 'Only the owner approves refunds.');
      if (refund.status !== 'requested')
        fail('INVALID_TRANSITION', 'Refund is not awaiting approval.');
      refund.status = 'approved';
    } else if (action === 'reject') {
      if (refund.status !== 'requested')
        fail('INVALID_TRANSITION', 'Refund is not awaiting approval.');
      refund.status = 'rejected';
    } else if (action === 'mark-processed') {
      if (refund.status !== 'approved') fail('INVALID_TRANSITION', 'Approve the refund first.');
      refund.status = 'processed';
      refund.processedBy = staff.name;
      refund.processedAt = now();
      const rec = db.orders.find((o) => o.order.token === refund.orderToken);
      if (rec) {
        const total = db.refunds
          .filter((r) => r.orderToken === refund.orderToken && r.status === 'processed')
          .reduce((s, r) => s + r.amount, 0);
        rec.order.paymentStatus = total >= rec.order.total ? 'refunded' : 'partially_refunded';
      }
    } else fail('NOT_FOUND', 'Unknown action.');
    save();
    return json(refund);
  }),

  /* ---------- Riders ---------- */
  route('get', '/api/admin/riders', () => {
    requireStaff(['owner', 'manager', 'cashier']);
    return json(db.riders);
  }),
  route('get', '/api/admin/riders/settlement', () => {
    requireStaff(MANAGERS);
    return json(db.riders.map(settlement));
  }),
  route('post', '/api/admin/riders/:id/settle', (info) => {
    requireStaff(MANAGERS);
    const rider =
      db.riders.find((r) => r.id === param(info, 'id')) ?? fail('NOT_FOUND', 'Rider not found.');
    const before = settlement(rider);
    for (const o of db.orders)
      if (before.orders.some((x) => x.token === o.order.token)) o.settled = true;
    save();
    return json(settlement(rider));
  }),

  /* ---------- Reports ---------- */
  route('get', '/api/admin/reports/sales', ({ request }) => {
    requireStaff(MANAGERS);
    const q = new URL(request.url).searchParams;
    const from = q.get('from') ?? new Date(Date.now() - 7 * 86_400_000).toISOString();
    const to = q.get('to') ?? now();
    const done = db.orders
      .map((r) => r.order)
      .filter(
        (o) =>
          o.createdAt >= from && o.createdAt <= to && ['delivered', 'picked_up'].includes(o.status),
      );
    const gross = done.reduce((s, o) => s + o.total, 0);
    const byDay = new Map<string, { orders: number; total: number }>();
    const items = new Map<string, { name: string; qty: number; total: number }>();
    for (const o of done) {
      const d = o.createdAt.slice(0, 10);
      const day = byDay.get(d) ?? { orders: 0, total: 0 };
      byDay.set(d, { orders: day.orders + 1, total: day.total + o.total });
      for (const l of o.lines) {
        const it = items.get(l.itemId) ?? { name: l.name.en, qty: 0, total: 0 };
        items.set(l.itemId, { ...it, qty: it.qty + l.qty, total: it.total + l.lineTotal });
      }
    }
    const report: C.SalesReport = {
      from,
      to,
      orderCount: done.length,
      grossSales: gross,
      discounts: done.reduce((s, o) => s + o.discount, 0),
      deliveryFees: done.reduce((s, o) => s + o.deliveryFee, 0),
      averageOrder: done.length ? Math.round(gross / done.length) : 0,
      byPaymentMethod: C.PaymentMethod.options.map((method) => {
        const m = done.filter((o) => o.paymentMethod === method);
        return { method, count: m.length, total: m.reduce((s, o) => s + o.total, 0) };
      }),
      byDay: [...byDay].map(([date, v]) => ({ date, ...v })),
      topItems: [...items]
        .map(([itemId, v]) => ({ itemId, ...v }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10),
    };
    return json(report);
  }),

  /* ---------- Notifications ---------- */
  route('get', '/api/admin/notifications/failed', () => {
    requireStaff(MANAGERS);
    return json(db.notifications);
  }),
  route('post', '/api/admin/notifications/:id/retry', (info) => {
    requireStaff(MANAGERS);
    const n =
      db.notifications.find((x) => x.id === param(info, 'id')) ??
      fail('NOT_FOUND', 'Notification not found.');
    n.status = 'failed';
    n.attempts = 0;
    n.nextAttemptAt = now();
    save();
    return json(n);
  }),

  /* ---------- Realtime (staff) ---------- */
  sse('*/api/realtime/kitchen', ({ client, request }) => {
    const off = onOrderChange((rec, kind) => {
      if (!ACTIVE.includes(rec.order.status) && kind === 'created') return;
      const event: C.KitchenEvent = {
        type: kind === 'created' ? 'order.created' : 'order.updated',
        order: rec.order,
      };
      client.send({ data: JSON.stringify(event) });
    });
    request.signal.addEventListener('abort', off);
  }),
];
