import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import type { AdminOrder, DeliveryZone, Menu, SalesReport } from '@/lib/contracts';
import { formatAmount } from '@/lib/format';
import { rankZones } from '@/lib/geo';
import { maskPkPhone } from '@/lib/phone';
import { menuFixture } from '@/mocks/fixtures/menu';
import {
  acceptWindow,
  allDay,
  groupBoard,
  isAlerting,
  localDate,
  placeOrder,
  ringing,
} from './board';
import { dealMenuTotal, labelAmount, labelMismatch } from './deals';
import { toCsv, waLink } from './links';
import { addLine, repeatLines, setQty, trackingMessage } from './manual';
import { priceDiff, reorder, soldOutUntil, withDefault } from './menu';
import { flushQueue, moveQueue, type QueuedMove } from './offlineQueue';
import { reportKpis } from './report';

const T = { autoRejectMinutes: 8, managerAlertMinutes: 6, preorderReleaseMinutes: 60 };
const NOW = Date.parse('2026-11-06T15:00:00Z');
const ago = (min: number) => new Date(NOW - min * 60_000).toISOString();

const order = (over: Partial<AdminOrder> = {}): AdminOrder =>
  ({
    id: Math.random().toString(36),
    number: 'BP-1042',
    status: 'placed',
    fulfilment: 'pickup',
    createdAt: ago(1),
    releasedAt: null,
    scheduledFor: null,
    lines: [],
    customer: { id: 'c', name: 'A', phone: '+923001234567', orderCount: 1 },
    ...over,
  }) as AdminOrder;

describe('orders board', () => {
  it('places orders in tabs and columns; done newest first', () => {
    const groups = groupBoard(
      [
        order({ status: 'pending_payment' }),
        order({ status: 'rejected' }),
        order({ status: 'placed', scheduledFor: new Date(NOW + 5 * 3_600_000).toISOString() }),
        order({ status: 'accepted' }),
        order({ status: 'delivered', createdAt: ago(30) }),
        order({ status: 'picked_up', createdAt: ago(10), number: 'BP-2' }),
      ],
      T,
      NOW,
    );
    assert.equal(groups.tabs.awaiting_payment.length, 1);
    assert.equal(groups.tabs.closed.length, 1);
    assert.equal(groups.tabs.scheduled.length, 1);
    assert.equal(groups.columns.accepted.length, 1);
    assert.equal(groups.columns.done[0]!.number, 'BP-2');
  });

  it('a pre-order joins the New column once released (60 min before)', () => {
    const o = order({ scheduledFor: new Date(NOW + 30 * 60_000).toISOString() });
    assert.deepEqual(placeOrder(o, T, NOW), { tab: 'board', column: 'new' });
  });

  it('manager alert at 6 min, auto-reject at 8, counted from release for pre-orders', () => {
    assert.ok(!isAlerting(order({ createdAt: ago(5) }), T, NOW));
    assert.ok(isAlerting(order({ createdAt: ago(6.5) }), T, NOW));
    const pre = order({ createdAt: ago(120), releasedAt: ago(2) });
    assert.equal(acceptWindow(pre, T).rejectAt, NOW + 6 * 60_000);
  });

  it('rings for released placed orders, except the ones this device entered', () => {
    const a = order();
    const mine = order();
    assert.deepEqual(
      ringing([a, mine, order({ status: 'accepted' })], T, NOW, new Set([mine.id])),
      [a],
    );
  });

  it('kitchen "All day" sums active tickets by item and size', () => {
    const l = (qty: number) =>
      ({
        itemId: 'i1',
        variantName: 'Standard',
        name: { en: 'Fillet Fury', ur: null },
        qty,
      }) as AdminOrder['lines'][number];
    const sum = allDay([
      order({ lines: [l(2)] }),
      order({ status: 'preparing', lines: [l(3)] }),
      order({ status: 'ready', lines: [l(9)] }),
    ]);
    assert.equal(sum[0]!.qty, 5);
  });

  it('local date is Asia/Karachi', () => {
    assert.equal(localDate(Date.parse('2026-11-06T20:00:00Z')), '2026-11-07');
  });
});

