import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { buildIcs } from './ics';

describe('buildIcs', () => {
  it('converts Asia/Karachi local time to UTC and escapes text', () => {
    const ics = buildIcs(
      {
        uid: 'abc',
        title: 'Table, 4 guests',
        date: '2026-11-06',
        time: '20:30',
        location: 'Jhang; PK',
      },
      Date.parse('2026-11-01T00:00:00Z'),
    );
    assert.match(ics, /DTSTART:20261106T153000Z/);
    assert.match(ics, /DTEND:20261106T173000Z/);
    assert.match(ics, /SUMMARY:Table\\, 4 guests/);
    assert.match(ics, /LOCATION:Jhang\\; PK/);
    assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n'));
  });
});
