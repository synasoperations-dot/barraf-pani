import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Order, OrderStatus } from '@/lib/contracts';
import { panelStates, screenFor, stepFor } from './panels';

const at = '2026-11-06T19:00:00+05:00';
const o = (
  status: OrderStatus,
  extra: Partial<Pick<Order, 'fulfilment' | 'releasesAt' | 'events'>> = {},
) => ({
  status,
  fulfilment: 'delivery' as const,
  releasesAt: null,
  events: [{ status, at, note: null }],
  ...extra,
});

describe('tracking screens', () => {
  it('maps terminal and special states to their own screen', () => {
    assert.equal(screenFor(o('pending_payment')), 'pending_payment');
    assert.equal(screenFor(o('payment_failed')), 'payment_failed');
    assert.equal(screenFor(o('expired')), 'expired');
    assert.equal(screenFor(o('cancelled')), 'cancelled');
    assert.equal(screenFor(o('rejected')), 'rejected');
    assert.equal(
      screenFor(
        o('rejected', {
          events: [
            { status: 'placed', at, note: null },
            { status: 'rejected', at, note: 'Auto-rejected: not accepted within 8 minutes' },
          ],
        }),
      ),
      'auto_rejected',
    );
    assert.equal(screenFor(o('placed', { releasesAt: at })), 'scheduled');
    assert.equal(screenFor(o('placed')), 'strip');
    assert.equal(screenFor(o('out_for_delivery')), 'strip');
  });

  it('puts each live status on the right panel', () => {
    assert.equal(stepFor(o('placed')), 0);
    assert.equal(stepFor(o('accepted')), 0);
    assert.equal(stepFor(o('preparing')), 1);
    assert.equal(stepFor(o('ready')), 1); // delivery: "Packed and ready" stays on cooking
    assert.equal(stepFor(o('ready', { fulfilment: 'pickup' })), 2); // pickup: at the counter
    assert.equal(stepFor(o('out_for_delivery')), 2);
    assert.equal(stepFor(o('delivered')), 3);
    assert.equal(stepFor(o('picked_up', { fulfilment: 'pickup' })), 3);
    assert.equal(stepFor(o('rejected')), null);
    assert.deepEqual(panelStates(1), ['done', 'active', 'future', 'future']);
    assert.deepEqual(panelStates(3), ['done', 'done', 'done', 'active']);
  });
});
