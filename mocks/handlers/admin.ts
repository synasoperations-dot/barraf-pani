import { sse } from 'msw';
import { z } from 'zod';
import * as C from '@/lib/contracts';
import { rankZones } from '@/lib/geo';
import {
  applyBookingAction,
  codCheck,
  db,
  fail,
  findBooking,
  findOrderById,
  idempotent,
  maskPhone,
  MOCK_OTP,
  newOrder,
  now,
  orderFeed,
  priceCart,
  publicStaff,
  randomToken,
  requireStaff,
  resolveZone,
  save,
  seedAdminDemo,
  sessionStaff,
  setSoldOut,
  toAdminOrder,
  toBooking,
  transition,
  upsertCustomer,
  type CustomerRec,
  type OrderRec,
} from '../db';
import { body, json, ok, param, route } from '../http';
import { is } from '../scenario';

const MANAGERS: C.StaffRole[] = ['owner', 'manager'];
const FRONT: C.StaffRole[] = ['owner', 'manager', 'cashier'];
const ALL: C.StaffRole[] = ['owner', 'manager', 'kitchen', 'cashier', 'rider'];
const ACTIVE: C.OrderStatus[] = ['placed', 'accepted', 'preparing', 'ready', 'out_for_delivery'];
const PKT = 5 * 3_600_000;

/** Mock stand-in for the staff session (value = role), so proxy.ts can guard /admin in dev. */
function setStaffCookie(role: C.StaffRole | null) {
  if (typeof document === 'undefined') return;
  document.cookie = role
    ? `${C.MOCK_STAFF_COOKIE}=${role}; path=/; max-age=${60 * 60 * 12}; samesite=lax`
    : `${C.MOCK_STAFF_COOKIE}=; path=/; max-age=0; samesite=lax`;
}

/** The session is usable: set the marker and seed the demo data when asked to. */
function sessionReady(staff: { role: C.StaffRole }) {
  setStaffCookie(staff.role);
  if (is('admin_demo')) seedAdminDemo();
}

function adminCustomer(c: CustomerRec): C.AdminCustomer {
  const orders = db.orders.filter((o) => o.customerId === c.id);
  const done = orders.filter(
    (o) => o.order.status === 'delivered' || o.order.status === 'picked_up',
  );
  return {
    id: c.id,
    name: c.name,
    phone: c.anonymizedAt ? '—' : maskPhone(c.phone),
    isBlocked: c.isBlocked,
    blockReason: c.blockReason,
    codAllowed: c.codAllowed,
    failedCodCount: c.failedCodCount,
    orderCount: orders.length,
    totalSpent: done.reduce((s, o) => s + o.order.total, 0),
    whatsappOptIn: c.whatsappOptIn,
    anonymizedAt: c.anonymizedAt,
    lastOrderAt:
      orders
        .map((o) => o.order.createdAt)
        .sort()
        .at(-1) ?? null,
    createdAt: c.createdAt,
  };
}

/** "1042", "bp-1042" or phone digits ("0300 1234567" / "+92300…"). */
function matchesQuery(rec: OrderRec, q: string) {
  const digits = q.replace(/\D/g, '');
  if (!digits) return false;
  if (rec.order.number.slice(3) === digits) return true;
  const phone = db.customers.find((c) => c.id === rec.customerId)?.phone ?? '';
  const local = digits.startsWith('0') ? `92${digits.slice(1)}` : digits;
  return digits.length >= 4 && (phone.includes(digits) || phone.includes(local));
}

const find = <T>(list: T[], pred: (x: T) => boolean, what: string) =>
  list.find(pred) ?? fail('NOT_FOUND', `${what} not found.`);
const findCustomer = (id: string) => find(db.customers, (c) => c.id === id, 'Customer');
const findItem = (id: string) => find(db.menu.items, (i) => i.id === id, 'Item');
const allRiders = () => db.staff.filter((s) => s.role === 'rider');
const riders = () => allRiders().filter((s) => s.isActive);

