import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'vitest';
import { lineKey, selectCount, selectEstimate, toCartLines, useCart } from './cart';

const line = (over = {}) => ({
  itemId: 'itm_fillet-fury',
  variantId: 'itm_fillet-fury__std',
  modifierIds: [] as string[],
  qty: 1,
  note: null as string | null,
  snapshot: {
    name: { en: 'Fillet Fury', ur: null },
    size: null,
    option: null,
    unitPrice: 495,
    image: null,
  },
  ...over,
});

describe('cart store', () => {
  beforeEach(() => useCart.getState().clear());

  it('merges the same item + variant + add-ons + note, and keeps different ones apart', () => {
    const s = useCart.getState();
    s.add(line());
    s.add(line({ qty: 2 }));
    s.add(line({ modifierIds: ['mod_dip_ranch'] }));
    s.add(line({ note: 'no onions' }));
    const { lines } = useCart.getState();
    assert.equal(lines.length, 3);
    assert.equal(lines[0]!.qty, 3);
  });

  it('modifier order does not matter for the key', () => {
    assert.equal(
      lineKey({ itemId: 'a', variantId: 'v', modifierIds: ['x', 'y'], note: null }),
      lineKey({ itemId: 'a', variantId: 'v', modifierIds: ['y', 'x'], note: null }),
    );
  });

  it('clamps qty to 1–50 and removes lines', () => {
    const s = useCart.getState();
    s.add(line({ qty: 60 }));
    const key = useCart.getState().lines[0]!.key;
    assert.equal(useCart.getState().lines[0]!.qty, 50);
    s.setQty(key, 0);
    assert.equal(useCart.getState().lines[0]!.qty, 1);
    s.remove(key);
    assert.equal(useCart.getState().lines.length, 0);
  });

  it('count, browser estimate, and intent-only lines for the API (no prices)', () => {
    const s = useCart.getState();
    s.add(line({ qty: 2 }));
    s.add(
      line({
        itemId: 'itm_long-fries',
        variantId: 'itm_long-fries__std',
        snapshot: { ...line().snapshot, unitPrice: 450 },
      }),
    );
    const st = useCart.getState();
    assert.equal(selectCount(st), 3);
    assert.equal(selectEstimate(st), 495 * 2 + 450);
    const intent = toCartLines(st.lines);
    assert.deepEqual(Object.keys(intent[0]!).sort(), [
      'itemId',
      'modifierIds',
      'note',
      'qty',
      'variantId',
    ]);
  });

  it('normalises the promo code', () => {
    useCart.getState().setPromoCode('  mock10 ');
    assert.equal(useCart.getState().promoCode, 'MOCK10');
    useCart.getState().setPromoCode('   ');
    assert.equal(useCart.getState().promoCode, null);
  });
});
