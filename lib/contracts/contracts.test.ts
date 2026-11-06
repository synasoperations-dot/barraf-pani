import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import {
  allowedMoves,
  canRoleMove,
  ManualOrderRequest,
  ModifierGroupPatch,
  OrderStatus,
  PhoneE164,
  PromoInput,
  Quote,
  StaffRole,
  TransitionRequest,
  type Fulfilment,
} from '.';

const quote = {
  lines: [],
  subtotal: 945,
  deliveryFee: 100,
  discount: 50,
  tax: 0,
  tip: 0,
  total: 995,
  minOrder: 500,
  etaMinutes: 55,
  zone: null,
  promo: null,
  requiresOtp: false,
  cod: { allowed: true, reason: null },
  cartHash: 'x',
  quotedAt: '2026-11-06T12:00:00+05:00',
};

describe('Zod contracts', () => {
  it('Quote enforces total = subtotal + fee + tax + tip − discount, whole rupees', () => {
    assert.ok(Quote.safeParse(quote).success);
    assert.ok(!Quote.safeParse({ ...quote, total: 996 }).success);
    assert.ok(!Quote.safeParse({ ...quote, subtotal: 945.5, total: 995.5 }).success);
  });

  it('phones are E.164 Pakistani mobiles', () => {
    assert.ok(PhoneE164.safeParse('+923001234567').success);
    assert.ok(!PhoneE164.safeParse('03001234567').success);
  });

  it('reject and cancel need a reason; prep time is one of 10/15/20/30', () => {
    assert.ok(!TransitionRequest.safeParse({ to: 'rejected', version: 1, note: null }).success);
    assert.ok(TransitionRequest.safeParse({ to: 'rejected', version: 1, note: 'busy' }).success);
    assert.ok(
      TransitionRequest.safeParse({ to: 'accepted', version: 1, note: null, prepMinutes: 15 })
        .success,
    );
    assert.ok(
      !TransitionRequest.safeParse({ to: 'accepted', version: 1, note: null, prepMinutes: 12 })
        .success,
    );
  });

  it('manual orders: never "website"; delivery needs an address', () => {
    const base = {
      source: 'whatsapp',
      customer: { name: 'Ali', phone: '+923001234567' },
      lines: [{ itemId: 'i', variantId: 'v', modifierIds: [], qty: 1, note: null }],
      fulfilment: 'pickup',
      addressId: null,
      newAddress: null,
      paymentMethod: 'cod',
      promoCode: null,
      customerNote: null,
      scheduledFor: null,
    };
    assert.ok(ManualOrderRequest.safeParse(base).success);
    assert.ok(!ManualOrderRequest.safeParse({ ...base, source: 'website' }).success);
    assert.ok(!ManualOrderRequest.safeParse({ ...base, fulfilment: 'delivery' }).success);
  });

  it('modifier groups need min ≤ max; promo codes are uppercase', () => {
    assert.ok(!ModifierGroupPatch.safeParse({ minSelect: 2, maxSelect: 1 }).success);
    const promo = {
      kind: 'flat',
      value: 50,
      minOrder: 0,
      maxUses: null,
      maxUsesPerCustomer: 1,
      validFrom: null,
      validUntil: null,
      isActive: true,
    };
    assert.ok(PromoInput.safeParse({ ...promo, code: 'FRIES10' }).success);
    assert.ok(!PromoInput.safeParse({ ...promo, code: 'fries10' }).success);
  });
});

describe('§4.2 transitions per role (UI gating = mock = backend table)', () => {
  const order = (status: OrderStatus, fulfilment: Fulfilment = 'delivery') => ({
    status,
    fulfilment,
  });

  it('kitchen accepts, rejects, prepares, readies; never cancels or hands over', () => {
    assert.deepEqual(allowedMoves('kitchen', order('placed')), ['accepted', 'rejected']);
    assert.deepEqual(allowedMoves('kitchen', order('accepted')), ['preparing']);
    assert.deepEqual(allowedMoves('kitchen', order('preparing')), ['ready']);
    assert.deepEqual(allowedMoves('kitchen', order('ready')), []);
  });

  it('cancel from accepted is manager-only; cashier can cancel a placed order or a failed delivery', () => {
    for (const r of ['owner', 'manager'] as const)
      assert.ok(canRoleMove(r, order('accepted'), 'cancelled'));
    assert.ok(!canRoleMove('cashier', order('accepted'), 'cancelled'));
    assert.ok(canRoleMove('cashier', order('placed'), 'cancelled'));
    assert.ok(canRoleMove('cashier', order('out_for_delivery'), 'cancelled'));
  });

  it('rider: picked up, delivered, failed delivery only', () => {
    assert.deepEqual(allowedMoves('rider', order('ready')), ['out_for_delivery']);
    assert.deepEqual(allowedMoves('rider', order('out_for_delivery')), ['delivered', 'cancelled']);
    assert.deepEqual(allowedMoves('rider', order('placed')), []);
  });

  it('fulfilment decides the hand-over move', () => {
    assert.deepEqual(allowedMoves('owner', order('ready', 'pickup')), ['picked_up']);
    assert.deepEqual(allowedMoves('owner', order('ready', 'delivery')), ['out_for_delivery']);
  });

  it('nobody moves terminal orders', () => {
    for (const role of StaffRole.options)
      for (const s of [
        'delivered',
        'picked_up',
        'cancelled',
        'rejected',
        'payment_failed',
      ] as const)
        assert.deepEqual(allowedMoves(role, order(s)), [], `${role} ${s}`);
  });
});
