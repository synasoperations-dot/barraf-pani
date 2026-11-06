'use client';

import Link from 'next/link';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Dialog';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { StatusTag } from '@/components/ui/StatusTag';
import { Card } from '@/components/ui/surfaces';
import { toast } from '@/components/ui/Toast';
import { useMenu } from '@/features/menu/useMenu';
import { applyReorder, planReorder, type ReorderPlan } from '@/features/orders/reorder';
import { useMyOrders } from '@/features/tracking/hooks';
import { isApiError } from '@/lib/api';
import type { Order } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { formatAmount, localized } from '@/lib/format';
import { haptic } from '@/lib/haptics';
import { useUi } from '@/stores/ui';

/** /account/orders: receipt-style sticker cards, 10 per page, one-tap Reorder with a review sheet. */
export function OrderHistory() {
  const t = useTranslations('account.orders');
  const message = useErrorMessage();
  const mine = useMyOrders();
  const { data: menu } = useMenu();
  const [review, setReview] = useState<{ order: Order; plan: ReorderPlan } | null>(null);

  const finish = (plan: ReorderPlan) => {
    applyReorder(plan);
    haptic();
    setReview(null);
    useUi.getState().setCartOpen(true);
  };
  const reorder = (order: Order) => {
    if (!menu) return toast(t('menuLoading'));
    const plan = planReorder(order, menu);
    if (plan.issues.length) setReview({ order, plan });
    else finish(plan);
  };

  let body;
  if (mine.orders) {
    body = mine.orders.length ? (
      <>
        <ul className="grid gap-5">
          {mine.orders.map((o) => (
            <li key={o.publicToken}>
              <HistoryCard order={o} onReorder={() => reorder(o)} />
            </li>
          ))}
        </ul>
        {mine.hasNextPage && (
          <p className="mt-6 text-center">
            <Button
              variant="ghost"
              loading={mine.isFetchingNextPage}
              onClick={() => void mine.fetchNextPage()}
            >
              {t('more')}
            </Button>
          </p>
        )}
      </>
    ) : (
      <Card className="p-2">
        <EmptyState
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <Link href="/menu" className={buttonClasses({ variant: 'secondary' })}>
              {t('browse')}
            </Link>
          }
        />
      </Card>
    );
  } else if (mine.error) {
    const offline = isApiError(mine.error) && mine.error.code === 'NETWORK_ERROR';
    body = (
      <ErrorState
        offline={offline}
        body={offline ? undefined : message(mine.error)}
        onRetry={() => void mine.refetch()}
      />
    );
  } else {
    body = <HistorySkeleton />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl leading-none md:text-5xl">{t('title')}</h1>
      {body}
      <ReorderReview
        plan={review?.plan ?? null}
        onClose={() => setReview(null)}
        onConfirm={() => review && finish(review.plan)}
      />
    </div>
  );
}

export const HistorySkeleton = () => (
  <div aria-busy="true" className="grid gap-5">
    <Skeleton className="h-44 rounded-card" />
    <Skeleton className="h-44 rounded-card" />
    <Skeleton className="h-44 rounded-card" />
  </div>
);

export function HistoryCard({ order, onReorder }: { order: Order; onReorder: () => void }) {
  const t = useTranslations();
  const ta = useTranslations('account.orders');
  const format = useFormatter();
  const locale = useLocale();
  const count = order.lines.reduce((n, l) => n + l.qty, 0);
  const shown = order.lines.slice(0, 2);
  return (
    <article className="rounded-card border-3 border-ink bg-white shadow-hard-md">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-3">
        <div>
          <p dir="ltr" className="font-price text-3xl leading-none tracking-[0.02em]">
            {order.number}
          </p>
          <p className="mt-1 text-sm text-muted" suppressHydrationWarning>
            {format.dateTime(new Date(order.createdAt), {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
        <StatusTag status={order.status} />
      </div>
      <p className="px-5 text-sm">
        {shown.map((l) => `${l.qty}× ${localized(l.name, locale)}`).join(', ')}
        {order.lines.length > shown.length && (
          <span className="text-muted">
            {' '}
            {ta('more_items', { count: order.lines.length - shown.length })}
          </span>
        )}
      </p>
      {/* Receipt tear line. */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t-2 border-dashed border-ink px-5 py-4">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold">{ta('items', { count })}</span>
          <span className="font-price text-3xl leading-none tracking-[0.02em] text-orange-deep">
            {t('price.rs', { amount: formatAmount(order.total) })}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/order/${order.publicToken}`}
            aria-label={ta('viewLabel', { number: order.number })}
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            {ta('view')}
          </Link>
          <Button
            size="sm"
            variant="secondary"
            aria-label={ta('reorderLabel', { number: order.number })}
            onClick={onReorder}
          >
            {ta('reorder')}
          </Button>
        </div>
      </div>
    </article>
  );
}

/** Sold-out, inactive and price-changed lines, shown before anything goes in the cart. */
export function ReorderReview({
  plan,
  onClose,
  onConfirm,
}: {
  plan: ReorderPlan | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const t = useTranslations('account.orders');
  const tc = useTranslations('common');
  const locale = useLocale();
  const n = plan?.add.reduce((s, l) => s + l.qty, 0) ?? 0;
  return (
    <Sheet
      open={plan !== null}
      onClose={onClose}
      title={t('reviewTitle')}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
          <Button variant="ghost" onClick={onClose}>
            {tc('close')}
          </Button>
          {n > 0 && <Button onClick={onConfirm}>{t('addRest', { count: n })}</Button>}
        </div>
      }
    >
      <p className="mb-4 text-muted">{t('reviewBody')}</p>
      <ul className="grid gap-3">
        {plan?.issues.map((i) => {
          const name = localized(i.line.name, locale);
          return (
            <li
              key={`${i.kind}-${i.line.itemId}-${i.line.variantId}`}
              className="flex items-start gap-3 rounded-sticker border-3 border-ink bg-white p-3"
            >
              <span
                aria-hidden="true"
                className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-ink bg-orange font-display"
              >
                {i.kind === 'price_changed' ? '₨' : '!'}
              </span>
              <span className="font-bold">
                {i.kind === 'price_changed'
                  ? t('priceChanged', {
                      name,
                      was: formatAmount(i.was),
                      now: formatAmount(i.now),
                    })
                  : t(i.kind === 'sold_out' ? 'soldOut' : 'inactive', { name })}
              </span>
            </li>
          );
        })}
      </ul>
      {n === 0 && <p className="mt-4 font-bold">{t('nothingLeft')}</p>}
    </Sheet>
  );
}
