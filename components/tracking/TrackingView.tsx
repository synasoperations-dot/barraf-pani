'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, type ReactNode } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { useRecentOrders } from '@/features/orders/recent';
import { useOrderTracking } from '@/features/orders/useOrderTracking';
import { useStoreStatus } from '@/features/store/useStore';
import { screenFor } from '@/features/tracking/panels';
import { isApiError } from '@/lib/api';
import type { Order } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { SITE } from '@/lib/site';
import { CancelOrder } from './CancelOrder';
import { ComicStrip } from './ComicStrip';
import { ReviewPanel } from './Review';
import { ReconnectingBanner, RiderCard, SpecialScreen } from './screens';
import { TrackHeader } from './TrackHeader';
import { TrackingSkeleton } from './TrackingSkeleton';

export const TrackFrame = ({ children }: { children: ReactNode }) => (
  <div className="grid-paper">
    <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 md:py-12">{children}</div>
  </div>
);

/**
 * /track/[token]: server-rendered first (`initial`), then realtime with polling fallback.
 * Works with no account and no device history (staff-entered WhatsApp / phone orders, §A1).
 */
export function TrackingView({ token, initial }: { token: string; initial: Order | null }) {
  const { data: order, error, isPending, refetch, connection } = useOrderTracking(token, initial);
  const { data: store } = useStoreStatus();
  const shopPhone = store?.shopPhone ?? SITE.phone;
  const message = useErrorMessage();
  const found = Boolean(order);

  // Remember tracked orders (token only) so "Find my order" lists them on this device.
  // Only after the persisted store has loaded: an earlier write would overwrite saved tokens.
  useEffect(() => {
    if (!found) return;
    const { persist, getState } = useRecentOrders;
    if (persist.hasHydrated()) return getState().add(token);
    return persist.onFinishHydration(() => getState().add(token));
  }, [found, token]);

  if (!order) {
    if (isPending)
      return (
        <TrackFrame>
          <TrackingSkeleton />
        </TrackFrame>
      );
    if (isApiError(error) && error.code === 'NOT_FOUND')
      return (
        <TrackFrame>
          <NotFound />
        </TrackFrame>
      );
    const offline =
      (isApiError(error) && error.code === 'NETWORK_ERROR') ||
      (typeof navigator !== 'undefined' && !navigator.onLine);
    return (
      <TrackFrame>
        <ErrorState
          offline={offline}
          body={offline ? undefined : message(error)}
          onRetry={() => void refetch()}
        />
      </TrackFrame>
    );
  }

  const screen = screenFor(order);
  return (
    <TrackFrame>
      {connection === 'polling' && <ReconnectingBanner />}
      <TrackHeader order={order} eta={screen === 'strip'} />
      {screen === 'strip' ? (
        <>
          <ComicStrip order={order} />
          {order.status === 'out_for_delivery' && order.rider && <RiderCard rider={order.rider} />}
          {(order.status === 'delivered' || order.status === 'picked_up') && (
            <ReviewPanel order={order} />
          )}
        </>
      ) : (
        <SpecialScreen screen={screen} order={order} shopPhone={shopPhone} />
      )}
      {/* Same tree position on every screen, so an open Sheet / pending cancel survives the
          order moving on (accepted → TOO_LATE_TO_CANCEL shown; cancelled → toast fires). */}
      <CancelOrder
        token={token}
        shopPhone={shopPhone}
        canCancel={order.canCancel}
        className={screen === 'strip' ? undefined : 'flex justify-center'}
      />
    </TrackFrame>
  );
}

export function NotFound() {
  const t = useTranslations('tracking.notFound');
  return (
    <EmptyState
      title={t('title')}
      body={t('body')}
      action={
        <Link href="/track" className={buttonClasses()}>
          {t('cta')}
        </Link>
      }
    />
  );
}
