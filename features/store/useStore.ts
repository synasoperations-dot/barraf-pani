'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { StoreStatus } from '@/lib/contracts';

export const STORE_STATUS_KEY = ['store', 'status'] as const;

/**
 * Open / closed / paused. Short cache (~30 s) per ARCHITECTURE §2.1.
 * `initial` comes from the Server Component read; it is refetched on mount so mock scenarios
 * (and anything that changed since the page was cached) win.
 */
export const useStoreStatus = (initial?: StoreStatus) =>
  useQuery({
    queryKey: STORE_STATUS_KEY,
    queryFn: () => api.storeStatus(),
    initialData: initial,
    initialDataUpdatedAt: 0,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

/** Can the customer order right now, or schedule one? Drives every "closed" CTA. */
export function orderingMode(s: StoreStatus | undefined): 'open' | 'preorder' | 'closed' {
  if (!s) return 'open';
  if (s.isAcceptingOrders) return 'open';
  // Paused means the kitchen stopped taking orders; pre-orders still go through when allowed.
  return s.allowPreorders ? 'preorder' : 'closed';
}