function assignmentView(
  rec: OrderRec,
  viewer: { id: string; role: C.StaffRole },
): C.RiderAssignment {
  const a = rec.assignment!;
  return {
    orderId: rec.order.id,
    riderId: a.riderId,
    assignedAt: a.assignedAt,
    pickedUpAt: a.pickedUpAt,
    deliveredAt: a.deliveredAt,
    cashInHand: a.cashInHand,
    order: toAdminOrder(rec, viewer),
  };
}

function settlement(rider: C.Staff): C.RiderSettlement {
  const open = db.orders.filter(
    (o) =>
      o.assignment?.riderId === rider.id && o.assignment.cashInHand > 0 && !o.assignment.settled,
  );
  return {
    rider,
    openCash: open.reduce((s, o) => s + o.assignment!.cashInHand, 0),
    orders: open.map((o) => ({
      publicToken: o.order.publicToken,
      number: o.order.number,
      cashInHand: o.assignment!.cashInHand,
      deliveredAt: o.assignment!.deliveredAt,
    })),
  };
}

function crud<T extends { id: string }>(
  path: string,
  list: () => T[],
  schema: z.ZodType<Omit<T, 'id'>>,
  prefix: string,
  roles = MANAGERS,
  readRoles = roles,
) {
  return [
    route('get', path, () => {
      requireStaff(readRoles);
      return json(list());
    }),
    route('post', path, async ({ request }) => {
      requireStaff(roles);
      const row = {
        ...(await body(request, schema)),
        id: `${prefix}_${randomToken().slice(0, 10)}`,
      } as T;
      list().push(row);
      save();
      return json(row, 201);
    }),
    route('patch', `${path}/:id`, async (info) => {
      requireStaff(roles);
      const row = find(list(), (x) => x.id === param(info, 'id'), 'Row');
      Object.assign(row, await body(info.request, (schema as unknown as z.ZodObject).partial()));
      save();
      return json(row);
    }),
  ];
}

