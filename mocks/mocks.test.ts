/**
 * Mock backend behaviour (§4.1–4.3, §6, §7), exercised through the real API client and the real
 * MSW handlers in Node. Time-based steps are fast-forwarded instead of waited for.
 */
import assert from 'node:assert/strict';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { setupServer } from 'msw/node';
import { api, ApiError, newIdempotencyKey, setTurnstileProvider } from '@/lib/api';
import type { CartLine, Menu, PlaceOrderRequest } from '@/lib/contracts';
import { db, idempotent, MockError, resetDb, tick } from './db';
import { FILLET_FURY_ID } from './fixtures/menu';
import { adminHandlers } from './handlers/admin';
import { customerHandlers } from './handlers/customer';
import { setScenario, type Scenario } from './scenario';

const server = setupServer(...customerHandlers, ...adminHandlers);
const PHONE = '+923001234567';
const INNER = { lat: 31.27, lng: 72.32 }; // inner zone
const OUTER = { lat: 31.22, lng: 72.25 }; // outer zone only
const FAR = { lat: 31.6, lng: 73.1 };

async function code(p: Promise<unknown>) {
  try {
    await p;
    return 'OK';
  } catch (e) {
    if (e instanceof ApiError || e instanceof MockError) return e.code;
    throw e;
  }
}

let menu: Menu;
const item = (name: string) => menu.items.find((i) => i.name.en === name)!;
const line = (name: string, qty = 1, modifierIds: string[] = [], v = 0): CartLine => ({
  itemId: item(name).id,
  variantId: item(name).variants[v]!.id,
  modifierIds,
  qty,
  note: null,
});

const order = (
  over: Partial<Omit<PlaceOrderRequest, 'turnstileToken'>> = {},
): Omit<PlaceOrderRequest, 'turnstileToken'> => ({
  lines: [line('Crunch Kick', 2)],
  fulfilment: 'pickup',
  addressId: null,
  newAddress: null,
  paymentMethod: 'cod',
  promoCode: null,
  scheduledFor: null,
  customerNote: null,
  tip: 0,
  customer: { name: 'Test', phone: PHONE },
  whatsappOptIn: false,
  confirmDuplicate: false,
  ...over,
});

const quoteReq = (over = {}) => ({
  lines: [line('Crunch Kick', 2, ['mod_dip_ranch'])],
  fulfilment: 'delivery' as const,
  addressId: null,
  location: INNER,
  promoCode: null,
  scheduledFor: null,
  tip: 0,
  phone: null,
  ...over,
});

async function verify(phone = PHONE) {
  await api.requestOtp({ phone, channel: 'sms' });
  await api.verifyOtp({ phone, code: '123456' });
}

/** Fast-forward every auto-advancing order by `steps` timer steps. */
function fastForward(steps: number) {
  for (let i = 0; i < steps; i++) {
    for (const r of db.orders) r.lastChangeAt -= 60_000;
    tick();
  }
}

beforeAll(async () => {
  server.listen({ onUnhandledFrame: 'error' });
  setTurnstileProvider(async () => 'test-turnstile-token');
  resetDb();
  menu = await api.menu();
});
afterAll(() => server.close());
beforeEach(() => {
  resetDb();
  setScenario('happy');
});
const scenario = (s: Scenario) => setScenario(s);

