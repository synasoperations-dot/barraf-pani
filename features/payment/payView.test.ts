import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { payView, STUCK_AFTER_MS } from './payView';

const fresh = { seenExpired: false, pendingMs: 0 };

describe('payView (server status decides, never the browser)', () => {
  it('pending → confirming, then stuck after 2 minutes', () => {
    const o = { status: 'pending_payment', paymentStatus: 'pending' } as const;
    assert.equal(payView(o, fresh), 'confirming');
    assert.equal(payView(o, { seenExpired: false, pendingMs: STUCK_AFTER_MS + 1 }), 'stuck');
  });

  it('failed and expired', () => {
    assert.equal(payView({ status: 'payment_failed', paymentStatus: 'failed' }, fresh), 'failed');
    assert.equal(payView({ status: 'expired', paymentStatus: 'failed' }, fresh), 'expired');
  });

  it('expired but paid / refunded → refund requested (§4.3 step 8)', () => {
    assert.equal(payView({ status: 'expired', paymentStatus: 'paid' }, fresh), 'refund');
    assert.equal(payView({ status: 'expired', paymentStatus: 'refunded' }, fresh), 'refund');
  });

  it('placed or later → placed, or back_on after an expiry was seen', () => {
    const o = { status: 'placed', paymentStatus: 'paid' } as const;
    assert.equal(payView(o, fresh), 'placed');
    assert.equal(payView({ ...o, status: 'preparing' }, fresh), 'placed');
    assert.equal(payView(o, { seenExpired: true, pendingMs: 0 }), 'back_on');
  });
});
