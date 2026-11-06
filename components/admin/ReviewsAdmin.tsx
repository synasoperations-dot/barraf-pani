'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { toast } from '@/components/ui/Toast';
import { useStaff } from '@/features/admin/session';
import { api } from '@/lib/api';
import type { Review } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { AdminPage, Panel, Switch } from './kit';

/** Review moderation. Comments are customer text: rendered as plain text, never HTML. */
export function ReviewsAdmin() {
  const t = useTranslations('admin.reviews');
  const format = useFormatter();
  const message = useErrorMessage();
  useStaff('reviews');
  const qc = useQueryClient();
  const reviews = useQuery({ queryKey: ['admin', 'reviews'], queryFn: () => api.admin.reviews() });
  const publish = useMutation({
    mutationFn: (r: Review) => api.admin.moderateReview(r.id, { isPublished: !r.isPublished }),
    onSuccess: (r) => {
      qc.setQueryData<Review[]>(['admin', 'reviews'], (l) =>
        l?.map((x) => (x.id === r.id ? r : x)),
      );
      toast(r.isPublished ? t('published') : t('hidden'));
    },
    onError: (e) => toast(message(e)),
  });
  const list = [...(reviews.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <AdminPage title={t('title')}>
      {reviews.isError ? (
        <ErrorState onRetry={() => void reviews.refetch()} />
      ) : !reviews.data ? (
        <Skeleton className="h-48 rounded-card" />
      ) : list.length ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {list.map((r) => (
            <li key={r.id}>
              <Panel className="grid gap-2">
                <p className="flex flex-wrap items-center justify-between gap-2">
                  <span
                    role="img"
                    aria-label={t('stars', { rating: r.rating })}
                    className="font-price text-3xl tracking-[0.1em]"
                  >
                    <span aria-hidden="true">
                      {'★'.repeat(r.rating)}
                      {'☆'.repeat(5 - r.rating)}
                    </span>
                  </span>
                  <span className="font-price text-xl" dir="ltr">
                    {r.orderNumber}
                  </span>
                </p>
                <p className="whitespace-pre-line">
                  {r.comment ?? <span className="text-muted">{t('noComment')}</span>}
                </p>
                <p className="text-xs text-muted">
                  {r.customerName ?? '—'} ·{' '}
                  {format.dateTime(new Date(r.createdAt), { dateStyle: 'medium' })}
                </p>
                <Switch
                  label={t('publish')}
                  checked={r.isPublished}
                  disabled={publish.isPending}
                  onChange={() => publish.mutate(r)}
                />
              </Panel>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={t('empty')} />
      )}
    </AdminPage>
  );
}
