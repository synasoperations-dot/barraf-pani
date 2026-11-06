'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toast';
import { useOrderTransition } from '@/features/admin/orders';
import { api } from '@/lib/api';
import {
  allowedMoves,
  PREP_MINUTES,
  type AdminOrder,
  type OrderStatus,
  type StaffRole,
} from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { formatAmount } from '@/lib/format';
import { ConfirmSheet } from './kit';

type Pending =
  | { kind: 'accept' }
  | { kind: 'reason'; to: 'rejected' | 'cancelled' }
  | { kind: 'cash'; to: 'delivered' | 'picked_up' }
  | { kind: 'rider' }
  | null;

/** Prep-time picker for Accept: big 10 / 15 / 20 / 30 buttons (sets the ETA). */
export function PrepSheet({
  open,
  onClose,
  onPick,
  number,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (m: (typeof PREP_MINUTES)[number]) => void;
  number: string;
}) {
  const t = useTranslations('admin.actions');
  return (
    <Sheet open={open} onClose={onClose} title={t('acceptTitle', { number })}>
      <p className="mb-4">{t('prepQuestion')}</p>
      <div className="grid grid-cols-2 gap-3">
        {PREP_MINUTES.map((m) => (
          <Button
            key={m}
            size="lg"
            variant="secondary"
            className="min-h-20"
            onClick={() => onPick(m)}
          >
            <span className="font-price text-4xl" dir="ltr">
              {m}
            </span>
            <span>{t('minutes')}</span>
          </Button>
        ))}
      </div>
    </Sheet>
  );
}

