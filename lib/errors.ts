/**
 * Error code → translated copy (ARCHITECTURE §2.4: every error message goes through i18n).
 * `errorCopy` is pure (unit tested); `useErrorMessage` is the hook components call.
 * Keys live under `errors.*` in lib/i18n/messages (en + ur).
 */
import { useFormatter, useTranslations } from 'next-intl';
import { useCallback } from 'react';
import type { ErrorCode } from '@/lib/contracts';
import type { Messages } from '@/lib/i18n/messages/en';
import { formatAmount } from './format';

export type ErrorKey = keyof Messages['errors'];

export interface ErrorCopy {
  key: ErrorKey;
  values: Record<string, string | number>;
}

interface ErrorLike {
  code: ErrorCode;
  details?: Record<string, unknown>;
  retryAfter?: number;
}

const isErrorLike = (e: unknown): e is ErrorLike =>
  typeof e === 'object' && e !== null && typeof (e as ErrorLike).code === 'string';

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown) => (typeof v === 'string' && v ? v : null);

/**
 * Pick the message key + values for an error. `formatTime` turns an ISO time into local text
 * ("8:30 PM"); amounts are formatted as Western digits ("1,095").
 */
export function errorCopy(e: unknown, formatTime: (iso: string) => string = (s) => s): ErrorCopy {
  if (!isErrorLike(e)) return { key: 'INTERNAL_ERROR', values: {} };
  const d = e.details ?? {};
  switch (e.code) {
    case 'STORE_CLOSED': {
      const opensAt = str(d.opensAt);
      return opensAt
        ? { key: 'STORE_CLOSED_until', values: { time: formatTime(opensAt) } }
        : { key: 'STORE_CLOSED', values: {} };
    }
    case 'BELOW_MIN_ORDER':
      return {
        key: 'BELOW_MIN_ORDER',
        values: {
          minOrder: formatAmount(num(d.minOrder) ?? 0),
          shortBy: formatAmount(num(d.shortBy) ?? 0),
        },
      };
    case 'COD_NOT_ALLOWED': {
      const reason = str(d.reason);
      if (reason === 'blocked') return { key: 'COD_NOT_ALLOWED_blocked', values: {} };
      if (reason === 'over_cap') return { key: 'COD_NOT_ALLOWED_over_cap', values: {} };
      if (reason === 'preorder_too_far')
        return { key: 'COD_NOT_ALLOWED_preorder_too_far', values: {} };
      return { key: 'COD_NOT_ALLOWED', values: {} };
    }
    case 'PROMO_INVALID': {
      const minOrder = num(d.minOrder);
      return minOrder
        ? { key: 'PROMO_MIN_ORDER', values: { minOrder: formatAmount(minOrder) } }
        : { key: 'PROMO_INVALID', values: {} };
    }
    case 'TOO_LATE_TO_CANCEL':
      return { key: 'TOO_LATE_TO_CANCEL', values: { phone: str(d.shopPhone) ?? '' } };
    case 'RATE_LIMITED': {
      const secs = e.retryAfter ?? num(d.retryAfter);
      if (!secs) return { key: 'RATE_LIMITED', values: {} };
      return secs >= 90
        ? { key: 'RATE_LIMITED_minutes', values: { minutes: Math.ceil(secs / 60) } }
        : { key: 'RATE_LIMITED_seconds', values: { seconds: secs } };
    }
    case 'UNAUTHENTICATED':
      return d.reason === 'otp_required'
        ? { key: 'UNAUTHENTICATED_otp', values: {} }
        : { key: 'UNAUTHENTICATED', values: {} };
    default:
      return { key: e.code, values: {} };
  }
}

/** `const message = useErrorMessage(); message(error)` → translated, friendly copy. */
export function useErrorMessage() {
  const t = useTranslations('errors');
  const format = useFormatter();
  return useCallback(
    (e: unknown) => {
      const { key, values } = errorCopy(e, (iso) =>
        format.dateTime(new Date(iso), { weekday: 'short', hour: 'numeric', minute: '2-digit' }),
      );
      // Keys are a typed union; values differ per key, so the call is widened here only.
      return (t as (k: string, v?: Record<string, string | number>) => string)(key, values);
    },
    [t, format],
  );
}