describe('menu fixture', () => {
  it('has the printed menu order, Loaded Fries inside Fries, and no invented copy', () => {
    assert.deepEqual(
      menu.categories.map((c) => c.slug),
      [
        'fries',
        'loaded-fries',
        'sandwiches',
        'burgers',
        'wings',
        'wraps',
        'pastas',
        'pizzas',
        'dips',
        'sides',
      ],
    );
    assert.equal(menu.categories[1]!.parentId, 'cat_fries');
    assert.equal(menu.items.length, 5 + 5 + 5 + 9 + 5 + 4 + 3 + 9 + 6 + 3);
    assert.ok(menu.items.every((i) => i.description === null && i.name.ur === null));
    assert.equal(menu.combos.length, 0);
  });

  it('models variants with one default and full prices', () => {
    assert.deepEqual(
      item('Street Fajita').variants.map((v) => `${v.name}:${v.price}`),
      [
        'S · Option A:595',
        'S · Option B:695',
        'M:1095',
        'L · Option A:1695',
        'L · Option B:1750',
        'XL:2295',
      ],
    );
    assert.ok(menu.items.every((i) => i.variants.filter((v) => v.isDefault).length === 1));
    assert.deepEqual(
      item('Garlic Bread').variants.map((v) => v.option),
      ['classic', 'cheese'],
    );
  });

  it('attaches "Add a dip" (0–3) everywhere except Dips, and "Style" to Honey Glazed Wings', () => {
    const dips = menu.modifierGroups.find((g) => g.id === 'grp_dips')!;
    assert.equal(dips.maxSelect, 3);
    assert.ok(item('Mac and Cheese').modifierGroupIds.includes('grp_dips'));
    assert.ok(!item('Ranch').modifierGroupIds.includes('grp_dips'));
    const style = menu.modifierGroups.find((g) => g.name.en === 'Style')!;
    assert.deepEqual([style.minSelect, style.maxSelect], [1, 1]);
    assert.ok(item('Honey Glazed Wings').modifierGroupIds.includes(style.id));
  });
});

describe('quote', () => {
  it('prices on the server with the zone fee and the total formula', async () => {
    const q = await api.cartQuote(quoteReq());
    assert.equal(q.subtotal, (450 + 95) * 2);
    assert.equal(q.zone?.id, 'zone_inner');
    assert.equal(q.total, q.subtotal + q.deliveryFee + q.tax + q.tip - q.discount);
  });

  it('uses the larger of store and zone minimum, with shortBy', async () => {
    const e = await api
      .cartQuote(quoteReq({ lines: [line('Masala Fries', 3)], location: OUTER }))
      .catch((x: ApiError) => x);
    assert.ok(e instanceof ApiError && e.code === 'BELOW_MIN_ORDER');
    assert.deepEqual(e.details, { minOrder: 1000, shortBy: 250 });
  });

  it('applies percent / flat / free_delivery promos, one at a time', async () => {
    const base = await api.cartQuote(quoteReq());
    assert.equal(
      (await api.cartQuote(quoteReq({ promoCode: 'MOCK10' }))).discount,
      Math.floor(base.subtotal / 10),
    );
    assert.equal((await api.cartQuote(quoteReq({ promoCode: 'MOCKFLAT' }))).discount, 100);
    assert.equal(
      (await api.cartQuote(quoteReq({ promoCode: 'MOCKSHIP' }))).discount,
      base.deliveryFee,
    );
    assert.equal(await code(api.cartQuote(quoteReq({ promoCode: 'MOCKOLD' }))), 'PROMO_EXPIRED');
    assert.equal(await code(api.cartQuote(quoteReq({ promoCode: 'NOPE' }))), 'PROMO_INVALID');
  });

  it('flags requiresOtp for an unverified phone and reports COD eligibility', async () => {
    const q = await api.cartQuote(quoteReq({ phone: PHONE }));
    assert.equal(q.requiresOtp, true);
    assert.deepEqual(q.cod, { allowed: true, reason: null });
    await verify();
    assert.equal((await api.cartQuote(quoteReq({ phone: PHONE }))).requiresOtp, false);
  });

  it('refuses pins outside every zone', async () => {
    assert.equal(await code(api.cartQuote(quoteReq({ location: FAR }))), 'OUTSIDE_ZONE');
  });
});

