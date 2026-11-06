'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { ErrorState } from '@/components/ui/states';
import type { Order, OrderStatus } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { useRecentOrders } from '@/features/orders/recent';
import { useOrderTracking } from '@/features/orders/useOrderTracking';
import { isNotFound, isOffline } from '@/features/payment/payView';
import { useReorder } from '@/features/payment/useReorder';
import { OrderMissing } from './OrderMissing';
import { ReceiptCard, ReceiptSkeleton } from './ReceiptCard';

// Framer Motion ships only when the celebration actually plays.
const Celebration = dynamic(() => import('./Celebration').then((m) => m.Celebration), {
  ssr: false,
});

const NOT_CELEBRATED: OrderStatus[] = [
  'pending_payment',
  'payment_failed',
  'expired',
  'cancelled',
  'rejected',
];
const { persist } = useRecentOrders;

/**
 * /order/[token]: live receipt (server-rendered `initial` when the server can see the order).
 * With ?placed=1 the celebration plays once per order on this device, then ?placed is dropped.
 */
export function Receipt({
  token,
  initial,
  placed,
}: {
  token: string;
  initial: Order | null;
  placed: boolean;
}) {
  const router = useRouter();
  const { data: order, error, refetch } = useOrderTracking(token, initial);
  const reorder = useReorder();
  const celebrated = useRecentOrders((s) => s.celebrated);
  const hydrated = useSyncExternalStore(
    persist.onFinishHydration,
    persist.hasHydrated,
    () => false,
  );
  const errorMessage = useErrorMessage();
  const [celebrating, setCelebrating] = useState(false);

  // Decide once the order and the celebrated list are both known; then ?placed is dropped either way.
  const decided = placed && hydrated && !!order;
  const eligible = decided && !NOT_CELEBRATED.includes(order.status) && !celebrated.includes(token);
  if (eligible && !celebrating) setCelebrating(true);

  useEffect(() => {
    if (!decided) return;
    if (celebrating) useRecentOrders.getState().markCelebrated(token);
    router.replace(`/order/${encodeURIComponent(token)}`, { scroll: false });
  }, [decided, celebrating, router, token]);

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
    return <ReceiptSkeleton />;
  }

  return (
    <>
      <ReceiptCard
        order={order}
        onReorder={() => reorder.run(order)}
        reorderReady={reorder.ready}
      />
      {celebrating && <Celebration order={order} onDismiss={() => setCelebrating(false)} />}
    </>
  );
}
