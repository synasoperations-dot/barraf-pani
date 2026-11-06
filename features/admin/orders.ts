'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, isApiError, newIdempotencyKey } from '@/lib/api';
import type { AdminOrder, AdminOrderQuery, OrderStatus, TransitionRequest } from '@/lib/contracts';
import { subscribeToKitchen, type ConnectionStatus } from '@/lib/realtime';

export const boardKey = (q: AdminOrderQuery) => ['admin', 'orders', q] as const;

const upsert = (list: AdminOrder[] | undefined, o: AdminOrder) => {
  if (!list) return list;
  const i = list.findIndex((x) => x.id === o.id);
  if (i === -1) return [o, ...list];
  // Never let an older push overwrite a newer optimistic or fetched copy.
  if (list[i]!.version > o.version) return list;
  const next = [...list];
  next[i] = o;
  return next;
};

/**
 * Orders for the board / kitchen: one fetch for the date range, then live pushes from the staff
 * subscription (polling every 12 s when the stream drops). `connection` drives the status dot.
 */
export function useLiveOrders(query: AdminOrderQuery, opts: { enabled?: boolean } = {}) {
  const qc = useQueryClient();
  const [connection, setConnection] = useState<ConnectionStatus>('live');
  const key = boardKey(query);
  const result = useQuery({
    queryKey: key,
    queryFn: () => api.admin.orders(query),
    enabled: opts.enabled ?? true,
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const keyString = JSON.stringify(key);
  useEffect(() => {
    if (opts.enabled === false) return;
    return subscribeToKitchen((e) => {
      // Every open board query gets the change (board + any filtered views).
      qc.setQueriesData<AdminOrder[]>({ queryKey: ['admin', 'orders'] }, (list) =>
        Array.isArray(list) ? upsert(list, e.order) : list,
      );
    }, setConnection);
    // keyString keeps the effect stable across renders with an equal query.
  }, [qc, keyString, opts.enabled]);

  return { ...result, connection };
}

export interface TransitionInput {
  order: AdminOrder;
  to: OrderStatus;
  note?: string | null;
  prepMinutes?: TransitionRequest['prepMinutes'];
  /** Reuse a key (offline replay); otherwise a fresh one per tap. */
  idempotencyKey?: string;
}

/**
 * transition_order from the UI (§0.3: the only way staff change a status). Optimistic: the card
 * moves at once and rolls back on error. VERSION_CONFLICT → `onConflict` + refetch that order.
 * Re-tapping the current status never sends anything (it's a no-op on the server anyway).
 */
export function useOrderTransition({ onConflict }: { onConflict?: (o: AdminOrder) => void } = {}) {
  const qc = useQueryClient();
  const patchAll = (o: AdminOrder) =>
    qc.setQueriesData<AdminOrder[]>({ queryKey: ['admin', 'orders'] }, (list) =>
      Array.isArray(list) ? list.map((x) => (x.id === o.id ? o : x)) : list,
    );

  return useMutation({
    mutationFn: ({ order, to, note = null, prepMinutes, idempotencyKey }: TransitionInput) =>
      order.status === to
        ? Promise.resolve(order)
        : api.admin.transition(
            order.id,
            { to, version: order.version, note, ...(prepMinutes ? { prepMinutes } : {}) },
            idempotencyKey ?? newIdempotencyKey(),
          ),
    onMutate: async ({ order, to }) => {
      await qc.cancelQueries({ queryKey: ['admin', 'orders'] });
      const snapshot = qc.getQueriesData<AdminOrder[]>({ queryKey: ['admin', 'orders'] });
      // Optimistic copy keeps the old version, so a push with the real new version replaces it.
      patchAll({ ...order, status: to });
      return { snapshot };
    },
    onError: async (e, { order }, ctx) => {
      for (const [k, v] of ctx?.snapshot ?? []) qc.setQueryData(k, v);
      if (isApiError(e) && e.code === 'VERSION_CONFLICT') {
        const fresh = await api.admin.order(order.id).catch(() => null);
        if (fresh) patchAll(fresh);
        onConflict?.(fresh ?? order);
      }
    },
    onSuccess: (o) => patchAll(o),
  });
}

/** Ids of orders this device created (manual entry): they don't ring here (§1b). */
const MINE_KEY = 'bp-admin-mine';
export function rememberMine(id: string) {
  try {
    const ids = JSON.parse(sessionStorage.getItem(MINE_KEY) ?? '[]') as string[];
    sessionStorage.setItem(MINE_KEY, JSON.stringify([...ids.slice(-50), id]));
  } catch {}
}
export function readMine(): Set<string> {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(MINE_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}