describe('idempotency (§4.1)', () => {
  it('replays the stored response for the same key + body', async () => {
    let runs = 0;
    const run = async () => ({ status: 201, body: { n: ++runs } });
    const a = await idempotent('k1', { x: 1, turnstileToken: 'a' }, run);
    const b = await idempotent('k1', { x: 1, turnstileToken: 'b' }, run); // token is not hashed
    assert.deepEqual([a.body, b.body, runs], [{ n: 1 }, { n: 1 }, 1]);
  });

  it('returns IDEMPOTENCY_CONFLICT for the same key with a different body', async () => {
    await idempotent('k2', { x: 1 }, async () => ({ status: 201, body: {} }));
    assert.equal(
      await code(idempotent('k2', { x: 2 }, async () => ({ status: 201, body: {} }))),
      'IDEMPOTENCY_CONFLICT',
    );
  });

  it('returns IN_PROGRESS while the first request is still running', async () => {
    let release!: () => void;
    const first = idempotent(
      'k3',
      { x: 1 },
      () => new Promise((r) => (release = () => r({ status: 201, body: {} }))),
    );
    assert.equal(
      await code(idempotent('k3', { x: 1 }, async () => ({ status: 201, body: {} }))),
      'IN_PROGRESS',
    );
    release();
    await first;
  });

  it('lets a failed request be retried with the same key', async () => {
    assert.equal(
      await code(
        idempotent('k4', {}, async () => {
          throw new MockError('STORE_CLOSED');
        }),
      ),
      'STORE_CLOSED',
    );
    assert.equal(await code(idempotent('k4', {}, async () => ({ status: 201, body: {} }))), 'OK');
  });

  it('double tap creates one order: the client retries IN_PROGRESS and gets the replay', async () => {
    await verify();
    scenario('double_tap');
    const key = newIdempotencyKey();
    const [a, b] = await Promise.all([api.placeOrder(order(), key), api.placeOrder(order(), key)]);
    assert.equal(a.order.publicToken, b.order.publicToken);
    assert.equal(db.orders.length, 1);
    assert.ok(db.stats.inProgress >= 1 && db.stats.replays >= 1);
  });

  it('in_progress scenario: the client waits Retry-After and succeeds with the same key', async () => {
    await verify();
    scenario('in_progress');
    const res = await api.placeOrder(order(), newIdempotencyKey());
    assert.equal(res.order.status, 'placed');
    assert.equal(db.stats.inProgress, 2);
  });
});

describe('order rules', () => {
  it('requires OTP for the first COD order from an unverified phone', async () => {
    const e = await api.placeOrder(order(), newIdempotencyKey()).catch((x: ApiError) => x);
    assert.ok(e instanceof ApiError && e.code === 'UNAUTHENTICATED');
    assert.deepEqual(e.details, { reason: 'otp_required' });
  });

  it('blocks COD over the cap, for blocked numbers and for pre-orders > 2 h out', async () => {
    await verify();
    db.settings.maxCodValue = 500;
    assert.equal(await code(api.placeOrder(order(), newIdempotencyKey())), 'COD_NOT_ALLOWED');
    db.settings.maxCodValue = 10000;
    const later = new Date(Date.now() + 5 * 3_600_000).toISOString();
    const e = await api
      .placeOrder(order({ scheduledFor: later }), newIdempotencyKey())
      .catch((x: ApiError) => x);
    assert.ok(e instanceof ApiError && e.details?.reason === 'preorder_too_far');
    db.customers[0]!.isBlocked = true;
    assert.equal(await code(api.placeOrder(order(), newIdempotencyKey())), 'COD_NOT_ALLOWED');
  });

  it('same cart from the same phone within 3 minutes asks "place again?"', async () => {
    await verify();
    await api.placeOrder(order(), newIdempotencyKey());
    assert.equal(
      await code(api.placeOrder(order(), newIdempotencyKey())),
      'DUPLICATE_ORDER_SUSPECTED',
    );
    assert.equal(
      await code(api.placeOrder(order({ confirmDuplicate: true }), newIdempotencyKey())),
      'OK',
    );
  });

  it('saves a new delivery address and snapshots it on the order', async () => {
    await verify();
    const newAddress = {
      label: 'Home',
      line1: 'House 1, Street 2',
      area: 'Paradise City',
      landmark: 'Near the mosque',
      location: INNER,
    };
    const { order: o } = await api.placeOrder(
      order({ fulfilment: 'delivery', newAddress }),
      newIdempotencyKey(),
    );
    assert.equal(o.address?.landmark, 'Near the mosque');
    assert.equal((await api.addresses()).length, 1);
  });

  it('moves through the state machine on the timer, then refuses cancel', async () => {
    await verify();
    const { order: o } = await api.placeOrder(order({ fulfilment: 'pickup' }), newIdempotencyKey());
    assert.equal(o.canCancel, true);
    fastForward(5);
    const t = await api.trackOrder(o.publicToken);
    assert.deepEqual(
      t.events.map((e) => e.status),
      ['placed', 'accepted', 'preparing', 'ready', 'picked_up'],
    );
    assert.equal(
      await code(api.cancelOrder(o.publicToken, { reason: null })),
      'TOO_LATE_TO_CANCEL',
    );
  });

  it('cancels only while placed', async () => {
    await verify();
    const { order: o } = await api.placeOrder(order(), newIdempotencyKey());
    assert.equal(
      (await api.cancelOrder(o.publicToken, { reason: 'Changed my mind' })).status,
      'cancelled',
    );
  });
});

