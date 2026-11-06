'use client';

import { useInfiniteQuery, useMutation, useQueries, useQueryClient } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';
import { api, isApiError } from '@/lib/api';
import type { ReviewRequest } from '@/lib/contracts';
import { orderKey } from '@/features/orders/useOrderTracking';
import { useRecentOrders } from '@/features/orders/recent';

/** Cancel while `placed` (§4.2). On any error the order is refetched (it may have moved on). */
export function useCancelOrder(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (reason: string | null) => api.cancelOrder(token, { reason }),
    onSuccess: (o) => qc.setQueryData(orderKey(token), o),
    onError: () => qc.invalidateQueries({ queryKey: orderKey(token) }),
  });
}

/** One review per order, after delivered / picked_up. */
export function useReviewOrder(token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ReviewRequest) => api.reviewOrder(token, body),
    onSuccess: (o) => qc.setQueryData(orderKey(token), o),
    onError: () => qc.invalidateQueries({ queryKey: orderKey(token) }),
  });
}

export const MY_ORDERS_KEY = ['orders', 'mine'] as const;

/**
 * "My orders", newest first, 10 per page (needs the session from phone OTP; UNAUTHENTICATED
 * until then). `orders` flattens the loaded pages; `fetchNextPage` loads more.
 */
export function useMyOrders({ enabled = true }: { enabled?: boolean } = {}) {
  const q = useInfiniteQuery({
    queryKey: MY_ORDERS_KEY,
    queryFn: ({ pageParam }) => api.myOrders(pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 15_000,
    enabled,
  });
  return { ...q, orders: q.data?.pages.flatMap((p) => p.orders) };
}

const isNotFound = (e: unknown) => isApiError(e) && e.code === 'NOT_FOUND';

/**
 * Orders placed (or tracked) on this device: tokens from localStorage, each fetched with
 * trackOrder. NOT_FOUND tokens are dropped quietly. `hydrated` is false until the persisted
 * store has loaded (so the empty state doesn't flash).
 */
export function useDeviceOrders() {
  const tokens = useRecentOrders((s) => s.tokens);
  const hydrated = useSyncExternalStore(
    (cb) => useRecentOrders.persist.onFinishHydration(cb),
    () => useRecentOrders.persist.hasHydrated(),
    () => false,
  );
  const results = useQueries({
    queries: tokens.map((t) => ({
      queryKey: orderKey(t),
      queryFn: ({ signal }: { signal: AbortSignal }) => api.trackOrder(t, signal),
      staleTime: 15_000,
    })),
  });
  const failed = results.filter((r) => r.error && !r.data && !isNotFound(r.error));
  return {
    hydrated,
    orders: results.flatMap((r) => (r.data ? [r.data] : [])),
    pending: !hydrated || results.some((r) => r.isPending && !r.error),
    failed: failed.length,
    retry: () => failed.forEach((r) => void r.refetch()),
  };
}