describe('offline queue (kitchen)', () => {
  const mem = () => {
    const m = new Map<string, string>();
    return {
      getItem: (k: string) => m.get(k) ?? null,
      setItem: (k: string, v: string) => void m.set(k, v),
    };
  };
  const move = (key: string, orderId = key): QueuedMove => ({
    key,
    orderId,
    orderNumber: 'BP-1',
    to: 'preparing',
    version: 1,
    note: null,
    queuedAt: '2026-11-06T15:00:00Z',
  });

  it('keeps one move per order and replays with the original keys', async () => {
    const q = moveQueue(mem());
    q.push(move('k1', 'o1'));
    q.push(move('k2', 'o1')); // second tap replaces
    q.push(move('k3', 'o2'));
    const sent: string[] = [];
    const out = await flushQueue(
      q,
      async (m) => void sent.push(m.key),
      () => false,
    );
    assert.deepEqual(sent, ['k2', 'k3']);
    assert.equal(out.length, 2);
    assert.equal(q.list().length, 0);
  });

  it('stops on a network error; drops (and reports) a conflict', async () => {
    const q = moveQueue(mem());
    q.push(move('a'));
    q.push(move('b'));
    const net = new Error('net');
    let out = await flushQueue(
      q,
      async () => Promise.reject(net),
      (e) => e === net,
    );
    assert.equal(out.length, 0);
    assert.equal(q.list().length, 2);
    out = await flushQueue(
      q,
      async () => Promise.reject(new Error('VERSION_CONFLICT')),
      () => false,
    );
    assert.deepEqual(
      out.map((o) => o.result),
      ['dropped', 'dropped'],
    );
    assert.equal(q.list().length, 0);
  });
});

describe('links, CSV, phones, money formatting', () => {
  it('wa.me links carry digits only and an encoded message', () => {
    assert.equal(
      waLink('+923001234567', 'Hi & bye'),
      'https://wa.me/923001234567?text=Hi%20%26%20bye',
    );
  });
  it('CSV quotes commas/quotes/newlines and neutralises formulas', () => {
    assert.equal(
      toCsv([
        ['a,b', 'say "hi"', 3],
        ['=SUM(A1)', null, 'x\ny'],
      ]),
      '"a,b","say ""hi""",3\r\n\'=SUM(A1),,"x\ny"',
    );
  });
  it('kitchen masking', () => {
    assert.equal(maskPkPhone('+923001234567'), '0300 •••4567');
    assert.equal(maskPkPhone('—'), '—');
  });
  it('PKR: whole rupees with Western-digit grouping', () => {
    assert.equal(formatAmount(1095), '1,095');
    assert.equal(formatAmount(154675), '154,675');
    assert.equal(formatAmount(0), '0');
  });
});

describe('manual order entry', () => {
  const l = { itemId: 'i', variantId: 'v', modifierIds: ['b', 'a'], qty: 1, note: null };
  it('merges identical lines, caps at 50, removes at 0', () => {
    let ls = addLine([], l);
    ls = addLine(ls, { ...l, modifierIds: ['a', 'b'], qty: 60 });
    assert.equal(ls.length, 1);
    assert.equal(ls[0]!.qty, 50);
    assert.deepEqual(setQty(ls, 0, 0), []);
  });
  it('repeat last order copies intent only', () => {
    const lines = repeatLines(
      order({
        lines: [
          {
            itemId: 'i',
            variantId: 'v',
            modifiers: [{ id: 'm', name: { en: 'x', ur: null }, price: 95 }],
            qty: 2,
            note: null,
            unitPrice: 590,
            lineTotal: 1180,
          } as never,
        ],
      }),
    );
    assert.deepEqual(lines, [
      { itemId: 'i', variantId: 'v', modifierIds: ['m'], qty: 2, note: null },
    ]);
  });
  it('tracking message in en and ur carries the link', () => {
    const p = { name: 'Ali', number: 'BP-1042', url: 'https://bp.test/track/abc' };
    assert.match(trackingMessage('en', p), /^Hi Ali! .*BP-1042.*https:\/\/bp\.test\/track\/abc$/);
    assert.match(trackingMessage('ur', p), /BP-1042[\s\S]*https:\/\/bp\.test\/track\/abc/);
  });
});

