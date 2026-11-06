import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { ErrorCode } from '@/lib/contracts';
import { ApiError } from '@/lib/api';
import { errorCopy } from './errors';
import en from './i18n/messages/en';
import ur from './i18n/messages/ur';

const err = (code: ErrorCode, details?: Record<string, unknown>, retryAfter?: number) =>
  new ApiError(code, 'server text is never shown', 400, details, retryAfter);

describe('error → message mapping', () => {
  it('has en and ur copy for every error code', () => {
    for (const code of ErrorCode.options) {
      const { key } = errorCopy(err(code));
      assert.ok(en.errors[key], `en errors.${key}`);
      assert.ok(ur.errors[key], `ur errors.${key}`);
    }
  });

  it('has en and ur copy for every detail variant', () => {
    const variants = [
      err('STORE_CLOSED', { opensAt: '2026-11-06T12:00:00+05:00' }),
      err('COD_NOT_ALLOWED', { reason: 'blocked' }),
      err('COD_NOT_ALLOWED', { reason: 'over_cap' }),
      err('COD_NOT_ALLOWED', { reason: 'preorder_too_far' }),
      err('PROMO_INVALID', { minOrder: 1500 }),
      err('RATE_LIMITED', {}, 30),
      err('RATE_LIMITED', {}, 540),
      err('UNAUTHENTICATED', { reason: 'otp_required' }),
    ];
    for (const e of variants) {
      const { key } = errorCopy(e);
      assert.ok(en.errors[key] && ur.errors[key], key);
    }
  });

  it('interpolates details', () => {
    assert.deepEqual(errorCopy(err('BELOW_MIN_ORDER', { minOrder: 1000, shortBy: 255 })), {
      key: 'BELOW_MIN_ORDER',
      values: { minOrder: '1,000', shortBy: '255' },
    });
    assert.deepEqual(errorCopy(err('TOO_LATE_TO_CANCEL', { shopPhone: '+920000000000' })).values, {
      phone: '+920000000000',
    });
    assert.deepEqual(
      errorCopy(err('STORE_CLOSED', { opensAt: '2026-11-06T12:00:00+05:00' }), () => '12:00 PM'),
      { key: 'STORE_CLOSED_until', values: { time: '12:00 PM' } },
    );
    assert.deepEqual(errorCopy(err('RATE_LIMITED', {}, 540)), {
      key: 'RATE_LIMITED_minutes',
      values: { minutes: 9 },
    });
    assert.equal(
      errorCopy(err('COD_NOT_ALLOWED', { reason: 'over_cap' })).key,
      'COD_NOT_ALLOWED_over_cap',
    );
  });

  it('every placeholder used by a key is provided', () => {
    const cases: [ApiError, ErrorCopy['key']][] = [
      [err('BELOW_MIN_ORDER', { minOrder: 500, shortBy: 100 }), 'BELOW_MIN_ORDER'],
      [err('TOO_LATE_TO_CANCEL', { shopPhone: 'x' }), 'TOO_LATE_TO_CANCEL'],
      [err('RATE_LIMITED', {}, 10), 'RATE_LIMITED_seconds'],
      [err('PROMO_INVALID', { minOrder: 900 }), 'PROMO_MIN_ORDER'],
    ];
    for (const [e, key] of cases) {
      const copy = errorCopy(e);
      assert.equal(copy.key, key);
      for (const msgs of [en.errors, ur.errors]) {
        const placeholders = [...msgs[key].matchAll(/\{(\w+)/g)].map((m) => m[1]!);
        for (const p of placeholders) assert.ok(p in copy.values, `${key} needs {${p}}`);
      }
    }
  });

  it('falls back for unknown errors', () => {
    assert.equal(errorCopy(new Error('boom')).key, 'INTERNAL_ERROR');
    assert.equal(errorCopy(null).key, 'INTERNAL_ERROR');
  });
});

type ErrorCopy = ReturnType<typeof errorCopy>;