describe('scenarios', () => {
  it('store_closed / paused refuse ASAP orders', async () => {
    scenario('store_closed');
    assert.equal((await api.storeStatus()).isAcceptingOrders, false);
    assert.equal(await code(api.cartQuote(quoteReq())), 'STORE_CLOSED');
    scenario('paused');
    const s = await api.storeStatus();
    assert.equal(s.state, 'paused');
    assert.ok(s.pauseReason);
  });

  it('item_sold_out_mid_checkout: first quote OK, then ITEM_SOLD_OUT with the item id', async () => {
    await verify();
    scenario('item_sold_out_mid_checkout');
    const lines = [line('Fillet Fury', 2)];
    await api.cartQuote(quoteReq({ lines }));
    const e = await api.placeOrder(order({ lines }), newIdempotencyKey()).catch((x: ApiError) => x);
    assert.ok(
      e instanceof ApiError && e.code === 'ITEM_SOLD_OUT' && e.details?.itemId === FILLET_FURY_ID,
    );
  });

  it('below_min, outside_zone, preorder_invalid, otp_rate_limited, too_late_to_cancel', async () => {
    scenario('below_min');
    assert.equal(await code(api.cartQuote(quoteReq())), 'BELOW_MIN_ORDER');
    scenario('outside_zone');
    assert.equal(await code(api.deliveryQuote({ location: INNER })), 'OUTSIDE_ZONE');
    scenario('preorder_invalid');
    assert.equal(
      await code(
        api.cartQuote(quoteReq({ scheduledFor: new Date(Date.now() + 3_600_000).toISOString() })),
      ),
      'PREORDER_INVALID',
    );
    scenario('otp_rate_limited');
    assert.equal(await code(api.requestOtp({ phone: PHONE, channel: 'sms' })), 'RATE_LIMITED');
    scenario('happy');
    await verify();
    const { order: o } = await api.placeOrder(order(), newIdempotencyKey());
    scenario('too_late_to_cancel');
    assert.equal(
      await code(api.cancelOrder(o.publicToken, { reason: null })),
      'TOO_LATE_TO_CANCEL',
    );
  });

  it('OTP requests are rate limited to 3 per phone per 10 minutes', async () => {
    for (let i = 0; i < 3; i++) await api.requestOtp({ phone: PHONE, channel: 'sms' });
    assert.equal(await code(api.requestOtp({ phone: PHONE, channel: 'sms' })), 'RATE_LIMITED');
  });

  it('online payment: pending_payment → placed on success, expired on timeout, late success re-places', async () => {
    await verify();
    for (const [s, expected] of [
      ['payment_success', 'placed'],
      ['payment_fail', 'payment_failed'],
      ['payment_expired', 'expired'],
      ['late_payment_success', 'placed'],
    ] as const) {
      scenario(s);
      const { order: o } = await api.placeOrder(
        order({ paymentMethod: 'jazzcash', confirmDuplicate: true }),
        newIdempotencyKey(),
      );
      assert.equal(o.status, 'pending_payment');
      await api.initiatePayment('jazzcash', { orderToken: o.publicToken }, newIdempotencyKey());
      const rec = db.orders.find((r) => r.order.publicToken === o.publicToken)!;
      rec.payment!.startedAt -= 11_000;
      rec.payment!.expiresAt -= 11_000;
      tick();
      if (s === 'late_payment_success') {
        rec.payment!.startedAt -= 10_000;
        tick();
      }
      assert.equal((await api.trackOrder(o.publicToken)).status, expected, s);
    }
  });

  it('order_rejected / auto_rejected reject unaccepted orders', async () => {
    await verify();
    scenario('auto_rejected');
    const { order: o } = await api.placeOrder(order(), newIdempotencyKey());
    db.orders[0]!.rejectAt = Date.now() - 1;
    tick();
    const t = await api.trackOrder(o.publicToken);
    assert.equal(t.status, 'rejected');
    assert.match(t.events.at(-1)!.note ?? '', /8 minutes/);
  });

  it('deals_demo serves DEMO deals made of real items; empty otherwise', async () => {
    assert.deepEqual(await api.dealsEvents(), { deals: [], events: [] });
    scenario('deals_demo');
    const de = await api.dealsEvents();
    assert.equal(de.deals.length, 2);
    assert.equal(de.events.length, 2);
    assert.ok([...de.deals, ...de.events].every((x) => x.title.en.startsWith('DEMO')));
    const ids = new Set(menu.items.flatMap((i) => i.variants.map((v) => `${i.id}/${v.id}`)));
    assert.ok(de.deals.every((d) => d.items.every((l) => ids.has(`${l.itemId}/${l.variantId}`))));
  });

  it('bookings: requested → auto-confirmed; event_full refuses event bookings', async () => {
    scenario('booking_confirmed');
    const date = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
    const b = await api.createBooking(
      {
        type: 'table',
        eventId: null,
        date,
        time: '20:00',
        guests: 4,
        name: 'Test',
        phone: PHONE,
        note: null,
      },
      newIdempotencyKey(),
    );
    assert.equal(b.status, 'requested');
    db.bookings[0]!.resolveAt = Date.now() - 1;
    tick();
    assert.equal((await api.booking(b.publicToken)).status, 'confirmed');
    assert.ok(db.outbox.some((o) => o.topic === 'whatsapp.booking_confirmed'));

    scenario('event_full');
    const ev = (await api.dealsEvents()).events[0]!;
    assert.equal(
      await code(
        api.createBooking(
          {
            type: 'event',
            eventId: ev.id,
            date,
            time: '19:00',
            guests: 2,
            name: 'Test',
            phone: '+923211234567',
            note: null,
          },
          newIdempotencyKey(),
        ),
      ),
      'EVENT_FULL',
    );
  });
});

