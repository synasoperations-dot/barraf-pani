import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import type { Order, QuotedLine } from '@/lib/contracts';
import { FILLET_FURY_ID, menuFixture } from '@/mocks/fixtures/menu';
import { planReorder } from './reorder';

const line = (itemId: string, variantId: string, unitPrice: number, qty = 1): QuotedLine => ({
  itemId,
  variantId,
  name: { en: itemId, ur: null },
  variantName: 'Standard',
  size: null,
  option: null,
  modifiers: [],
  unitPrice,
  qty,
  lineTotal: unitPrice * qty,
  note: null,
});
const order = (lines: QuotedLine[]) => ({ lines }) as unknown as Order;

describe('planReorder (re-validate against the current menu)', () => {
  it('keeps unchanged lines with no issues', () => {
    const p = planReorder(
      order([line('itm_crunch-kick', 'itm_crunch-kick__std', 450, 2)]),
      menuFixture,
    );
    assert.equal(p.add.length, 1);
    assert.equal(p.add[0]!.qty, 2);
    assert.deepEqual(p.issues, []);
  });

  it('flags a price change but still adds the line at today’s price', () => {
    const p = planReorder(
      order([line('itm_crunch-kick', 'itm_crunch-kick__std', 400)]),
      menuFixture,
    );
    assert.equal(p.add[0]!.snapshot.unitPrice, 450);
    assert.deepEqual(
      p.issues.map((i) => i.kind === 'price_changed' && [i.was, i.now]),
      [[400, 450]],
    );
  });

  it('drops sold-out and inactive / removed items', () => {
    const menu = structuredClone(menuFixture);
    menu.items.find((i) => i.id === FILLET_FURY_ID)!.isSoldOut = true;
    menu.items.find((i) => i.id === 'itm_hot-wings')!.isActive = false;
    const p = planReorder(
      order([
        line(FILLET_FURY_ID, `${FILLET_FURY_ID}__std`, 495),
        line('itm_hot-wings', 'itm_hot-wings__std', 395),
        line('itm_gone', 'itm_gone__std', 300),
      ]),
      menu,
    );
    assert.equal(p.add.length, 0);
    assert.deepEqual(
      p.issues.map((i) => i.kind),
      ['sold_out', 'inactive', 'inactive'],
    );
  });
});
