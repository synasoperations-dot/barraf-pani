/**
 * Self-check for the mock backend + API client + contract. Runs the real MSW handlers in Node.
 *   pnpm check:mocks
 */
import assert from 'node:assert/strict';
import { setupServer } from 'msw/node';
import { api, ApiError, newIdempotencyKey } from '@/lib/api';
import type { PlaceOrderRequest } from '@/lib/contracts';
import { db, resetDb, tick } from './db';
import { FILLET_FURY_ID } from './fixtures/menu';
import { adminHandlers } from './handlers/admin';
import { customerHandlers } from './handlers/customer';
import { setScenario } from './scenario';

const server = setupServer(...customerHandlers, ...adminHandlers);
server.listen({ onUnhandledFrame: 'error' });

async function code(p: Promise<unknown>) {
  try {
    await p;
    return 'OK';
  } catch (e) {
    if (e instanceof ApiError) return e.code;
    throw e;
  }
}

const INSIDE = { lat: 31.27, lng: 72.32 };
const OUTSIDE = { lat: 31.5, lng: 73.1 };

async function main() {
  resetDb();

  // Menu fixture: order, counts, variants.
  const menu = await api.menu();
  assert.deepEqual(
    menu.categories.map((c) => c.slug),
    ['fries', 'sandwiches', 'burgers', 'wings', 'wraps', 'pastas', 'pizzas', 'dips', 'sides'],
  );
  assert.equal(menu.items.length, 10 + 5 + 9 + 5 + 4 + 3 + 9 + 6 + 3);
  const byName = (n: string) => menu.items.find((i) => i.name.en === n)!;
  assert.deepEqual(
    byName('Street Fajita').variants.map((v) => v.price),
    [595, 695, 1095, 1695, 1750, 2295],
  );
  assert.deepEqual(
    byName('Pepper Heat').variants.map((v) => `${v.size}:${v.price}`),
    ['L:2100'],
  );
  assert.deepEqual(
    byName('Lava Burst').variants.map((v) => v.option),
    ['single', 'double'],
  );
  assert.ok(byName('Honey Glazed Wings').modifierGroupIds.includes('grp_honey_heat'));
  assert.ok(menu.items.every((i) => i.description === null));
  assert.equal(menu.combos.length, 0);

  assert.equal((await api.storeStatus()).state, 'open');

  // Auth + address.
  assert.equal(await code(api.me()), 'UNAUTHENTICATED');
  await api.requestOtp({ phone: '+923001234567', channel: 'sms', turnstileToken: 't' });
  assert.equal(
    await code(api.verifyOtp({ phone: '+923001234567', code: '000000' })),
    'OTP_INVALID',
  );
  const { isNew } = await api.verifyOtp({ phone: '+923001234567', code: '123456' });
  assert.ok(isNew);
  const base = {
    label: 'Home',
    line1: 'House 1, Street 2',
    area: 'Paradise City',
    landmark: null,
    isDefault: true,
  };
  assert.equal(await code(api.addAddress({ ...base, location: OUTSIDE })), 'OUTSIDE_ZONE');
  const address = await api.addAddress({ ...base, location: INSIDE });

  // Quote: server totals.
  const burger = byName('Crunch Kick');
  const lines = [
    {
      itemId: burger.id,
      variantId: burger.variants[0]!.id,
      modifierIds: ['mod_dip_ranch'],
      qty: 2,
      note: null,
    },
  ];
  const quoteReq = {
    lines,
    fulfilment: 'delivery' as const,
    addressId: address.id,
    location: null,
    promoCode: null,
    scheduledFor: null,
    tip: 0,
  };
  const quote = await api.cartQuote(quoteReq);
  assert.equal(quote.subtotal, (450 + 95) * 2);
  assert.equal(quote.total, quote.subtotal + quote.deliveryFee - quote.discount);
  const promoQuote = await api.cartQuote({ ...quoteReq, promoCode: 'MOCK10' });
  assert.equal(promoQuote.discount, Math.floor(quote.subtotal / 10));
  assert.equal(await code(api.cartQuote({ ...quoteReq, promoCode: 'NOPE' })), 'PROMO_INVALID');
  assert.equal(
    await code(
      api.cartQuote({
        ...quoteReq,
        lines: [
          {
            ...lines[0]!,
            modifierIds: [],
            qty: 1,
            itemId: byName('Ranch').id,
            variantId: byName('Ranch').variants[0]!.id,
          },
        ],
      }),
    ),
    'BELOW_MIN_ORDER',
  );

  // Idempotent order placement: concurrent double tap → one order.
  setScenario('double_tap');
  const order: PlaceOrderRequest = {
    lines,
    fulfilment: 'delivery',
    addressId: address.id,
    paymentMethod: 'cod',
    promoCode: null,
    scheduledFor: null,
    customerNote: null,
    tip: 0,
    whatsappOptIn: false,
    confirmDuplicate: false,
    turnstileToken: 'a',
  };
  const key = newIdempotencyKey();
  const [first, second] = await Promise.all([
    code(api.placeOrder(order, key)),
    code(api.placeOrder({ ...order, turnstileToken: 'b' }, key)),
  ]);
  assert.deepEqual([first, second].sort(), ['IN_PROGRESS', 'OK']);
  const replay = await api.placeOrder(order, key);
  assert.equal(db.orders.length, 1);
  assert.equal(replay.order.token, db.orders[0]!.order.token);
  assert.equal(
    await code(api.placeOrder({ ...order, customerNote: 'changed' }, key)),
    'IDEMPOTENCY_CONFLICT',
  );
  setScenario('happy');

  // Same cart, new key → "place again?"
  assert.equal(await code(api.placeOrder(order, newIdempotencyKey())), 'DUPLICATE_ORDER_SUSPECTED');

  // Timer progression placed → … → delivered (time travel instead of waiting).
  const rec = db.orders[0]!;
  for (let i = 0; i < 6; i++) {
    rec.lastChangeAt -= 60_000;
    tick();
  }
  const tracked = await api.trackOrder(rec.order.token);
  assert.equal(tracked.status, 'delivered');
  assert.deepEqual(
    tracked.events.map((e) => e.status),
    ['placed', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered'],
  );
  assert.equal(
    await code(api.cancelOrder(rec.order.token, { reason: null })),
    'TOO_LATE_TO_CANCEL',
  );

  // Sold out mid checkout: first quote OK, then the order fails.
  setScenario('item_sold_out_mid_checkout');
  const fillet = byName('Fillet Fury');
  const filletLines = [
    {
      itemId: FILLET_FURY_ID,
      variantId: fillet.variants[0]!.id,
      modifierIds: [],
      qty: 2,
      note: null,
    },
  ];
  await api.cartQuote({ ...quoteReq, lines: filletLines });
  assert.equal(
    await code(api.placeOrder({ ...order, lines: filletLines }, newIdempotencyKey())),
    'ITEM_SOLD_OUT',
  );
  assert.ok((await api.menu()).items.find((i) => i.id === FILLET_FURY_ID)!.isSoldOut);

  setScenario('store_closed');
  assert.equal((await api.storeStatus()).isAcceptingOrders, false);
  assert.equal(await code(api.cartQuote(quoteReq)), 'STORE_CLOSED');

  setScenario('outside_zone');
  assert.equal(await code(api.deliveryQuote({ location: INSIDE })), 'OUTSIDE_ZONE');

  // Online payment: pending_payment → (gateway) → paid + placed.
  setScenario('payment_success');
  const wings = byName('BBQ Wings');
  const wingLines = [
    { itemId: wings.id, variantId: wings.variants[0]!.id, modifierIds: [], qty: 2, note: null },
  ];
  const { order: online } = await api.placeOrder(
    { ...order, lines: wingLines, paymentMethod: 'jazzcash' },
    newIdempotencyKey(),
  );
  assert.equal(online.status, 'pending_payment');
  const payKey = newIdempotencyKey();
  await api.initiatePayment('jazzcash', { orderToken: online.token }, payKey);
  db.orders.find((o) => o.order.token === online.token)!.payment!.startedAt -= 10_000;
  tick();
  const paid = await api.trackOrder(online.token);
  assert.equal(paid.paymentStatus, 'paid');
  assert.equal(paid.status, 'placed');
  setScenario('happy');

  // Admin: role gate, 2FA, optimistic locking.
  assert.equal(await code(api.admin.orders()), 'UNAUTHENTICATED');
  const login = await api.admin.login({ email: 'owner@barrafpaani.test', password: 'barraf123' });
  assert.ok(login.requires2fa);
  assert.equal(await code(api.admin.orders()), 'UNAUTHENTICATED');
  await api.admin.verify2fa({ code: '123456' });
  const target = (await api.admin.orders({ status: ['placed'] }))[0]!;
  assert.equal(
    await code(
      api.admin.transition(
        target.id,
        { to: 'accepted', version: target.version + 5, note: null },
        newIdempotencyKey(),
      ),
    ),
    'VERSION_CONFLICT',
  );
  assert.equal(
    await code(
      api.admin.transition(
        target.id,
        { to: 'delivered', version: target.version, note: null },
        newIdempotencyKey(),
      ),
    ),
    'INVALID_TRANSITION',
  );
  const accepted = await api.admin.transition(
    target.id,
    { to: 'accepted', version: target.version, note: null },
    newIdempotencyKey(),
  );
  assert.equal(accepted.status, 'accepted');
  await api.admin.setSoldOut(burger.id, { isSoldOut: true, soldOutUntil: null });
  assert.ok((await api.menu()).items.find((i) => i.id === burger.id)!.isSoldOut);
  assert.equal(
    (await api.admin.salesReport(new Date(0).toISOString(), new Date().toISOString())).orderCount,
    1,
  );

  // Network failure scenario: every 3rd request fails.
  setScenario('network_fail');
  const results = await Promise.all([0, 1, 2, 3, 4, 5].map(() => code(api.storeStatus())));
  assert.equal(results.filter((r) => r === 'NETWORK_ERROR').length, 2);
  setScenario('happy');

  console.log('mocks check: all assertions passed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => server.close());
