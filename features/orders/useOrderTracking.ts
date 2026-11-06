'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Order } from '@/lib/contracts';
import { subscribeToOrder, type ConnectionStatus } from '@/lib/realtime';

export const orderKey = (token: string) => ['order', token] as const;

/**
 * One order, server-rendered first (`initial`), then live: realtime pushes status/ETA, with
 * polling every 12 s when the stream drops (`connection === 'polling'` → "Reconnecting…").
 * A status change re-fetches the full order (events, rider, review) once.
 */
export function useOrderTracking(token: string, initial?: Order | null) {
  const qc = useQueryClient();
  const [connection, setConnection] = useState<ConnectionStatus>('live');

  const query = useQuery({
    queryKey: orderKey(token),
    queryFn: ({ signal }) => api.trackOrder(token, signal),
    initialData: initial ?? undefined,
    initialDataUpdatedAt: 0, // the browser re-checks the server-rendered snapshot once
    staleTime: 5_000,
  });

  useEffect(
    () =>
      subscribeToOrder(
        token,
        (e) => {
          const cur = qc.getQueryData<Order>(orderKey(token));
          if (!cur || cur.status !== e.status || cur.paymentStatus !== e.paymentStatus)
            void qc.invalidateQueries({ queryKey: orderKey(token) });
          else
            qc.setQueryData<Order>(orderKey(token), {
              ...cur,
              estimatedReadyAt: e.estimatedReadyAt,
              estimatedDeliveryAt: e.estimatedDeliveryAt,
            });
        },
        setConnection,
      ),
    [qc, token],
  );

  return { ...query, connection };
}
