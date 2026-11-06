import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { highlight, matches, normalizeQuery } from './search';

describe('menu search', () => {
  it('ignores case, accents and extra spaces', () => {
    const q = normalizeQuery('  CARAMÉLISED   onion ');
    assert.equal(q, 'caramelised onion');
    assert.equal(matches(q, 'Caramelised Onion and Beef'), true);
    assert.equal(matches(normalizeQuery('crème'), 'Creme Brulee'), true);
    assert.equal(matches(normalizeQuery('wings'), 'Fillet Fury', null), false);
    assert.equal(matches('', 'anything'), true);
  });

  it('marks every hit, mapped back to the original text', () => {
    assert.deepEqual(
      highlight('Cheese Meltdown', normalizeQuery('e')).filter((s) => s.match).length,
      4,
    );
    assert.deepEqual(highlight('Crème Cheese', 'creme'), [
      { text: 'Crème', match: true },
      { text: ' Cheese', match: false },
    ]);
    // Decomposed input (e + combining acute) keeps the mark inside the highlight.
    assert.deepEqual(highlight('Créme', 'creme'), [{ text: 'Créme', match: true }]);
    assert.deepEqual(highlight('Hot Wings', ''), [{ text: 'Hot Wings', match: false }]);
  });
});