describe('admin', () => {
  async function login(email: string) {
    const { next } = await api.admin.login({ email, password: 'barraf123' });
    if (next === 'enrol_2fa') await api.admin.enrol2fa();
    if (next !== 'ok') await api.admin.verify2fa({ code: '123456' });
  }

  it('requires 2FA for owner/manager and checks roles', async () => {
    assert.equal(
      (await api.admin.login({ email: 'owner@barrafpaani.test', password: 'barraf123' })).next,
      'verify_2fa',
    );
    assert.equal(await code(api.admin.orders()), 'UNAUTHENTICATED');
    assert.equal(
      (await api.admin.login({ email: 'manager@barrafpaani.test', password: 'barraf123' })).next,
      'enrol_2fa',
    );
    await login('kitchen@barrafpaani.test');
    assert.equal(await code(api.admin.settings()), 'OK'); // every screen reads the timings
    assert.equal(await code(api.admin.updateSettings({ minOrderValue: 1 })), 'FORBIDDEN');
    assert.equal(await code(api.admin.promos()), 'FORBIDDEN');
    await login('manager@barrafpaani.test');
    assert.equal(await code(api.admin.updateSettings({ minOrderValue: 1 })), 'FORBIDDEN'); // owner only
  });

  it('manual WhatsApp order goes through the same rules and returns a tracking token', async () => {
    await login('cashier@barrafpaani.test');
    const res = await api.admin.manualOrder(
      {
        source: 'whatsapp',
        customer: { name: 'Ali', phone: '+923331234567' },
        lines: [line('Beef Smash')],
        fulfilment: 'pickup',
        addressId: null,
        newAddress: null,
        paymentMethod: 'cod',
        promoCode: null,
        customerNote: null,
        scheduledFor: null,
      },
      newIdempotencyKey(),
    );
    assert.equal(res.order.source, 'whatsapp');
    assert.equal(res.order.total, 800);
    assert.equal(res.trackingPath, `/track/${res.publicToken}`);
    assert.equal((await api.trackOrder(res.publicToken)).number, res.order.number);
  });

  it('transitions use optimistic locking; version_conflict serves one 409', async () => {
    await verify();
    await api.placeOrder(order(), newIdempotencyKey());
    await login('owner@barrafpaani.test');
    scenario('version_conflict');
    const [o] = await api.admin.orders({ status: ['placed'] });
    assert.equal(
      await code(
        api.admin.transition(
          o!.id,
          { to: 'accepted', version: o!.version, note: null },
          newIdempotencyKey(),
        ),
      ),
      'VERSION_CONFLICT',
    );
    const fresh = await api.admin.order(o!.id);
    assert.equal(
      await code(
        api.admin.transition(
          o!.id,
          { to: 'delivered', version: fresh.version, note: null },
          newIdempotencyKey(),
        ),
      ),
      'INVALID_TRANSITION',
    );
    assert.equal(
      (
        await api.admin.transition(
          o!.id,
          { to: 'accepted', version: fresh.version, note: null },
          newIdempotencyKey(),
        )
      ).status,
      'accepted',
    );
  });

  it('rider picks up, delivers with exact cash, and the cash shows in settlement', async () => {
    await verify();
    const { order: o } = await api.placeOrder(
      order({
        fulfilment: 'delivery',
        newAddress: {
          label: 'Home',
          line1: 'House 9',
          area: 'Paradise City',
          landmark: null,
          location: INNER,
        },
      }),
      newIdempotencyKey(),
    );
    await login('owner@barrafpaani.test');
    const id = db.orders[0]!.order.id;
    await api.admin.assignRider(id, { riderId: 'staff_rider' });
    const rec = db.orders[0]!;
    rec.order.status = 'ready';
    await login('rider@barrafpaani.test');
    await api.rider.pickedUp(id, newIdempotencyKey());
    const [a] = await api.rider.assignments();
    assert.ok(
      a!.order.customer.phone.startsWith('+92'),
      'rider sees the full phone on the active order',
    );
    assert.equal(
      await code(api.rider.delivered(id, { cashCollected: 1 }, newIdempotencyKey())),
      'VALIDATION_FAILED',
    );
    await api.rider.delivered(id, { cashCollected: o.total }, newIdempotencyKey());
    await login('owner@barrafpaani.test');
    const [s] = await api.admin.settlement();
    assert.equal(s!.openCash, o.total);
    assert.equal((await api.admin.settleRider('staff_rider')).openCash, 0);
  });

  it('mixed_sources injects website / WhatsApp / phone orders', async () => {
    scenario('mixed_sources');
    for (let i = 0; i < 3; i++) {
      db.lastInjectedAt = 0;
      tick();
    }
    assert.deepEqual(
      new Set(db.orders.map((o) => o.order.source)),
      new Set(['whatsapp', 'phone', 'website']),
    );
  });
});