describe('deals, menu, zones, reports', () => {
  const menu = menuFixture as Menu;
  const fury = menu.items.find((i) => i.name.en === 'Fillet Fury')!;
  const items = [{ itemId: fury.id, variantId: fury.variants[0]!.id, modifierIds: [], qty: 2 }];

  it('deal label must match the menu total', () => {
    assert.equal(dealMenuTotal(items, menu), fury.variants[0]!.price * 2);
    assert.equal(labelAmount('Only Rs 1,290!'), 1290);
    assert.equal(labelMismatch(`Rs ${fury.variants[0]!.price * 2}`, items, menu), null);
    assert.ok(labelMismatch('Rs 799', items, menu));
    assert.equal(labelMismatch('Family night', items, menu), null);
  });

  it('price diff flags > ±40% changes; exactly one default; reorder renumbers', () => {
    const v = [
      {
        id: 'a',
        name: 'S',
        size: null,
        option: null,
        price: 500,
        isDefault: true,
        isAvailable: true,
      },
    ];
    const d = priceDiff(v, [{ ...v[0]!, price: 750 }]);
    assert.equal(d[0]!.pct, 50);
    assert.ok(d[0]!.big);
    assert.ok(!priceDiff(v, [{ ...v[0]!, price: 600 }])[0]!.big);
    const two = [...v, { ...v[0]!, id: 'b', price: 900, isDefault: false }];
    assert.deepEqual(
      withDefault(two, 'b').variants.map((x) => x.isDefault),
      [false, true],
    );
    assert.equal(withDefault(two, 'b').basePrice, 900);
    const r = reorder(
      [
        { id: 'x', sortOrder: 0 },
        { id: 'y', sortOrder: 1 },
        { id: 'z', sortOrder: 2 },
      ],
      2,
      0,
    );
    assert.deepEqual(
      r.rows.map((x) => x.id),
      ['z', 'x', 'y'],
    );
    assert.equal(r.changed.length, 3);
  });

  it('sold out today resets at the next 05:00 PKT', () => {
    assert.equal(soldOutUntil(Date.parse('2026-11-06T15:00:00Z')), '2026-11-07T00:00:00.000Z');
    assert.equal(soldOutUntil(Date.parse('2026-11-06T22:00:00Z')), '2026-11-07T00:00:00.000Z');
  });

  it('zone resolution: covers → priority → smallest area', () => {
    const sq = (id: string, d: number, priority: number): DeliveryZone => ({
      id,
      name: id,
      priority,
      fee: 0,
      minOrder: 0,
      etaMinutes: 30,
      isActive: true,
      polygon: [
        [72.3 - d, 31.27 - d],
        [72.3 + d, 31.27 - d],
        [72.3 + d, 31.27 + d],
        [72.3 - d, 31.27 + d],
        [72.3 - d, 31.27 - d],
      ],
    });
    const p = { lat: 31.27, lng: 72.3 };
    assert.deepEqual(
      rankZones(p, [sq('big', 0.1, 0), sq('small', 0.01, 0)]).map((z) => z.id),
      ['small', 'big'],
    );
    assert.deepEqual(
      rankZones(p, [sq('small', 0.01, 0), sq('big', 0.1, 1)]).map((z) => z.id),
      ['big', 'small'],
    );
    assert.deepEqual(rankZones({ lat: 0, lng: 0 }, [sq('big', 0.1, 0)]), []);
  });

  it('report KPIs never divide by zero', () => {
    const empty = {
      orderCount: 0,
      allOrders: 0,
      cancelledCount: 0,
      rejectedCount: 0,
      byFulfilment: [],
      bySource: [],
    } as unknown as SalesReport;
    assert.deepEqual(reportKpis(empty), { deliveryShare: 0, cancelRate: 0, websiteShare: 0 });
    const r = {
      orderCount: 10,
      allOrders: 20,
      cancelledCount: 1,
      rejectedCount: 1,
      byFulfilment: [{ fulfilment: 'delivery', count: 6, total: 0 }],
      bySource: [{ source: 'website', count: 4, total: 0 }],
    } as unknown as SalesReport;
    assert.deepEqual(reportKpis(r), { deliveryShare: 0.6, cancelRate: 0.1, websiteShare: 0.4 });
  });
});
