import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import type { OpeningHours } from '@/lib/contracts';
import { codAllowedFor, groupHours, isOpenAt, preorderSlots } from './hours';

// Mon–Thu 12:00–23:30; Fri–Sun 12:00–02:00 (past midnight), like the fixture.
const HOURS: OpeningHours[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  opens: '12:00',
  closes: weekday === 0 || weekday >= 5 ? '02:00' : '23:30',
}));

const pkt = (local: string) => Date.parse(`${local}+05:00`);

describe('opening hours', () => {
  it('handles past-midnight windows', () => {
    // 2026-11-06 is a Friday: open 12:00 Fri → 02:00 Sat.
    assert.equal(isOpenAt(HOURS, pkt('2026-11-07T01:30:00')), true);
    assert.equal(isOpenAt(HOURS, pkt('2026-11-07T02:00:00')), false);
    // Thursday closes 23:30 the same day.
    assert.equal(isOpenAt(HOURS, pkt('2026-11-05T23:45:00')), false);
    assert.equal(isOpenAt(HOURS, pkt('2026-11-05T11:59:00')), false);
    assert.equal(isOpenAt(HOURS, pkt('2026-11-05T12:00:00')), true);
  });

  it('builds pre-order slots inside hours, within the max days', () => {
    const now = pkt('2026-11-05T22:00:00'); // Thursday night
    const days = preorderSlots({ hours: HOURS, now, maxDays: 7 });
    const all = days.flatMap((d) => d.slots).map(Date.parse);
    assert.ok(all.length > 0);
    assert.ok(
      all.every((t) => isOpenAt(HOURS, t)),
      'every slot is inside opening hours',
    );
    assert.ok(
      all.every((t) => t >= now + 45 * 60_000),
      'lead time respected',
    );
    assert.ok(
      all.every((t) => t <= now + 7 * 86_400_000),
      'at most 7 days out',
    );
    // Thursday 22:45 and 23:00 are valid; 23:30 is closing time.
    assert.equal(days[0]!.date, '2026-11-05');
    assert.deepEqual(
      days[0]!.slots.map((s) =>
        new Date(Date.parse(s) + 5 * 3_600_000).toISOString().slice(11, 16),
      ),
      ['23:00'],
    );
    // Friday's window continues past midnight into Saturday's date.
    const sat = days.find((d) => d.date === '2026-11-07')!;
    assert.ok(sat.slots.some((s) => Date.parse(s) === pkt('2026-11-07T01:00:00')));
  });

  it('skips holidays', () => {
    const now = pkt('2026-11-05T09:00:00');
    const days = preorderSlots({ hours: HOURS, now, maxDays: 3, holidays: ['2026-11-06'] });
    assert.ok(
      !days.some(
        (d) =>
          d.date === '2026-11-06' &&
          d.slots.some((s) => Date.parse(s) < pkt('2026-11-07T00:00:00')),
      ),
    );
  });

  it('refuses COD more than 2 hours out', () => {
    const now = pkt('2026-11-05T12:00:00');
    assert.equal(codAllowedFor(null, now, 2), true);
    assert.equal(codAllowedFor(new Date(now + 2 * 3_600_000).toISOString(), now, 2), true);
    assert.equal(
      codAllowedFor(new Date(now + 2 * 3_600_000 + 60_000).toISOString(), now, 2),
      false,
    );
  });

  it('groups days for display', () => {
    const rows = groupHours(HOURS);
    assert.deepEqual(
      rows.map((r) => [r.weekdays, r.opens, r.closes, r.overnight]),
      [
        [[1, 2, 3, 4], '12:00', '23:30', false],
        [[5, 6, 0], '12:00', '02:00', true],
      ],
    );
  });
});