describe('staff apps (prompt 4)', () => {
  async function login(email: string) {
    const { next } = await api.admin.login({ email, password: 'barraf123' });
    if (next === 'enrol_2fa') await api.admin.enrol2fa();
    if (next !== 'ok') await api.admin.verify2fa({ code: '123456' });
  }
  const placeAsCustomer = async (over = {}) => {
    await verify();
    return (await api.placeOrder(order(over), newIdempotencyKey())).order;
  };

  it('front of house sees full phones; the kitchen sees them masked (§7)', async () => {
    await placeAsCustomer();
    await login('cashier@barrafpaani.test');
    assert.equal((await api.admin.orders())[0]!.customer.phone, PHONE);
    await login('kitchen@barrafpaani.test');
    assert.match((await api.admin.orders())[0]!.customer.phone, /•/);
  });

  it('staff-driven: the timer stops, auto-reject fires at 8 min, manager alert at 6', async () => {
    await placeAsCustomer();
    await login('cashier@barrafpaani.test');
    const rec = db.orders[0]!;
    fastForward(3);
    assert.equal(rec.order.status, 'placed', 'no auto-accept while staff are logged in');
    rec.order.createdAt = new Date(Date.now() - 6.5 * 60_000).toISOString();
    tick();
    assert.ok(db.outbox.some((o) => o.topic === 'whatsapp.manager_alert'));
    assert.equal(rec.order.status, 'placed');
    rec.order.createdAt = new Date(Date.now() - 8 * 60_000).toISOString();
    tick();
    assert.equal(rec.order.status, 'rejected');
    assert.equal(rec.order.events.at(-1)!.actorType, 'system');
  });

  it('accept with a prep time sets the ETA; reject needs a reason; roles are enforced', async () => {
    await placeAsCustomer();
    await login('kitchen@barrafpaani.test');
    const [o] = await api.admin.orders({ status: ['placed'] });
    assert.equal(
      await code(
        api.admin.transition(
          o!.id,
          { to: 'rejected', version: o!.version, note: null },
          newIdempotencyKey(),
        ),
      ),
      'VALIDATION_FAILED',
    );
    const before = Date.now();
    const acc = await api.admin.transition(
      o!.id,
      { to: 'accepted', version: o!.version, note: null, prepMinutes: 10 },
      newIdempotencyKey(),
    );
    const eta = new Date(acc.estimatedReadyAt!).getTime() - before;
    assert.ok(eta >= 9.9 * 60_000 && eta <= 10.1 * 60_000);
    // Kitchen can't cancel; cancelling from accepted is manager-only.
    assert.equal(
      await code(
        api.admin.transition(
          o!.id,
          { to: 'cancelled', version: acc.version, note: 'x' },
          newIdempotencyKey(),
        ),
      ),
      'FORBIDDEN',
    );
    await login('cashier@barrafpaani.test');
    assert.equal(
      await code(
        api.admin.transition(
          o!.id,
          { to: 'cancelled', version: acc.version, note: 'x' },
          newIdempotencyKey(),
        ),
      ),
      'FORBIDDEN',
    );
    // Same status again is a harmless no-op.
    assert.equal(
      (
        await api.admin.transition(
          o!.id,
          { to: 'accepted', version: acc.version, note: null },
          newIdempotencyKey(),
        )
      ).version,
      acc.version,
    );
  });

  it('customer lookup + manual order + search by BP number or phone', async () => {
    await placeAsCustomer();
    await login('cashier@barrafpaani.test');
    const found = await api.admin.customerLookup(PHONE);
    assert.equal(found.customer.phone, PHONE);
    assert.equal(found.recentOrders.length, 1);
    assert.equal(await code(api.admin.customerLookup('+923339999999')), 'NOT_FOUND');
    const number = found.recentOrders[0]!.number;
    assert.equal((await api.admin.orders({ q: number.slice(3) }))[0]!.number, number);
    assert.equal((await api.admin.orders({ q: '0300 1234567' }))[0]!.number, number);
    assert.equal((await api.admin.orders({ q: '9999' })).length, 0);
  });

  it('call-back flag on an order far above the usual size', async () => {
    await placeAsCustomer(); // 2 × Crunch Kick
    await api.placeOrder(order({ lines: [line('Crunch Kick', 12)] }), newIdempotencyKey());
    await login('owner@barrafpaani.test');
    const [big, first] = await api.admin.orders();
    assert.equal(big!.callBack, true);
    assert.equal(first!.callBack, false);
  });

  it('late payment with sold-out items lands in the refunds queue', async () => {
    scenario('late_payment_success');
    const o = await placeAsCustomer({ paymentMethod: 'jazzcash' });
    await api.initiatePayment('jazzcash', { orderToken: o.publicToken }, newIdempotencyKey());
    const rec = db.orders[0]!;
    rec.payment!.expiresAt = Date.now() - 1;
    tick();
    assert.equal(rec.order.status, 'expired');
    db.menu.items.find((i) => i.id === rec.order.lines[0]!.itemId)!.isSoldOut = true;
    rec.payment!.startedAt -= 60_000;
    tick();
    await login('owner@barrafpaani.test');
    const [r] = await api.admin.refunds();
    assert.equal(r!.orderToken, o.publicToken);
    assert.equal(r!.status, 'requested');
  });

  it('admin_demo seeds history; the report has every breakdown the dashboard draws', async () => {
    scenario('admin_demo');
    await login('owner@barrafpaani.test');
    const from = new Date(Date.now() - 15 * 86_400_000).toISOString();
    const r = await api.admin.salesReport(from, new Date().toISOString());
    assert.ok(r.orderCount > 40);
    assert.ok(r.allOrders >= r.orderCount + r.cancelledCount + r.rejectedCount);
    assert.ok(r.autoRejectedCount >= 1);
    assert.equal(r.byHour.length, 24);
    assert.ok(r.bySource.find((s) => s.source === 'whatsapp')!.count > 0);
    assert.ok(r.bySourceByDay.length > 0);
    assert.equal(
      r.byFulfilment.reduce((s, f) => s + f.count, 0),
      r.orderCount,
    );
    assert.ok((await api.admin.bookings(['requested'])).length >= 2);
    assert.ok((await api.admin.settlement())[0]!.openCash > 0);
    // Seeding twice is a no-op.
    const n = db.orders.length;
    await login('owner@barrafpaani.test');
    assert.equal(db.orders.length, n);
  });

  it('rider toggle, COD toggle, modifier group limits', async () => {
    await placeAsCustomer();
    await login('owner@barrafpaani.test');
    assert.equal((await api.admin.updateRider('staff_rider', { isActive: false })).isActive, false);
    const [c] = await api.admin.customers();
    assert.equal((await api.admin.setCustomerCod(c!.id, { codAllowed: false })).codAllowed, false);
    const g = db.menu.modifierGroups[0]!;
    assert.equal(
      await code(api.admin.updateModifierGroup(g.id, { minSelect: 3, maxSelect: 1 })),
      'VALIDATION_FAILED',
    );
    assert.equal(
      (await api.admin.updateModifierGroup(g.id, { minSelect: 0, maxSelect: 2 })).maxSelect,
      2,
    );
  });
});

