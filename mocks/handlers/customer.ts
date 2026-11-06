import { delay, HttpResponse, sse } from 'msw';
import * as C from '@/lib/contracts';
import { ALLOW_ONLINE_PAYMENTS } from '@/lib/flags';
import {
  bookingFeed,
  codCheck,
  createBooking,
  currentCustomer,
  customerByPhone,
  db,
  fail,
  findBooking,
  findOrderByToken,
  idempotent,
  MOCK_OTP,
  newOrder,
  now,
  orderFeed,
  priceCart,
  publicDealsEvents,
  randomToken,
  requireCustomer,
  requiresOtp,
  resolveZone,
  save,
  setDealsEventsOverride,
  soldOutFeed,
  storeStatus,
  toBooking,
  toCustomerOrder,
  transition,
  upsertCustomer,
  type CustomerRec,
} from '../db';
import { demoDeals, demoEvents } from '../fixtures/deals';
import { body, json, ok, param, route } from '../http';
import { getScenario, is } from '../scenario';

setDealsEventsOverride(() =>
  is('deals_demo') || is('event_full') ? { deals: demoDeals, events: demoEvents() } : null,
);

const PAYMENT_SCENARIOS = new Set([
  'payment_success',
  'payment_fail',
  'payment_pending_stuck',
  'payment_expired',
  'late_payment_success',
]);

const realtimeEvent = (o: C.Order): C.OrderRealtimeEvent => ({
  publicToken: o.publicToken,
  status: o.status,
  paymentStatus: o.paymentStatus,
  estimatedReadyAt: o.estimatedReadyAt,
  estimatedDeliveryAt: o.estimatedDeliveryAt,
  at: now(),
});

const publicCustomer = (c: CustomerRec): C.Customer => C.Customer.parse(c);

/** A saved address must belong to the customer (§4.1 ADDRESS_NOT_FOUND). */
function ownAddress(customer: CustomerRec | null, addressId: string) {
  return (
    customer?.addresses.find((x) => x.id === addressId) ??
    fail('ADDRESS_NOT_FOUND', 'Address not found.')
  );
}

/** At most `max` hits per `windowMs` for `key`; otherwise RATE_LIMITED with Retry-After. */
function rateLimit(bucket: Record<string, number[]>, key: string, max: number, windowMs: number) {
  const hits = (bucket[key] ?? []).filter((t) => Date.now() - t < windowMs);
  if (hits.length >= max) {
    const retryAfter = Math.max(1, Math.ceil((hits[0]! + windowMs - Date.now()) / 1000));
    fail(
      'RATE_LIMITED',
      'Too many tries. Give it a minute.',
      { retryAfter },
      { 'Retry-After': String(retryAfter) },
    );
  }
  bucket[key] = [...hits, Date.now()];
}

