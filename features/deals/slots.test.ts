import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { bookingSlots } from './slots';

const hours = [
  { weekday: 5, opens: '12:00', closes: '02:00' }, // Friday, past midnight
  { weekday: 1, opens: '12:00', closes: '23:30' },
];

describe('bookingSlots', () => {
  it('runs past midnight on the opening day and stops 30 min before close', () => {
    const s = bookingSlots(hours, '2026-11-06', 0); // a Friday
    assert.equal(s[0], '12:00');
    assert.equal(s.at(-1), '01:30');
    assert.ok(s.includes('00:00'));
  });
  it('drops past slots and closed days', () => {
    const at = Date.parse('2026-11-09T18:00:00+05:00'); // Monday 18:00
    assert.equal(bookingSlots(hours, '2026-11-09', at)[0], '18:30');
    assert.deepEqual(bookingSlots(hours, '2026-11-07', 0), []); // Saturday: no hours
  });
});
