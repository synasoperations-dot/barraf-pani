'use client';

import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import type { DealsEvents, Menu } from '@/lib/contracts';
import { subscribeToMenu } from '@/lib/realtime';
import { applySoldOut } from './helpers';

export const MENU_KEY = ['menu'] as const;
export const DEALS_KEY = ['deals-events'] as const;

// One realtime subscription per page, however many components read the menu.
let subscribers = 0;
let unsubscribe: (() => void) | null = null;

function useLiveSoldOut(qc: QueryClient) {
  useEffect(() => {
    if (subscribers++ === 0)
      unsubscribe = subscribeToMenu((e) =>
        qc.setQueryData<Menu>(MENU_KEY, (m) => (m ? applySoldOut(m, e) : m)),
      );
    return () => {
      if (--subscribers === 0) {
        unsubscribe?.();
        unsubscribe = null;
      }
    };
  }, [qc]);
}

/**
 * The cached menu (Server Component passes `initial`), kept live: sold-out toggles arrive over
 * realtime without a reload (§4.6). Refetched once on mount so the browser sees fresh stock.
 */
export function useMenu(initial?: Menu) {
  const qc = useQueryClient();
  useLiveSoldOut(qc);
  return useQuery({
    queryKey: MENU_KEY,
    queryFn: () => api.menu(),
    initialData: initial,
    initialDataUpdatedAt: 0,
    staleTime: 60_000,
  });
}

/** Re-fetch the menu (e.g. after ITEM_SOLD_OUT at checkout, §2.4). */
export const refetchMenu = (qc: QueryClient) => qc.invalidateQueries({ queryKey: MENU_KEY });

/** Active deals and upcoming events (ADDITION §A2). */
export const useDealsEvents = (initial?: DealsEvents) =>
  useQuery({
    queryKey: DEALS_KEY,
    queryFn: () => api.dealsEvents(),
    initialData: initial,
    initialDataUpdatedAt: 0,
    staleTime: 60_000,
  });
