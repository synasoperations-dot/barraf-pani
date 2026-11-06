import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ApiError } from '@/lib/api';
import { createCheckoutSession, SessionConflictError } from './session';

const keys = () => {
  let n = 0;
  return () => `key-${++n}`;
};

describe('checkout idempotency-key lifecycle', () => {
  it('creates the key when the session is created (on mount), before any submit', () => {
    const s = createCheckoutSession(keys());
    assert.equal(s.key, 'key-1');
    assert.equal(s.conflicted, false);
  });

  it('reuses the same key on every retry', async () => {
    const s = createCheckoutSession(keys());
    const sent: string[] = [];
    const failures = [
      new ApiError('NETWORK_ERROR', 'net', 0),
      new ApiError('BELOW_MIN_ORDER', 'min', 422),
      new ApiError('DUPLICATE_ORDER_SUSPECTED', 'dup', 409),
      new ApiError('RATE_LIMITED', 'slow down', 429),
    ];
    for (const err of failures)
      await assert.rejects(
        s.submit(async (k) => {
          sent.push(k);
          throw err;
        }),
      );
    const ok = await s.submit(async (k) => {
      sent.push(k);
      return 'order';
    });
    assert.equal(ok, 'order');
    assert.deepEqual(new Set(sent), new Set(['key-1']));
    assert.equal(sent.length, 5);
  });

  it('sends one request for a double tap', async () => {
    const s = createCheckoutSession(keys());
    let calls = 0;
    let release!: () => void;
    const send = (k: string) =>
      new Promise<string>((resolve) => {
        calls++;
        release = () => resolve(k);
      });
    const a = s.submit(send);
    const b = s.submit(send);
    assert.equal(s.pending, true);
    release();
    assert.deepEqual(await Promise.all([a, b]), ['key-1', 'key-1']);
    assert.equal(calls, 1);
    assert.equal(s.pending, false);
  });

  it('renews the key only after IDEMPOTENCY_CONFLICT and the customer confirming', async () => {
    const s = createCheckoutSession(keys());
    assert.equal(s.confirmNewSession(), false, 'no-op without a conflict');
    assert.equal(s.key, 'key-1');

    await assert.rejects(
      s.submit(async () => {
        throw new ApiError('IDEMPOTENCY_CONFLICT', 'changed', 422);
      }),
    );
    assert.equal(s.conflicted, true);
    assert.equal(s.key, 'key-1', 'not renewed until confirmed');
    await assert.rejects(
      s.submit(async () => 'x'),
      SessionConflictError,
    );

    assert.equal(s.confirmNewSession(), true);
    assert.equal(s.key, 'key-2');
    assert.equal(s.conflicted, false);
    assert.equal(await s.submit(async (k) => k), 'key-2');
  });
});
