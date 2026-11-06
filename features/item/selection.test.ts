import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import type { Item, ModifierGroup, Variant } from '@/lib/contracts';
import { resolveChoice, sizesOf, togglePick, variantForSize } from './selection';

const mod = (id: string, isAvailable = true) => ({
  id,
  name: { en: id, ur: null },
  price: 95,
  isAvailable,
});
const dips: ModifierGroup = {
  id: 'dips',
  name: { en: 'Add a dip', ur: null },
  minSelect: 0,
  maxSelect: 3,
  modifiers: ['a', 'b', 'c', 'd'].map((id) => mod(id)),
};
const style: ModifierGroup = {
  id: 'style',
  name: { en: 'Style', ur: null },
  minSelect: 1,
  maxSelect: 1,
  modifiers: [mod('regular'), mod('spicy')],
};
const v = (id: string, over: Partial<Variant> = {}): Variant => ({
  id,
  name: id,
  size: null,
  option: null,
  price: 500,
  isDefault: false,
  isAvailable: true,
  ...over,
});
const item = (variants: Variant[], over: Partial<Item> = {}): Item => ({
  id: 'i',
  categoryId: 'c',
  slug: 'i',
  name: { en: 'I', ur: null },
  description: null,
  basePrice: 500,
  imagePath: null,
  isActive: true,
  isSoldOut: false,
  soldOutUntil: null,
  prepMinutes: null,
  sortOrder: 0,
  variants,
  modifierGroupIds: [],
  ...over,
});

describe('item selection', () => {
  it('respects maxSelect and swaps single-select groups', () => {
    let p = {};
    for (const id of ['a', 'b', 'c', 'd']) p = togglePick(p, dips, id);
    assert.deepEqual(p, { dips: ['a', 'b', 'c'] });
    assert.deepEqual(togglePick(p, dips, 'b'), { dips: ['a', 'c'] });
    const s = togglePick(togglePick({}, style, 'regular'), style, 'spicy');
    assert.deepEqual(s, { style: ['spicy'] });
    // 'a' sold out live: it no longer fills a slot, so 'd' fits.
    const live = {
      ...dips,
      modifiers: dips.modifiers.map((m) => ({ ...m, isAvailable: m.id !== 'a' })),
    };
    assert.deepEqual(togglePick(p, live, 'd'), { dips: ['b', 'c', 'd'] });
  });

  it('blocks add until required groups are picked, drops unavailable picks', () => {
    const it0 = item([v('x', { isDefault: true })]);
    assert.equal(resolveChoice(it0, [style], null, {}).canAdd, false);
    assert.equal(resolveChoice(it0, [style], null, { style: ['spicy'] }).canAdd, true);
    const live = { ...style, modifiers: [mod('regular'), mod('spicy', false)] };
    const r = resolveChoice(it0, [live], null, { style: ['spicy'] });
    assert.deepEqual([r.canAdd, r.missing.length], [false, 1]);
  });

  it('falls back to the default variant and flags sold out', () => {
    const it0 = item([v('x', { isDefault: true }), v('y', { isAvailable: false })]);
    assert.equal(resolveChoice(it0, [], 'y', {}).variant.id, 'x');
    assert.equal(resolveChoice({ ...it0, isSoldOut: true }, [], null, {}).canAdd, false);
  });

  it('lists only offered pizza sizes and keeps the option across sizes', () => {
    const S_A = v('S-a', { size: 'S', option: 'optionA' });
    const S_B = v('S-b', { size: 'S', option: 'optionB' });
    const L_A = v('L-a', { size: 'L', option: 'optionA' });
    const L_B = v('L-b', { size: 'L', option: 'optionB' });
    const M = v('M', { size: 'M' });
    const pz = item([S_A, S_B, M, L_A, L_B]);
    assert.deepEqual(
      sizesOf(pz).map((s) => [s.size, s.variants.length]),
      [
        ['S', 2],
        ['M', 1],
        ['L', 2],
      ],
    );
    assert.equal(variantForSize(pz, 'L', S_B)?.id, 'L-b');
    assert.equal(variantForSize(pz, 'M', S_B)?.id, 'M');
    assert.equal(variantForSize(pz, 'XL', S_B), null);
  });
});
