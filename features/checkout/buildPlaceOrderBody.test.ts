import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PlaceOrderRequest } from '@/lib/contracts';
import { buildPlaceOrderBody, type CheckoutDraft } from './buildPlaceOrderBody';

// A cart entry as the store holds it: intent + a display snapshot with an estimated price.
const cartEntry = {
  key: 'itm_1|var_1||',
  itemId: 'itm_1',
  variantId: 'var_1',
  modifierIds: ['mod_dip'],
  qty: 2,
  note: null,
  snapshot: { name: { en: 'Fillet Fury', ur: null }, size: null, option: null, unitPrice: 695 },
};

const draft = (over: Partial<CheckoutDraft> = {}): CheckoutDraft => ({
  lines: [cartEntry],
  fulfilment: 'delivery',
  addressId: null,
  newAddress: {
    location: { lat: 31.27, lng: 72.32 },
    line1: ' House 12 ',
    area: 'Block A',
    landmark: '',
  },
  paymentMethod: 'cod',
  promoCode: ' mock10 ',
  scheduledFor: null,
  note: '  ',
  name: ' Ali ',
  phone: '+923001234567',
  ...over,
});

const MONEY_KEYS = /price|total|subtotal|fee|discount|tax|amount|status|snapshot|key$/i;
function keysDeep(v: unknown, out: string[] = []): string[] {
  if (Array.isArray(v)) v.forEach((x) => keysDeep(x, out));
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) {
      out.push(k);
      keysDeep(x, out);
    }
  return out;
}

describe('buildPlaceOrderBody', () => {
  it('sends intent only: no prices, totals, fees, statuses or cart snapshots', () => {
    const body = buildPlaceOrderBody(draft());
    assert.deepEqual(
      keysDeep(body).filter((k) => MONEY_KEYS.test(k)),
      [],
    );
    assert.deepEqual(body.lines, [
      { itemId: 'itm_1', variantId: 'var_1', modifierIds: ['mod_dip'], qty: 2, note: null },
    ]);
    assert.equal(body.tip, 0);
  });

  it('defaults whatsappOptIn and confirmDuplicate to false', () => {
    const body = buildPlaceOrderBody(draft());
    assert.equal(body.whatsappOptIn, false);
    assert.equal(body.confirmDuplicate, false);
    assert.equal(buildPlaceOrderBody(draft({ whatsappOptIn: true })).whatsappOptIn, true);
  });

  it('matches the contract (with the turnstile token lib/api adds)', () => {
    const parsed = PlaceOrderRequest.safeParse({
      ...buildPlaceOrderBody(draft()),
      turnstileToken: 't',
    });
    assert.ok(parsed.success, parsed.error?.message ?? '');
  });

  it('normalises text: trimmed name/address, empty landmark and note → null, promo upper-cased', () => {
    const body = buildPlaceOrderBody(draft());
    assert.equal(body.customer.name, 'Ali');
    assert.equal(body.newAddress?.line1, 'House 12');
    assert.equal(body.newAddress?.landmark, null);
    assert.equal(body.customerNote, null);
    assert.equal(body.promoCode, 'MOCK10');
    assert.equal(buildPlaceOrderBody(draft({ promoCode: '  ' })).promoCode, null);
  });

  it('a saved address wins over the new-address form; pickup sends no address at all', () => {
    const saved = buildPlaceOrderBody(draft({ addressId: 'adr_1' }));
    assert.equal(saved.addressId, 'adr_1');
    assert.equal(saved.newAddress, null);
    const pickup = buildPlaceOrderBody(draft({ fulfilment: 'pickup', addressId: 'adr_1' }));
    assert.equal(pickup.addressId, null);
    assert.equal(pickup.newAddress, null);
  });
});