describe('accounts (prompt 3)', () => {
  it('orders/mine is paginated, newest first (account_demo seeds 12)', async () => {
    scenario('account_demo');
    await verify();
    const p1 = await api.myOrders();
    assert.equal(p1.orders.length, 10);
    assert.equal(p1.nextCursor, '10');
    const p2 = await api.myOrders(p1.nextCursor);
    assert.equal(p2.orders.length, 2);
    assert.equal(p2.nextCursor, null);
    const all = [...p1.orders, ...p2.orders].map((o) => o.createdAt);
    assert.deepEqual(all, [...all].sort().reverse());
    assert.ok((await api.menu()).items.find((i) => i.id === FILLET_FURY_ID)!.isSoldOut);
  });

  it('WhatsApp opt-in records time and source; opting out clears them', async () => {
    await verify();
    const off = await api.me();
    assert.equal(off.whatsappOptIn, false); // default off (§2.4)
    assert.equal(
      await code(api.updateMe({ whatsappOptIn: true } as never)),
      'VALIDATION_FAILED', // source is required when opting in
    );
    const on = await api.updateMe({ whatsappOptIn: true, whatsappOptInSource: 'account' });
    assert.ok(on.whatsappOptInAt);
    assert.equal(on.whatsappOptInSource, 'account');
    const out = await api.updateMe({ whatsappOptIn: false });
    assert.equal(out.whatsappOptInAt, null);
  });

  it('addresses: outside-zone pins still save; exactly one default', async () => {
    await verify();
    const base = { line1: 'House 1', area: 'A', landmark: null };
    const a = await api.addAddress({ ...base, label: 'home', location: INNER });
    const b = await api.addAddress({ ...base, label: 'other', location: FAR }); // pickup reference
    assert.equal(a.isDefault, true);
    assert.equal(b.isDefault, false);
    assert.equal(await code(api.deliveryQuote({ location: FAR })), 'OUTSIDE_ZONE');
    await api.updateAddress(b.id, { isDefault: true });
    let list = await api.addresses();
    assert.deepEqual(
      list.filter((x) => x.isDefault).map((x) => x.id),
      [b.id],
    );
    await api.deleteAddress(b.id); // deleting the default promotes another
    list = await api.addresses();
    assert.deepEqual(
      list.map((x) => [x.id, x.isDefault]),
      [[a.id, true]],
    );
  });

  it('contact form needs Turnstile and is rate-limited per phone', async () => {
    const msg = {
      name: 'A',
      phone: PHONE,
      topic: 'data_deletion' as const,
      message: 'Please delete my data.',
    };
    assert.match((await api.contact(msg)).reference, /^MSG-/);
    await api.contact(msg);
    await api.contact(msg);
    assert.equal(await code(api.contact(msg)), 'RATE_LIMITED');
  });

  it('store status lists upcoming holidays', async () => {
    const s = await api.storeStatus();
    assert.ok(s.holidays.every((h) => h.date >= new Date().toISOString().slice(0, 10)));
  });
});
