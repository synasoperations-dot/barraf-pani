'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFormatter, useTranslations } from 'next-intl';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton, Tag } from '@/components/ui/states';
import { toast } from '@/components/ui/Toast';
import { useStaff } from '@/features/admin/session';
import { api } from '@/lib/api';
import { useErrorMessage } from '@/lib/errors';
import { AdminPage } from './kit';

/** Outbox health (§3.3, §4.5): failed and dead WhatsApp / SMS / printer jobs, with Retry. */
export function NotificationsAdmin() {
  const t = useTranslations('admin.notifications');
  const format = useFormatter();
  const message = useErrorMessage();
  useStaff('notifications');
  const qc = useQueryClient();
  const outbox = useQuery({
    queryKey: ['admin', 'outbox'],
    queryFn: () => api.admin.outbox(),
    refetchInterval: 30_000,
  });
  const retry = useMutation({
    mutationFn: (id: string) => api.admin.retryOutbox(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'outbox'] });
      toast(t('queued'));
    },
    onError: (e) => toast(message(e)),
  });
  return (
    <AdminPage title={t('title')}>
      <p className="mb-4 text-sm text-muted">{t('intro')}</p>
      {outbox.isError ? (
        <ErrorState onRetry={() => void outbox.refetch()} />
      ) : !outbox.data ? (
        <Skeleton className="h-48 rounded-card" />
      ) : outbox.data.length ? (
        <div className="relative overflow-x-auto rounded-card border-3 border-ink bg-white shadow-hard-md">
          <table className="w-full min-w-[44rem] text-start text-sm">
            <caption className="sr-only">{t('title')}</caption>
            <thead className="border-b-3 border-ink bg-paper">
              <tr>
                {(['topic', 'status', 'attempts', 'error', 'created', 'action'] as const).map(
                  (h) => (
                    <th key={h} scope="col" className="p-3 text-start">
                      {t(`col.${h}`)}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {outbox.data.map((o) => (
                <tr key={o.id} className="border-b border-grid-line align-top">
                  <td className="p-3 font-mono" dir="ltr">
                    {o.topic}
                    <span className="block text-xs text-muted">{o.dedupKey}</span>
                  </td>
                  <td className="p-3">
                    <Tag tone={o.status === 'dead' ? 'ink' : 'orange'}>
                      {t(`status.${o.status}`)}
                    </Tag>
                  </td>
                  <td className="p-3">{o.attempts}</td>
                  <td className="p-3">{o.lastError ?? '—'}</td>
                  <td className="p-3">
                    {format.dateTime(new Date(o.createdAt), {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="p-3">
                    <Button
                      size="sm"
                      loading={retry.isPending && retry.variables === o.id}
                      onClick={() => retry.mutate(o.id)}
                    >
                      {t('retry')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={t('empty')} body={t('emptyBody')} />
      )}
    </AdminPage>
  );
}