function RiderSheet({
  order,
  open,
  onClose,
}: {
  order: AdminOrder;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations('admin.actions');
  const message = useErrorMessage();
  const qc = useQueryClient();
  const riders = useQuery({
    queryKey: ['admin', 'riders'],
    queryFn: () => api.admin.riders(),
    enabled: open,
  });
  const assign = useMutation({
    mutationFn: (riderId: string) => api.admin.assignRider(order.id, { riderId }),
    onSuccess: (o) => {
      qc.setQueriesData<AdminOrder[]>({ queryKey: ['admin', 'orders'] }, (list) =>
        Array.isArray(list) ? list.map((x) => (x.id === o.id ? o : x)) : list,
      );
      toast(t('riderAssigned', { name: o.rider?.name ?? '' }));
      onClose();
    },
    onError: (e) => toast(message(e)),
  });
  const active = (riders.data ?? []).filter((r) => r.isActive);
  return (
    <Sheet open={open} onClose={onClose} title={t('assignRider')}>
      {riders.isLoading && <p>{t('loadingRiders')}</p>}
      {riders.data && !active.length && <p>{t('noRiders')}</p>}
      <div className="grid gap-3">
        {active.map((r) => (
          <Button
            key={r.id}
            size="lg"
            variant={order.rider?.id === r.id ? 'secondary' : 'ghost'}
            loading={assign.isPending && assign.variables === r.id}
            onClick={() => assign.mutate(r.id)}
          >
            {r.name}
          </Button>
        ))}
      </div>
    </Sheet>
  );
}

/**
 * The buttons a role may press on an order (§4.2 + role table). Every change goes through the
 * transition endpoint; optimistic with rollback; VERSION_CONFLICT → toast + fresh card.
 */
export function OrderActions({
  order,
  role,
  compact,
}: {
  order: AdminOrder;
  role: StaffRole;
  compact?: boolean;
}) {
  const t = useTranslations('admin.actions');
  const ts = useTranslations();
  const message = useErrorMessage();
  const [pending, setPending] = useState<Pending>(null);
  const move = useOrderTransition({ onConflict: () => toast(t('conflict')) });
  const moves = allowedMoves(role, order);
  const cod = order.paymentMethod === 'cod';

  const run = (
    to: OrderStatus,
    extra: { note?: string | null; prepMinutes?: (typeof PREP_MINUTES)[number] } = {},
  ) => {
    setPending(null);
    move.mutate(
      { order, to, ...extra },
      {
        onError: (e) => {
          if (!(e && typeof e === 'object' && 'code' in e && e.code === 'VERSION_CONFLICT'))
            toast(message(e));
        },
      },
    );
  };

  const press = (to: OrderStatus) => {
    if (to === 'accepted') return setPending({ kind: 'accept' });
    if (to === 'rejected' || to === 'cancelled') return setPending({ kind: 'reason', to });
    if ((to === 'delivered' || to === 'picked_up') && cod) return setPending({ kind: 'cash', to });
    run(to);
  };

  const label = (to: OrderStatus) =>
    to === 'cancelled' && order.status === 'out_for_delivery' ? t('failedDelivery') : t(`to.${to}`);
  const primary = moves.filter((m) => m !== 'rejected' && m !== 'cancelled');
  const destructive = moves.filter((m) => m === 'rejected' || m === 'cancelled');
  const canAssign =
    order.fulfilment === 'delivery' &&
    ['accepted', 'preparing', 'ready'].includes(order.status) &&
    role !== 'kitchen' &&
    role !== 'rider';

  // Payment-driven states belong to the gateway + reconciler (§4.3), never to staff buttons.
  if (order.status === 'pending_payment' || order.status === 'expired') return null;
  if (!moves.length && !canAssign) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {primary.map((to) => (
        <Button
          key={to}
          size={compact ? 'md' : 'lg'}
          variant={to === 'accepted' ? 'primary' : 'secondary'}
          className="min-h-14 flex-1"
          onClick={() => press(to)}
          disabled={move.isPending}
        >
          {label(to)}
        </Button>
      ))}
      {canAssign && (
        <Button
          size="md"
          variant="ghost"
          className="min-h-14"
          onClick={() => setPending({ kind: 'rider' })}
        >
          {order.rider ? t('changeRider') : t('assignRider')}
        </Button>
      )}
      {destructive.map((to) => (
        <Button key={to} size="md" variant="ghost" className="min-h-14" onClick={() => press(to)}>
          {label(to)}
        </Button>
      ))}

      <PrepSheet
        open={pending?.kind === 'accept'}
        number={order.number}
        onClose={() => setPending(null)}
        onPick={(m) => run('accepted', { prepMinutes: m })}
      />
      <ConfirmSheet
        open={pending?.kind === 'reason'}
        onClose={() => setPending(null)}
        title={
          pending?.kind === 'reason'
            ? t(
                pending.to === 'rejected'
                  ? 'rejectTitle'
                  : order.status === 'out_for_delivery'
                    ? 'failedTitle'
                    : 'cancelTitle',
                {
                  number: order.number,
                },
              )
            : ''
        }
        body={
          pending?.kind === 'reason' &&
          pending.to === 'cancelled' &&
          order.status === 'out_for_delivery'
            ? t('failedBody')
            : t('reasonBody')
        }
        reason={{ label: t('reason'), required: true }}
        confirmLabel={pending?.kind === 'reason' ? label(pending.to) : ''}
        danger
        onConfirm={(note) => pending?.kind === 'reason' && run(pending.to, { note })}
      />
      <ConfirmSheet
        open={pending?.kind === 'cash'}
        onClose={() => setPending(null)}
        title={t('cashTitle')}
        body={
          <p className="text-center">
            {t('cashBody')}
            <span dir="ltr" className="mt-2 block font-price text-6xl">
              {ts('price.rs', { amount: formatAmount(order.total) })}
            </span>
          </p>
        }
        confirmLabel={t('cashConfirm')}
        onConfirm={() => pending?.kind === 'cash' && run(pending.to)}
      />
      {pending?.kind === 'rider' && (
        <RiderSheet order={order} open onClose={() => setPending(null)} />
      )}
    </div>
  );
}
