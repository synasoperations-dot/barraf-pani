'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { OrderMissing } from '@/components/receipt/OrderMissing';
import { ErrorState } from '@/components/ui/states';
import type { OnlineProvider } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { orderKey, useOrderTracking } from '@/features/orders/useOrderTracking';
import {
  isNotFound,
  isOffline,
  onlineProvider,
  paymentExpiry,
  payView,
  STUCK_AFTER_MS,
} from '@/features/payment/payView';
import { clearCartWhenReady, useReorder } from '@/features/payment/useReorder';
import { PayOutcome } from './PayOutcome';
import { PayScreen } from './PayScreen';

/**
 * /pay/return: waits on realtime (polling fallback) and only follows the server's status.
 * placed → clear the cart and go to the receipt; everything else is a PayOutcome screen.
 */
export function PayReturn({ token, provider }: { token: string; provider: OnlineProvider | null }) {
  const t = useTranslations('payment');
  const router = useRouter();
  const qc = useQueryClient();
  const { data: order, error, refetch, connection } = useOrderTracking(token);
  const reorder = useReorder();
  const errorMessage = useErrorMessage();
  const [now, setNow] = useState(() => Date.now());
  const [seenExpired, setSeenExpired] = useState(false);
  // Remember an expiry we saw, so a later `placed` reads as "back on" (render-time update).
  if (order?.status === 'expired' && !seenExpired) setSeenExpired(true);

  const createdAt = order?.createdAt;
  useEffect(() => {
    // Re-render at the 2-minute mark so "pending" becomes "still waiting".
    const due = createdAt ? Date.parse(createdAt) + STUCK_AFTER_MS - Date.now() : 0;
    if (due <= 0) return;
    const id = setTimeout(() => setNow(Date.now()), due + 50);
    return () => clearTimeout(id);
  }, [createdAt]);

  const view = order
    ? payView(order, {
        // The event log also says so after a reload (expired → placed).
        seenExpired: seenExpired || order.events.some((e) => e.status === 'expired'),
        pendingMs: now - Date.parse(order.createdAt),
      })
    : null;

  useEffect(() => {
    if (view !== 'placed' && view !== 'back_on') return;
    clearCartWhenReady();
    if (view === 'placed') router.replace(`/order/${encodeURIComponent(token)}?placed=1`);
  }, [view, router, token]);

  // ponytail: provider falls back to JazzCash only for copy when the order isn't online.
  const p = onlineProvider(order?.paymentMethod) ?? provider ?? 'jazzcash';

  if (!order) {
    if (error && isNotFound(error)) return <OrderMissing />;
    if (error)
      return (
        <div className="mx-auto max-w-xl px-4 py-12">
          <ErrorState
            offline={isOffline(error)}
            body={isOffline(error) ? undefined : errorMessage(error)}
            onRetry={() => void refetch()}
          />
        </div>
      );
    return (
      <PayScreen
        busy
        title={t('return.title')}
        body={t('return.body', { provider: t(`provider.${p}`) })}
      />
    );
  }

  // Online checkout keeps the cart, so it may still hold these lines: rebuild it from the order
  // (today's availability) instead of adding on top and doubling quantities.
  return (
    <PayOutcome
      view={view!}
      token={token}
      provider={p}
      expiresAt={paymentExpiry(token, order.createdAt)}
      reconnecting={connection === 'polling'}
      onExpire={() => void qc.invalidateQueries({ queryKey: orderKey(token) })}
      onReorder={() => reorder.run(order, { replaceCart: true })}
      reorderReady={reorder.ready}
    />
  );
}
