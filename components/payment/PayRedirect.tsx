'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { OrderMissing } from '@/components/receipt/OrderMissing';
import { Button, buttonClasses } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/states';
import { isApiError } from '@/lib/api';
import type { OnlineProvider, OrderStatus } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { useOrderTracking } from '@/features/orders/useOrderTracking';
import { isNotFound, isOffline } from '@/features/payment/payView';
import { useInitiatePayment } from '@/features/payment/useInitiatePayment';
import { PayScreen } from './PayScreen';

const STALL_MS = 3000;

/**
 * /pay/redirect: get the signed gateway form (idempotent, key from mount) and auto-post it.
 * A "Continue" button appears if the browser hasn't left after 3 s.
 */
export function PayRedirect({ token, provider }: { token: string; provider: OnlineProvider }) {
  const t = useTranslations('payment');
  const errorMessage = useErrorMessage();
  const { mutate, data, error } = useInitiatePayment(token, provider);
  const form = useRef<HTMLFormElement>(null);
  const started = useRef(false);
  const [stalled, setStalled] = useState(false);
  const name = t(`provider.${provider}`);
  const redirect = data?.redirect;

  useEffect(() => {
    if (started.current) return; // once per mount (StrictMode runs effects twice)
    started.current = true;
    mutate();
  }, [mutate]);

  useEffect(() => {
    if (!redirect) return;
    form.current?.submit();
    const id = setTimeout(() => setStalled(true), STALL_MS);
    return () => clearTimeout(id);
  }, [redirect]);

  if (error) {
    if (isApiError(error) && error.code === 'INVALID_TRANSITION')
      return <NotAwaiting token={token} />;
    if (isNotFound(error)) return <OrderMissing />;
    const offline = isOffline(error);
    return (
      <div className="mx-auto max-w-xl px-4 py-12">
        <ErrorState
          offline={offline}
          body={offline ? undefined : errorMessage(error)}
          onRetry={() => mutate()}
        />
      </div>
    );
  }

  return (
    <PayScreen
      busy
      title={t('redirect.title', { provider: name })}
      body={redirect ? t('redirect.body', { provider: name }) : t('redirect.preparing')}
    >
      {redirect && (
        <form ref={form} method={redirect.method} action={redirect.url} className="contents">
          {Object.entries(redirect.fields).map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
          {stalled && (
            <>
              <p className="rounded-sticker border-2 border-ink bg-white px-3 py-1 text-ink">
                {t('redirect.stalled')}
              </p>
              <Button type="submit" size="lg">
                {t('redirect.continue', { provider: name })}
              </Button>
            </>
          )}
        </form>
      )}
    </PayScreen>
  );
}

const CLOSED: OrderStatus[] = ['payment_failed', 'expired', 'cancelled', 'rejected'];

/** INVALID_TRANSITION: the order isn't pending_payment. Paid → receipt; closed → new checkout. */
function NotAwaiting({ token }: { token: string }) {
  const t = useTranslations('payment.notAwaiting');
  const { data: order, isPending } = useOrderTracking(token);
  const enc = encodeURIComponent(token);
  const closed = order && CLOSED.includes(order.status);
  const paid = order && !closed && order.status !== 'pending_payment';
  return (
    <PayScreen
      busy={isPending}
      title={t('title')}
      body={closed ? t('closedBody') : paid ? t('paidBody') : undefined}
    >
      {paid && (
        <Link href={`/order/${enc}`} className={buttonClasses()}>
          {t('viewOrder')}
        </Link>
      )}
      {closed && (
        <Link href="/checkout" className={buttonClasses()}>
          {t('newCheckout')}
        </Link>
      )}
      <Link href={`/track/${enc}`} className={buttonClasses({ variant: 'ghost' })}>
        {t('track')}
      </Link>
    </PayScreen>
  );
}