export const customerHandlers = [
  /* ---------- Public reads ---------- */
  route('get', '/api/menu', () => json(db.menu)),
  route('get', '/api/store/status', () => json(storeStatus())),
  route('get', '/api/deals-events', () => json(publicDealsEvents())),

  /* ---------- Quotes ---------- */
  route('post', '/api/delivery/quote', async ({ request }) => {
    const { location } = await body(request, C.DeliveryQuoteRequest);
    const zone = resolveZone(location);
    return json({
      zoneId: zone.id,
      zoneName: zone.name,
      fee: zone.fee,
      minOrder: Math.max(zone.minOrder, storeStatus().minOrderValue),
      etaMinutes: zone.etaMinutes,
    } satisfies C.DeliveryQuote);
  }),
  route('post', '/api/cart/quote', async ({ request }) => {
    const input = await body(request, C.QuoteRequest);
    const customer = input.phone ? customerByPhone(input.phone) : currentCustomer();
    const location = input.addressId
      ? ownAddress(customer, input.addressId).location
      : input.location;
    const priced = priceCart({ ...input, location }, customer);
    const quote: C.Quote = {
      ...priced,
      requiresOtp: input.phone ? requiresOtp(customer) : !currentCustomer(),
      cod: codCheck(customer, priced.total, input.scheduledFor),
    };
    return json(quote);
  }),

  /* ---------- Auth (phone OTP, §7) ---------- */
  route('post', '/api/auth/otp/request', async ({ request }) => {
    const { phone, turnstileToken } = await body(request, C.OtpRequest);
    if (!turnstileToken) fail('TURNSTILE_FAILED', 'Please try again.');
    if (is('otp_rate_limited'))
      fail(
        'RATE_LIMITED',
        'Too many codes. Try again soon.',
        { retryAfter: 540 },
        { 'Retry-After': '540' },
      );
    const rec = (db.otps[phone] ??= { code: MOCK_OTP, expiresAt: 0, sentAt: [] });
    const bucket = { [phone]: rec.sentAt };
    rateLimit(bucket, phone, 3, 10 * 60_000); // 3 per phone per 10 minutes
    rec.sentAt = bucket[phone]!;
    rec.expiresAt = Date.now() + 5 * 60_000;
    save();
    console.info(`[mock] OTP for ${phone} is ${MOCK_OTP}`);
    return json({ expiresInSeconds: 300, resendInSeconds: 30 } satisfies C.OtpRequestResponse);
  }),
  route('post', '/api/auth/otp/verify', async ({ request }) => {
    const { phone, code } = await body(request, C.OtpVerify);
    const rec = db.otps[phone] ?? fail('OTP_INVALID', 'Request a code first.');
    if (Date.now() > rec.expiresAt) fail('OTP_EXPIRED', 'That code expired. Request a new one.');
    if (code !== rec.code) fail('OTP_INVALID', 'That code is not right.');
    delete db.otps[phone];
    const isNew = !customerByPhone(phone);
    const customer = upsertCustomer(phone, null);
    customer.phoneVerifiedAt ??= now();
    db.session.customerId = customer.id;
    save();
    return json({ customer: publicCustomer(customer), isNew } satisfies C.OtpVerifyResponse);
  }),
  route('post', '/api/auth/logout', () => {
    db.session.customerId = null;
    save();
    return ok();
  }),
  route('get', '/api/me', () => json(publicCustomer(requireCustomer()))),
  route('patch', '/api/me', async ({ request }) => {
    const c = requireCustomer();
    Object.assign(c, await body(request, C.UpdateCustomerRequest));
    save();
    return json(publicCustomer(c));
  }),
  route('get', '/api/me/addresses', () => json(requireCustomer().addresses)),
  route('post', '/api/me/addresses', async ({ request }) => {
    const c = requireCustomer();
    const input = await body(request, C.AddressInput);
    resolveZone(input.location); // reject pins outside every zone up front
    const address: C.Address = {
      ...input,
      id: `adr_${randomToken().slice(0, 12)}`,
      isDefault: c.addresses.length === 0,
    };
    c.addresses.push(address);
    save();
    return json(address, 201);
  }),
  route('delete', '/api/me/addresses/:id', (info) => {
    const c = requireCustomer();
    const id = param(info, 'id');
    ownAddress(c, id);
    c.addresses = c.addresses.filter((a) => a.id !== id);
    save();
    return ok();
  }),

  /* ---------- Orders (§4.1 pipeline) ---------- */
  route('post', '/api/orders', async ({ request }) => {
    const key = request.headers.get(C.HEADERS.idempotencyKey);
    const input = await body(request, C.PlaceOrderRequest);
    if (is('idempotency_conflict'))
      fail('IDEMPOTENCY_CONFLICT', 'This request key was already used with a different body.');
    if (is('in_progress') && key) {
      const served = (db.inProgressServed[key] ?? 0) + 1;
      if (served <= 2) {
        db.inProgressServed[key] = served;
        db.stats.inProgress += 1;
        save();
        fail('IN_PROGRESS', 'Still working on it.', { retryAfter: 2 }, { 'Retry-After': '2' });
      }
    }
    const result = await idempotent(key, input, async () => {
      if (is('double_tap')) await delay(1500); // keep the first request in flight so a second tap overlaps
      if (!input.turnstileToken) fail('TURNSTILE_FAILED', 'Please try again.');
      if (
        input.paymentMethod !== 'cod' &&
        !ALLOW_ONLINE_PAYMENTS &&
        !PAYMENT_SCENARIOS.has(getScenario())
      )
        fail('VALIDATION_FAILED', 'Online payment is not enabled yet.', { field: 'paymentMethod' });

      const customer = upsertCustomer(input.customer.phone, input.customer.name);
      if (customer.isBlocked)
        fail('COD_NOT_ALLOWED', 'Please call the shop to order.', { reason: 'blocked' });
      if (input.paymentMethod === 'cod' && requiresOtp(customer))
        fail('UNAUTHENTICATED', 'Verify your phone number to place a cash order.', {
          reason: 'otp_required',
        });

      let address: C.Address | null = null;
      if (input.fulfilment === 'delivery') {
        if (input.addressId) address = ownAddress(customer, input.addressId);
        else if (input.newAddress) {
          resolveZone(input.newAddress.location);
          address = {
            ...input.newAddress,
            id: `adr_${randomToken().slice(0, 12)}`,
            isDefault: customer.addresses.length === 0,
          };
        }
      }

      const priced = priceCart({ ...input, location: address?.location ?? null }, customer);
      if (input.paymentMethod === 'cod') {
        const cod = codCheck(customer, priced.total, input.scheduledFor);
        if (!cod.allowed)
          fail('COD_NOT_ALLOWED', 'Cash on delivery is not available for this order.', {
            reason: cod.reason,
          });
      }

      // §6: same cart + same phone within 3 minutes → "place again?"
      const dup = db.orders.find(
        (o) =>
          o.customerId === customer.id &&
          o.cartHash === priced.cartHash &&
          Date.now() - new Date(o.order.createdAt).getTime() < 3 * 60_000,
      );
      if ((dup || is('duplicate_cart')) && !input.confirmDuplicate)
        fail('DUPLICATE_ORDER_SUSPECTED', 'You placed this same order a moment ago.', {
          existingToken: dup?.order.publicToken ?? db.orders[0]?.order.publicToken ?? randomToken(),
        });

      if (address && !customer.addresses.some((a) => a.id === address.id))
        customer.addresses.push(address);
      const rec = newOrder({ ...input, source: 'website' }, priced, customer, address);
      return { status: 201, body: { order: toCustomerOrder(rec) } satisfies C.PlaceOrderResponse };
    });
    return json(result.body, result.status);
  }),
  route('get', '/api/orders/track/:token', (info) =>
    json(toCustomerOrder(findOrderByToken(param(info, 'token')))),
  ),
  route('post', '/api/orders/:token/cancel', async (info) => {
    const rec = findOrderByToken(param(info, 'token'));
    const { reason } = await body(info.request, C.CancelOrderRequest);
    if (rec.order.status !== 'placed' || is('too_late_to_cancel'))
      fail('TOO_LATE_TO_CANCEL', 'The kitchen already started. Call us to change it.', {
        shopPhone: db.settings.shopPhone,
      });
    rec.autoAdvance = false;
    rec.rejectAt = null;
    rec.order.cancelReason = reason;
    transition(rec, 'cancelled', 'customer', rec.order.customer.name, reason);
    return json(toCustomerOrder(rec));
  }),
  route('get', '/api/orders/mine', () => {
    const c = requireCustomer();
    return json(db.orders.filter((o) => o.customerId === c.id).map(toCustomerOrder));
  }),

  /* ---------- Payments (§4.3) ---------- */
  route('post', '/api/payments/:provider/initiate', async (info) => {
    const provider = C.OnlineProvider.parse(param(info, 'provider'));
    const { orderToken } = await body(info.request, C.PaymentInitiateRequest);
    const key = info.request.headers.get(C.HEADERS.idempotencyKey);
    const result = await idempotent(key, { provider, orderToken }, async () => {
      const rec = findOrderByToken(orderToken);
      if (rec.order.status !== 'pending_payment')
        fail('INVALID_TRANSITION', 'This order is not awaiting payment.');
      // Only one pending payment per order: reuse it.
      if (!rec.payment || rec.payment.status !== 'pending') {
        const s = getScenario();
        const outcome =
          s === 'payment_fail'
            ? 'fail'
            : s === 'payment_pending_stuck'
              ? 'stuck'
              : s === 'payment_expired'
                ? 'expire'
                : s === 'late_payment_success'
                  ? 'late_success'
                  : 'success';
        const shortExpiry = outcome === 'expire' || outcome === 'late_success';
        rec.payment = {
          provider,
          status: 'pending',
          outcome,
          startedAt: Date.now(),
          expiresAt: Date.now() + (shortExpiry ? 10_000 : 15 * 60_000),
        };
        rec.order.paymentStatus = 'pending';
        save();
      }
      const out: C.PaymentInitiation = {
        provider,
        status: 'pending',
        // Mock gateway round trip: straight to the return page, which shows "confirming…".
        redirect: { url: `/track/${orderToken}?payment=return`, method: 'GET', fields: {} },
        expiresAt: new Date(rec.payment.expiresAt).toISOString(),
      };
      return { status: 200, body: out };
    });
    return json(result.body, result.status);
  }),
  // Real backend verifies the gateway hash then redirects; it never marks the order paid.
  route('get', '/api/payments/:provider/return', (info) => {
    const token = new URL(info.request.url).searchParams.get('token') ?? '';
    return HttpResponse.redirect(`/track/${token}?payment=return`, 302);
  }),

  /* ---------- Bookings (ADDITION) ---------- */
  route('post', '/api/bookings', async ({ request }) => {
    const key = request.headers.get(C.HEADERS.idempotencyKey);
    const input = await body(request, C.BookingRequest);
    const result = await idempotent(key, input, async () => {
      if (!input.turnstileToken) fail('TURNSTILE_FAILED', 'Please try again.');
      rateLimit(db.bookingAttempts, input.phone, 3, 60 * 60_000); // per phone (per IP: backend)
      const { turnstileToken: _t, ...intent } = input;
      return { status: 201, body: createBooking(intent) };
    });
    return json(result.body, result.status);
  }),
  route('get', '/api/bookings/:token', (info) =>
    json(toBooking(findBooking(param(info, 'token')))),
  ),

  /* ---------- Realtime (SSE; Supabase broadcast later) ---------- */
  sse('*/api/realtime/orders/:token', ({ client, params, request }) => {
    const token = String(params.token);
    const rec = db.orders.find((r) => r.order.publicToken === token);
    if (rec) client.send({ data: JSON.stringify(realtimeEvent(toCustomerOrder(rec))) });
    const off = orderFeed.on(({ rec: r }) => {
      if (r.order.publicToken === token)
        client.send({ data: JSON.stringify(realtimeEvent(toCustomerOrder(r))) });
    });
    request.signal.addEventListener('abort', off);
  }),
  sse('*/api/realtime/bookings/:token', ({ client, params, request }) => {
    const token = String(params.token);
    const off = bookingFeed.on((b) => {
      if (b.publicToken === token) client.send({ data: JSON.stringify(b) });
    });
    request.signal.addEventListener('abort', off);
  }),
  sse('*/api/realtime/menu', ({ client, request }) => {
    const off = soldOutFeed.on((e) => client.send({ data: JSON.stringify(e) }));
    request.signal.addEventListener('abort', off);
  }),
];