export const adminHandlers = [
  /* ---------- Staff auth: email + password, TOTP 2FA (§7) ---------- */
  route('post', '/api/admin/auth/login', async ({ request }) => {
    const { email, password } = await body(request, C.StaffLoginRequest);
    const staff = db.staff.find((s) => s.email === email && s.isActive);
    if (!staff || staff.password !== password)
      return fail('UNAUTHENTICATED', 'Email or password is wrong.', { reason: 'session' });
    const next: C.StaffLoginResponse['next'] = staff.twoFactorEnabled
      ? 'verify_2fa'
      : MANAGERS.includes(staff.role)
        ? 'enrol_2fa' // 2FA is required for owner and manager
        : 'ok';
    db.session.staffId = staff.id;
    db.session.staffPending = next === 'ok' ? null : next;
    if (next === 'ok') sessionReady(staff);
    save();
    return json({ staff: publicStaff(staff), next } satisfies C.StaffLoginResponse);
  }),
  route('post', '/api/admin/auth/2fa/enrol', () => {
    const staff =
      db.staff.find((s) => s.id === db.session.staffId) ??
      fail('UNAUTHENTICATED', 'Log in first.', { reason: 'session' });
    const secret = 'MOCKSECRETBARRAFPAANI';
    return json({
      secret,
      otpauthUrl: `otpauth://totp/BarrafPaani:${encodeURIComponent(staff.email)}?secret=${secret}&issuer=BarrafPaani`,
      recoveryCodes: Array.from({ length: 8 }, () => randomToken().slice(0, 10).toUpperCase()),
    } satisfies C.TwoFactorEnrolResponse);
  }),
  route('post', '/api/admin/auth/2fa/verify', async ({ request }) => {
    const { code } = await body(request, C.TwoFactorVerifyRequest);
    const staff =
      db.staff.find((s) => s.id === db.session.staffId) ??
      fail('UNAUTHENTICATED', 'Log in first.', { reason: 'session' });
    if (code !== MOCK_OTP) fail('OTP_INVALID', 'That code is not right.');
    staff.twoFactorEnabled = true;
    db.session.staffPending = null;
    sessionReady(staff);
    save();
    return json(publicStaff(staff));
  }),
  route('post', '/api/admin/auth/logout', () => {
    db.session.staffId = null;
    db.session.staffPending = null;
    setStaffCookie(null);
    save();
    return ok();
  }),
  route('get', '/api/admin/me', () => json(publicStaff(requireStaff()))),

  /* ---------- Orders ---------- */
  route('get', '/api/admin/orders', ({ request }) => {
    const staff = requireStaff(ALL);
    const q = new URL(request.url).searchParams;
    const statuses = q.getAll('status');
    const sources = q.getAll('source');
    const from = q.get('from');
    const to = q.get('to');
    const search = q.get('q');
    const customerId = q.get('customerId');
    return json(
      db.orders
        .filter((r) => !search || matchesQuery(r, search))
        .filter((r) => !customerId || r.customerId === customerId)
        .filter((r) => !statuses.length || statuses.includes(r.order.status))
        .filter((r) => !sources.length || sources.includes(r.order.source))
        .filter((r) => !from || r.order.createdAt >= from)
        .filter((r) => !to || r.order.createdAt <= to)
        .map((r) => toAdminOrder(r, staff)),
    );
  }),
  // Registered before `/:id` so "manual" is never read as an id.
  route('post', '/api/admin/orders/manual', async ({ request }) => {
    const staff = requireStaff(FRONT);
    const input = await body(request, C.ManualOrderRequest);
    const result = await idempotent(
      request.headers.get(C.HEADERS.idempotencyKey),
      input,
      async () => {
        // Staff took the call: no OTP or Turnstile; every other create_order rule applies.
        const customer = upsertCustomer(input.customer.phone, input.customer.name);
        let address: C.Address | null = null;
        if (input.fulfilment === 'delivery') {
          if (input.addressId)
            address = find(customer.addresses, (a) => a.id === input.addressId, 'Address');
          else if (input.newAddress) {
            resolveZone(input.newAddress.location);
            address = {
              ...input.newAddress,
              id: `adr_${randomToken().slice(0, 12)}`,
              isDefault: customer.addresses.length === 0,
            };
            customer.addresses.push(address);
          }
        }
        const priced = priceCart(
          { ...input, location: address?.location ?? null, tip: 0 },
          customer,
        );
        if (input.paymentMethod === 'cod') {
          const cod = codCheck(customer, priced.total, input.scheduledFor);
          if (!cod.allowed)
            fail('COD_NOT_ALLOWED', 'Cash on delivery is not available for this order.', {
              reason: cod.reason,
            });
        }
        const rec = newOrder({ ...input, whatsappOptIn: false }, priced, customer, address);
        rec.order.events[0]!.actorName = staff.name;
        const out: C.ManualOrderResponse = {
          order: toAdminOrder(rec, staff),
          publicToken: rec.order.publicToken,
          trackingPath: `/track/${rec.order.publicToken}`,
        };
        return { status: 201, body: out };
      },
    );
    return json(result.body, result.status);
  }),
  route('get', '/api/admin/orders/:id', (info) =>
    json(toAdminOrder(findOrderById(param(info, 'id')), requireStaff(ALL))),
  ),
  route('post', '/api/admin/orders/:id/transition', async (info) => {
    const staff = requireStaff(ALL);
    const input = await body(info.request, C.TransitionRequest);
    const id = param(info, 'id');
    const result = await idempotent(
      info.request.headers.get(C.HEADERS.idempotencyKey),
      { id, ...input },
      async () => {
        const rec = findOrderById(id);
        const o = rec.order;
        if (o.status === input.to) return { status: 200, body: toAdminOrder(rec, staff) }; // no-op success
        if (is('version_conflict') && !rec.versionConflictServed) {
          rec.versionConflictServed = true;
          o.version += 1; // someone else's tablet got there first
          save();
        }
        if (o.version !== input.version)
          fail('VERSION_CONFLICT', 'Someone else just updated this order.', {
            currentVersion: o.version,
          });
        const fits = !(
          (input.to === 'out_for_delivery' && o.fulfilment === 'pickup') ||
          (input.to === 'picked_up' && o.fulfilment === 'delivery')
        );
        if (!C.ORDER_TRANSITIONS[o.status].includes(input.to) || !fits)
          fail('INVALID_TRANSITION', `Cannot move from ${o.status} to ${input.to}.`);
        if (!C.canRoleMove(staff.role, o, input.to))
          fail('FORBIDDEN', 'Your role cannot make that change.');
        rec.autoAdvance = false; // staff took over
        rec.rejectAt = null;
        if (input.to === 'cancelled' || input.to === 'rejected') o.cancelReason = input.note;
        if (input.to === 'accepted') {
          // Prep time → ETAs the customer sees (§4.2 "updated ETAs").
          const prep = input.prepMinutes ?? 20;
          const zone = o.address ? (rankZones(o.address.location, db.zones)[0] ?? null) : null;
          const readyAt = Date.now() + prep * 60_000;
          o.estimatedReadyAt = new Date(readyAt).toISOString();
          if (o.fulfilment === 'delivery')
            o.estimatedDeliveryAt = new Date(
              readyAt + (zone?.etaMinutes ?? 15) * 60_000,
            ).toISOString();
        }
        if (input.to === 'cancelled' && o.status === 'out_for_delivery') {
          const c = db.customers.find((x) => x.id === rec.customerId);
          if (c && ++c.failedCodCount >= 2) c.codAllowed = false; // 2+ no-shows disable COD (§7)
        }
        transition(rec, input.to, 'staff', staff.name, input.note);
        return { status: 200, body: toAdminOrder(rec, staff) };
      },
    );
    return json(result.body, result.status);
  }),
  route('post', '/api/admin/orders/:id/assign-rider', async (info) => {
    const staff = requireStaff(FRONT);
    const { riderId } = await body(info.request, C.AssignRiderRequest);
    const rider = find(riders(), (r) => r.id === riderId, 'Rider');
    const rec = findOrderById(param(info, 'id'));
    if (rec.order.fulfilment !== 'delivery')
      fail('INVALID_TRANSITION', 'Pickup orders have no rider.');
    rec.assignment = {
      riderId: rider.id,
      assignedAt: now(),
      pickedUpAt: null,
      deliveredAt: null,
      cashInHand: 0,
      settled: false,
    };
    rec.order.rider = { id: rider.id, name: rider.name };
    rec.order.version += 1;
    rec.autoAdvance = false; // the rider drives it from here
    save();
    orderFeed.emit({ rec, kind: 'updated' });
    return json(toAdminOrder(rec, staff));
  }),

  /* ---------- Rider PWA ---------- */
  // Active assignments, unsettled cash, and today's finished deliveries.
  route('get', '/api/rider/assignments', () => {
    const rider = requireStaff(['rider']);
    const today = new Date(Date.now() + PKT).toISOString().slice(0, 10);
    const isToday = (iso: string | null) =>
      !!iso && new Date(new Date(iso).getTime() + PKT).toISOString().slice(0, 10) === today;
    return json(
      db.orders
        .filter(
          (o) =>
            o.assignment?.riderId === rider.id &&
            (o.order.status === 'ready' ||
              o.order.status === 'out_for_delivery' ||
              (o.assignment.cashInHand > 0 && !o.assignment.settled) ||
              isToday(o.assignment.deliveredAt ?? o.order.completedAt)),
        )
        .map((o) => assignmentView(o, rider)),
    );
  }),
  route('post', '/api/rider/assignments/:orderId/picked-up', async (info) => {
    const rider = requireStaff(['rider']);
    const rec = find(
      db.orders,
      (o) => o.order.id === param(info, 'orderId') && o.assignment?.riderId === rider.id,
      'Assignment',
    );
    const result = await idempotent(
      info.request.headers.get(C.HEADERS.idempotencyKey),
      { id: rec.order.id, step: 'picked_up' },
      async () => {
        if (rec.order.status !== 'out_for_delivery') {
          if (rec.order.status !== 'ready')
            fail('INVALID_TRANSITION', 'The order is not ready yet.');
          rec.assignment!.pickedUpAt = now();
          transition(rec, 'out_for_delivery', 'staff', rider.name);
        }
        return { status: 200, body: assignmentView(rec, rider) };
      },
    );
    return json(result.body, result.status);
  }),
  route('post', '/api/rider/assignments/:orderId/delivered', async (info) => {
    const rider = requireStaff(['rider']);
    const rec = find(
      db.orders,
      (o) => o.order.id === param(info, 'orderId') && o.assignment?.riderId === rider.id,
      'Assignment',
    );
    const { cashCollected } = await body(info.request, C.DeliveredRequest);
    const result = await idempotent(
      info.request.headers.get(C.HEADERS.idempotencyKey),
      { id: rec.order.id, cashCollected },
      async () => {
        if (rec.order.status !== 'delivered') {
          if (rec.order.status !== 'out_for_delivery')
            fail('INVALID_TRANSITION', 'Mark it picked up first.');
          const due = rec.order.paymentMethod === 'cod' ? rec.order.total : 0;
          if (cashCollected !== due)
            fail('VALIDATION_FAILED', `Collect exactly Rs ${due}.`, {
              field: 'cashCollected',
              due,
            });
          rec.assignment!.deliveredAt = now();
          rec.assignment!.cashInHand = cashCollected;
          transition(rec, 'delivered', 'staff', rider.name);
        }
        return { status: 200, body: assignmentView(rec, rider) };
      },
    );
    return json(result.body, result.status);
  }),

  /* ---------- Menu ---------- */
  route('get', '/api/admin/menu', () => {
    requireStaff(ALL);
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
    item.isActive = false; // soft delete: orders reference it (§5 conventions)
    db.menu.updatedAt = now();
    save();
    return json(item);
  }),
  route('post', '/api/admin/menu/items/:id/sold-out', async (info) => {
    requireStaff(['owner', 'manager', 'kitchen']);
    const item = findItem(param(info, 'id'));
    const input = await body(info.request, C.SoldOutRequest);
    setSoldOut(item.id, input.isSoldOut, input.soldOutUntil);
    return json(item);
  }),
  route('patch', '/api/admin/menu/modifier-groups/:id', async (info) => {
    requireStaff(MANAGERS);
    const group = find(db.menu.modifierGroups, (g) => g.id === param(info, 'id'), 'Group');
    Object.assign(group, await body(info.request, C.ModifierGroupPatch));
    db.menu.updatedAt = now();
    save();
    return json(group);
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
    const cat = find(db.menu.categories, (c) => c.id === param(info, 'id'), 'Category');
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
    // Mock keeps the data URL as the path; the backend checks MIME + signature and re-encodes.
    return json({ path: dataUrl } satisfies C.UploadResponse, 201);
  }),

  /* ---------- Settings, hours, holidays, zones ---------- */
  // Every staff screen reads the timings (auto-reject, manager alert, pre-order release).
  route('get', '/api/admin/settings', () => {
    requireStaff(ALL);
    return json(db.settings);
  }),
  route('patch', '/api/admin/settings', async ({ request }) => {
    requireStaff(['owner']);
    Object.assign(db.settings, await body(request, C.StoreSettingsPatch));
    save();
    return json(db.settings);
  }),
  route('post', '/api/admin/settings/pause', async ({ request }) => {
    requireStaff(MANAGERS);
    const { paused, reason } = await body(request, C.PauseRequest);
    db.settings.isAcceptingOrders = !paused;
    db.settings.pauseReason = paused ? reason : null;
    save();
    return json(db.settings);
  }),
  route('get', '/api/admin/hours', () => {
    requireStaff(MANAGERS);
    return json(db.hours);
  }),
  route('put', '/api/admin/hours', async ({ request }) => {
    requireStaff(['owner']);
    db.hours = (await body(request, C.HoursRequest)).hours;
    save();
    return json(db.hours);
  }),
  route('get', '/api/admin/holidays', () => {
    requireStaff(MANAGERS);
    return json(db.holidays);
  }),
  route('post', '/api/admin/holidays', async ({ request }) => {
    requireStaff(['owner']);
    const h = await body(request, C.Holiday);
    db.holidays = [...db.holidays.filter((x) => x.date !== h.date), h].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    save();
    return json(db.holidays, 201);
  }),
  route('delete', '/api/admin/holidays/:date', (info) => {
    requireStaff(['owner']);
    db.holidays = db.holidays.filter((x) => x.date !== param(info, 'date'));
    save();
    return json(db.holidays);
  }),
  ...crud('/api/admin/zones', () => db.zones, C.ZoneInput, 'zone'),
  route('delete', '/api/admin/zones/:id', (info) => {
    requireStaff(MANAGERS);
    const zone = find(db.zones, (z) => z.id === param(info, 'id'), 'Zone');
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
    const promo: C.Promo = { ...input, id: `promo_${randomToken().slice(0, 10)}`, usedCount: 0 };
    db.promos.push(promo);
    save();
    return json(promo, 201);
  }),
  route('patch', '/api/admin/promos/:id', async (info) => {
    requireStaff(MANAGERS);
    const promo = find(db.promos, (p) => p.id === param(info, 'id'), 'Promo');
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
  // Manual order entry: staff typed the number, so the answer carries it in full.
  route('get', '/api/admin/customers/lookup', ({ request }) => {
    const staff = requireStaff(FRONT);
    const phone = new URL(request.url).searchParams.get('phone') ?? '';
    const c = db.customers.find((x) => x.phone === phone && !x.anonymizedAt);
    if (!c) return fail('NOT_FOUND', 'New customer.');
    const lookup: C.CustomerLookup = {
      customer: {
        id: c.id,
        name: c.name,
        phone: c.phone,
        isBlocked: c.isBlocked,
        blockReason: c.blockReason,
        codAllowed: c.codAllowed,
        orderCount: db.orders.filter((o) => o.customerId === c.id).length,
        addresses: c.addresses,
      },
      recentOrders: db.orders
        .filter((o) => o.customerId === c.id)
        .sort((a, b) => b.order.createdAt.localeCompare(a.order.createdAt))
        .slice(0, 3)
        .map((o) => toAdminOrder(o, staff)),
    };
    return json(lookup);
  }),
  route('post', '/api/admin/customers/:id/cod', async (info) => {
    requireStaff(MANAGERS);
    const c = findCustomer(param(info, 'id'));
    c.codAllowed = (await body(info.request, C.CodAllowedRequest)).codAllowed;
    if (c.codAllowed) c.failedCodCount = 0;
    save();
    return json(adminCustomer(c));
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

  /* ---------- Refunds: manager requests, owner approves (§13.2) ---------- */
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
        const rec = find(db.orders, (o) => o.order.publicToken === input.orderToken, 'Order');
        if (rec.order.paymentStatus !== 'paid' || rec.order.paymentMethod === 'cod')
          fail('VALIDATION_FAILED', 'Only paid online orders can be refunded.');
        const already = db.refunds
          .filter((r) => r.orderToken === input.orderToken && r.status !== 'rejected')
          .reduce((s, r) => s + r.amount, 0);
        if (input.amount + already > rec.order.total)
          fail('VALIDATION_FAILED', 'Refund is more than was paid.', { field: 'amount' });
        const refund: C.Refund = {
          id: `ref_${randomToken().slice(0, 10)}`,
          orderNumber: rec.order.number,
          orderToken: rec.order.publicToken,
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
    const refund = find(db.refunds, (r) => r.id === param(info, 'id'), 'Refund');
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
      const rec = db.orders.find((o) => o.order.publicToken === refund.orderToken);
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

  /* ---------- Riders & settlement ---------- */
  route('get', '/api/admin/riders', () => {
    requireStaff(FRONT);
    return json(allRiders().map(publicStaff));
  }),
  route('patch', '/api/admin/riders/:id', async (info) => {
    requireStaff(MANAGERS);
    const rider = find(allRiders(), (r) => r.id === param(info, 'id'), 'Rider');
    rider.isActive = (await body(info.request, C.RiderPatch)).isActive;
    save();
    return json(publicStaff(rider));
  }),
  route('get', '/api/admin/riders/settlement', () => {
    requireStaff(MANAGERS);
    return json(riders().map((r) => settlement(publicStaff(r))));
  }),
  route('post', '/api/admin/riders/:id/settle', (info) => {
    requireStaff(MANAGERS);
    const rider = publicStaff(find(riders(), (r) => r.id === param(info, 'id'), 'Rider'));
    for (const o of db.orders)
      if (o.assignment?.riderId === rider.id && o.assignment.cashInHand > 0)
        o.assignment.settled = true;
    save();
    return json(settlement(rider));
  }),

  /* ---------- Reviews moderation ---------- */
  route('get', '/api/admin/reviews', () => {
    requireStaff(MANAGERS);
    return json(db.reviews);
  }),
  route('patch', '/api/admin/reviews/:id', async (info) => {
    requireStaff(MANAGERS);
    const review = find(db.reviews, (r) => r.id === param(info, 'id'), 'Review');
    Object.assign(review, await body(info.request, C.ReviewPatch));
    save();
    return json(review);
  }),

  /* ---------- Reports ---------- */
  route('get', '/api/admin/reports/sales', ({ request }) => {
    requireStaff(MANAGERS);
    const q = new URL(request.url).searchParams;
    const from = q.get('from') ?? new Date(Date.now() - 7 * 86_400_000).toISOString();
    const to = q.get('to') ?? now();
    const inRange = (iso: string) => {
      const t = new Date(iso).getTime();
      return t >= new Date(from).getTime() && t <= new Date(to).getTime();
    };
    const all = db.orders.map((r) => r.order).filter((o) => inRange(o.createdAt));
    const done = all.filter((o) => o.status === 'delivered' || o.status === 'picked_up');
    const local = (iso: string) => new Date(new Date(iso).getTime() + PKT);
    const gross = done.reduce((s, o) => s + o.total, 0);
    const byDay = new Map<string, { orders: number; total: number }>();
    const items = new Map<string, { name: string; qty: number; total: number }>();
    const cats = new Map<string, { name: string; qty: number; total: number }>();
    const byHour = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }));
    for (const o of done) {
      const d = local(o.createdAt).toISOString().slice(0, 10);
      const day = byDay.get(d) ?? { orders: 0, total: 0 };
      byDay.set(d, { orders: day.orders + 1, total: day.total + o.total });
      byHour[local(o.createdAt).getUTCHours()]!.orders += 1;
      for (const l of o.lines) {
        const it = items.get(l.itemId) ?? { name: l.name.en, qty: 0, total: 0 };
        items.set(l.itemId, { ...it, qty: it.qty + l.qty, total: it.total + l.lineTotal });
        const catId = db.menu.items.find((i) => i.id === l.itemId)?.categoryId ?? 'other';
        const cat = cats.get(catId) ?? {
          name: db.menu.categories.find((c) => c.id === catId)?.name.en ?? 'Other',
          qty: 0,
          total: 0,
        };
        cats.set(catId, { ...cat, qty: cat.qty + l.qty, total: cat.total + l.lineTotal });
      }
    }
    // Orders by source per day count every order the source brought in (not only completed).
    const sourceDay = new Map<string, number>();
    for (const o of all) {
      const k = `${local(o.createdAt).toISOString().slice(0, 10)}|${o.source}`;
      sourceDay.set(k, (sourceDay.get(k) ?? 0) + 1);
    }
    const rejected = all.filter((o) => o.status === 'rejected');
    const group = <K extends string>(keys: readonly K[], get: (o: C.AdminOrder) => K) =>
      keys.map((k) => {
        const m = done.filter((o) => get(o) === k);
        return { key: k, count: m.length, total: m.reduce((s, o) => s + o.total, 0) };
      });
    const report: C.SalesReport = {
      from,
      to,
      orderCount: done.length,
      allOrders: all.length,
      cancelledCount: all.filter((o) => o.status === 'cancelled').length,
      rejectedCount: rejected.length,
      autoRejectedCount: rejected.filter((o) =>
        o.events.some((e) => e.status === 'rejected' && e.actorName === 'auto-reject job'),
      ).length,
      bookingsConfirmed: db.bookings.filter(
        (b) => ['confirmed', 'completed'].includes(b.status) && inRange(`${b.date}T12:00:00+05:00`),
      ).length,
      byFulfilment: C.Fulfilment.options.map((f) => {
        const m = done.filter((o) => o.fulfilment === f);
        return { fulfilment: f, count: m.length, total: m.reduce((s, o) => s + o.total, 0) };
      }),
      byHour,
      byCategory: [...cats]
        .map(([categoryId, v]) => ({ categoryId, ...v }))
        .sort((a, b) => b.total - a.total),
      bySourceByDay: [...sourceDay]
        .map(([k, count]) => {
          const [date, source] = k.split('|') as [string, C.OrderSource];
          return { date, source, count };
        })
        .sort((a, b) => a.date.localeCompare(b.date)),
      grossSales: gross,
      discounts: done.reduce((s, o) => s + o.discount, 0),
      deliveryFees: done.reduce((s, o) => s + o.deliveryFee, 0),
      averageOrder: done.length ? Math.round(gross / done.length) : 0,
      byPaymentMethod: group(C.PaymentMethod.options, (o) => o.paymentMethod).map(
        ({ key, ...v }) => ({ method: key, ...v }),
      ),
      bySource: group(C.OrderSource.options, (o) => o.source).map(({ key, ...v }) => ({
        source: key,
        ...v,
      })),
      byDay: [...byDay]
        .map(([date, v]) => ({ date, ...v }))
        .sort((a, b) => a.date.localeCompare(b.date)),
      topItems: [...items]
        .map(([itemId, v]) => ({ itemId, ...v }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 10),
    };
    return json(report);
  }),

  /* ---------- Outbox: failed / dead + retry (§4.5) ---------- */
  route('get', '/api/admin/outbox', ({ request }) => {
    requireStaff(MANAGERS);
    const statuses = new URL(request.url).searchParams.getAll('status');
    return json(db.outbox.filter((o) => !statuses.length || statuses.includes(o.status)));
  }),
  route('post', '/api/admin/outbox/:id/retry', (info) => {
    requireStaff(MANAGERS);
    const item = find(db.outbox, (o) => o.id === param(info, 'id'), 'Outbox item');
    if (item.status !== 'failed' && item.status !== 'dead')
      fail('INVALID_TRANSITION', 'Only failed or dead items can be retried.');
    item.status = 'pending';
    item.attempts = 0;
    item.lastError = null;
    item.nextAttemptAt = now();
    save();
    return json(item);
  }),

  /* ---------- Bookings, deals, events (ADDITION) ---------- */
  route('get', '/api/admin/bookings', ({ request }) => {
    requireStaff(FRONT);
    const statuses = new URL(request.url).searchParams.getAll('status');
    return json(
      db.bookings.filter((b) => !statuses.length || statuses.includes(b.status)).map(toBooking),
    );
  }),
  route('patch', '/api/admin/bookings/:token', async (info) => {
    requireStaff(FRONT);
    const b = findBooking(param(info, 'token'));
    applyBookingAction(b, await body(info.request, C.BookingAction));
    return json(toBooking(b));
  }),
  ...crud('/api/admin/deals', () => db.deals, C.DealInput, 'deal'),
  route('delete', '/api/admin/deals/:id', (info) => {
    requireStaff(MANAGERS);
    db.deals = db.deals.filter((d) => d.id !== param(info, 'id'));
    save();
    return ok();
  }),
  ...crud(
    '/api/admin/events',
    () => db.events,
    C.EventInput.transform((e) => ({ ...e, spotsLeft: e.capacity })) as unknown as z.ZodType<
      Omit<C.Event, 'id'>
    >,
    'event',
    MANAGERS,
    FRONT, // the bookings screen reads capacity
  ),
  route('delete', '/api/admin/events/:id', (info) => {
    requireStaff(MANAGERS);
    db.events = db.events.filter((e) => e.id !== param(info, 'id'));
    save();
    return ok();
  }),

  /* ---------- Realtime (staff channel) ---------- */
  // Each viewer gets the role-filtered order (kitchen: masked phone). The backend uses one channel
  // per audience or id-only events + a refetch (docs/BACKEND_HANDOFF.md).
  sse('*/api/realtime/kitchen', ({ client, request }) => {
    const off = orderFeed.on(({ rec, kind }) => {
      if (kind === 'created' && !ACTIVE.includes(rec.order.status)) return;
      const event: C.KitchenEvent = {
        type: kind === 'created' ? 'order.created' : 'order.updated',
        order: toAdminOrder(rec, sessionStaff()),
      };
      client.send({ data: JSON.stringify(event) });
    });
    request.signal.addEventListener('abort', off);
  }),
];
