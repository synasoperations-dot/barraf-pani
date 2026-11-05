import { delay, HttpResponse, sse } from 'msw';
import * as C from '@/lib/contracts';
import {
  currentCustomer,
  db,
  fail,
  findOrderByToken,
  idempotent,
  MOCK_OTP,
  newOrder,
  now,
  onOrderChange,
  onSoldOut,
  priceCart,
  randomToken,
  requireCustomer,
  resolveZone,
  save,
  storeInfo,
  storeStatus,
  toCustomerOrder,
  transition,
  type CustomerRec,
} from '../db';
import { body, json, ok, param, route } from '../http';
import { getScenario, is } from '../scenario';

const realtimeEvent = (o: C.Order): C.OrderRealtimeEvent => ({
  token: o.token,
  status: o.status,
  paymentStatus: o.paymentStatus,
  estimatedReadyAt: o.estimatedReadyAt,
  estimatedDeliveryAt: o.estimatedDeliveryAt,
  at: now(),
});

export const customerHandlers = [
  /* ---------- Public reads ---------- */
  route('get', '/api/menu', () => json(db.menu)),
  route('get', '/api/store', () => json(storeInfo())),
  route('get', '/api/store/status', () => json(storeStatus())),
  route('get', '/api/delivery/zones', () => json(db.zones.filter((z) => z.isActive))),
  route('get', '/api/promos', () =>
    json(
      db.promos
        .filter((p) => p.isActive && p.isPublic)
        .map(({ code, kind, value, minOrder, validFrom, validUntil, description }) => ({
          code,
          kind,
          value,
          minOrder,
          validFrom,
          validUntil,
          description,
        })),
    ),
  ),

  /* ---------- Quotes ---------- */
  route('post', '/api/delivery/quote', async ({ request }) => {
    const { location } = await body(request, C.DeliveryQuoteRequest);
    const zone = resolveZone(location);
    return json({
      zoneId: zone.id,
      zoneName: zone.name,
      fee: zone.fee,
      minOrder: Math.max(zone.minOrder, db.settings.minOrderValue),
      etaMinutes: zone.etaMinutes,
    } satisfies C.DeliveryQuote);
  }),
  route('post', '/api/cart/quote', async ({ request }) => {
    const input = await body(request, C.QuoteRequest);
    const { address: _address, ...quote } = priceCart(input, currentCustomer());
    return json(quote);
  }),

  /* ---------- Auth ---------- */
  route('post', '/api/auth/otp/request', async ({ request }) => {
    const { phone, turnstileToken } = await body(request, C.OtpRequest);
    if (!turnstileToken) fail('TURNSTILE_FAILED', 'Please try again.');
    const rec = (db.otps[phone] ??= { code: MOCK_OTP, expiresAt: 0, sentAt: [] });
    rec.sentAt = rec.sentAt.filter((t) => Date.now() - t < 10 * 60_000);
    if (rec.sentAt.length >= 3) {
      const retry = Math.ceil((rec.sentAt[0]! + 10 * 60_000 - Date.now()) / 1000);
      fail(
        'RATE_LIMITED',
        'Too many codes. Try again soon.',
        { retryAfter: retry },
        { 'Retry-After': String(retry) },
      );
    }
    rec.sentAt.push(Date.now());
    rec.expiresAt = Date.now() + 5 * 60_000;
    save();
    console.info(`[mock] OTP for ${phone} is ${MOCK_OTP}`);
    return json({ expiresInSeconds: 300, resendInSeconds: 30 } satisfies C.OtpRequestResponse);
  }),
  route('post', '/api/auth/otp/verify', async ({ request }) => {
    const { phone, code } = await body(request, C.OtpVerify);
    const rec = db.otps[phone];
    if (!rec) return fail('OTP_INVALID', 'Request a code first.');
    if (Date.now() > rec.expiresAt) fail('OTP_EXPIRED', 'That code expired. Request a new one.');
    if (code !== rec.code) fail('OTP_INVALID', 'That code is not right.');
    delete db.otps[phone];
    let customer = db.customers.find((c) => c.phone === phone);
    const isNew = !customer;
    if (!customer) {
      customer = {
        id: `cus_${randomToken().slice(0, 12)}`,
        phone,
        name: null,
        phoneVerified: true,
        preferredLang: 'en',
        whatsappOptIn: false,
        codAllowed: true,
        createdAt: now(),
        isBlocked: false,
        blockReason: null,
        failedCodCount: 0,
        anonymizedAt: null,
        addresses: [],
      } satisfies CustomerRec;
      db.customers.push(customer);
    }
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
    if (input.isDefault || c.addresses.length === 0)
      c.addresses.forEach((a) => (a.isDefault = false));
    const address: C.Address = {
      ...input,
      id: `adr_${randomToken().slice(0, 12)}`,
      isDefault: input.isDefault || c.addresses.length === 0,
    };
    c.addresses.push(address);
    save();
    return json(address, 201);
  }),
  route('delete', '/api/me/addresses/:id', (info) => {
    const c = requireCustomer();
    const id = param(info, 'id');
    if (!c.addresses.some((a) => a.id === id)) fail('ADDRESS_NOT_FOUND', 'Address not found.');
    c.addresses = c.addresses.filter((a) => a.id !== id);
    save();
    return ok();
  }),

  /* ---------- Orders ---------- */
  route('post', '/api/orders', async ({ request }) => {
    const key = request.headers.get(C.HEADERS.idempotencyKey);
    const input = await body(request, C.PlaceOrderRequest);
    const result = await idempotent(key, input, async () => {
      if (is('double_tap')) await delay(1500); // keep the first request in flight so a second tap overlaps
      if (!input.turnstileToken) fail('TURNSTILE_FAILED', 'Please try again.');
      const customer = requireCustomer();
      if (customer.isBlocked) fail('COD_NOT_ALLOWED', 'Please call the shop to order.');
      const quote = priceCart({ ...input, location: null }, customer);
      if (input.paymentMethod === 'cod') {
        const tooFarOut =
          input.scheduledFor &&
          new Date(input.scheduledFor).getTime() - Date.now() >
            db.settings.preorderCodMaxHours * 3_600_000;
        if (!customer.codAllowed || quote.total > db.settings.maxCodValue || tooFarOut)
          fail('COD_NOT_ALLOWED', 'Cash on delivery is not available for this order.');
      }
      const dup = db.orders.find(
        (o) =>
          o.customerId === customer.id &&
          o.cartHash === quote.cartHash &&
          Date.now() - new Date(o.order.createdAt).getTime() < 3 * 60_000,
      );
      if (dup && !input.confirmDuplicate)
        fail('DUPLICATE_ORDER_SUSPECTED', 'You placed this same order a moment ago.', {
          existingToken: dup.order.token,
        });
      const rec = newOrder(input, quote, customer);
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
    if (rec.order.status !== 'placed')
      fail('TOO_LATE_TO_CANCEL', 'The kitchen already started. Call us to change it.', {
        shopPhone: db.settings.shopPhone,
      });
    rec.autoAdvance = false;
    rec.order.cancelReason = reason;
    transition(rec, 'cancelled', 'customer', rec.order.customer.name, reason);
    return json(toCustomerOrder(rec));
  }),
  route('get', '/api/orders/mine', () => {
    const c = requireCustomer();
    return json(db.orders.filter((o) => o.customerId === c.id).map(toCustomerOrder));
  }),

  /* ---------- Payments ---------- */
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
        const scenario = getScenario();
        rec.payment = {
          provider,
          status: 'pending',
          outcome:
            scenario === 'payment_fail'
              ? 'fail'
              : scenario === 'payment_pending_stuck'
                ? 'stuck'
                : 'success',
          startedAt: Date.now(),
          expiresAt: Date.now() + 15 * 60_000,
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

  /* ---------- Realtime (SSE) ---------- */
  sse('*/api/realtime/orders/:token', ({ client, params, request }) => {
    const token = String(params.token);
    const rec = db.orders.find((r) => r.order.token === token);
    if (rec) client.send({ data: JSON.stringify(realtimeEvent(toCustomerOrder(rec))) });
    const off = onOrderChange((r) => {
      if (r.order.token === token)
        client.send({ data: JSON.stringify(realtimeEvent(toCustomerOrder(r))) });
    });
    request.signal.addEventListener('abort', off);
  }),
  sse('*/api/realtime/menu', ({ client, request }) => {
    const off = onSoldOut((e) => client.send({ data: JSON.stringify(e) }));
    request.signal.addEventListener('abort', off);
  }),
];

function publicCustomer(c: CustomerRec): C.Customer {
  return C.Customer.parse(c);
}
