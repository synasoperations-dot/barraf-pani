import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeTotals, effectiveMinOrder, lineTotal, promoDiscount, shortBy } from './money';

describe('quote math', () => {
  it('total = subtotal + deliveryFee + tax + tip − discount', () => {
    const t = computeTotals({ subtotal: 1090, deliveryFee: 100, discount: 109, tax: 0, tip: 0 });
    assert.equal(t.total, 1081);
    assert.equal(
      computeTotals({ subtotal: 500, deliveryFee: 0, discount: 0, tax: 0, tip: 50 }).total,
      550,
    );
  });

  it('rejects non-integer or negative rupees', () => {
    assert.throws(() =>
      computeTotals({ subtotal: 99.5, deliveryFee: 0, discount: 0, tax: 0, tip: 0 }),
    );
    assert.throws(() =>
      computeTotals({ subtotal: 100, deliveryFee: -1, discount: 0, tax: 0, tip: 0 }),
    );
    assert.throws(() => lineTotal(450, 1.5));
  });

  it('refuses a discount larger than the order', () => {
    assert.throws(() =>
      computeTotals({ subtotal: 100, deliveryFee: 0, discount: 200, tax: 0, tip: 0 }),
    );
  });

  it('line total is unit price × qty', () => {
    assert.equal(lineTotal(545, 2), 1090);
  });

  it('percent discount floors to whole rupees and caps at 100%', () => {
    assert.equal(promoDiscount('percent', 10, 1095, 100), 109);
    assert.equal(promoDiscount('percent', 150, 500, 0), 500);
  });

  it('flat discount never exceeds the subtotal', () => {
    assert.equal(promoDiscount('flat', 100, 1000, 100), 100);
    assert.equal(promoDiscount('flat', 800, 500, 100), 500);
  });

  it('free_delivery discounts exactly the delivery fee', () => {
    assert.equal(promoDiscount('free_delivery', 0, 1000, 200), 200);
    assert.equal(promoDiscount('free_delivery', 0, 1000, 0), 0);
  });

  it('minimum is the larger of store and zone minimum, shortBy never negative', () => {
    assert.equal(effectiveMinOrder(500, 1000), 1000);
    assert.equal(effectiveMinOrder(500, null), 500);
    assert.equal(shortBy(450, 500), 50);
    assert.equal(shortBy(900, 500), 0);
  });
});
