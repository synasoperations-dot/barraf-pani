'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

/** Open / closed / paused. Short cache (~30 s) per ARCHITECTURE §2.1. */
export const useStoreStatus = () =>
  useQuery({
    queryKey: ['store', 'status'],
    queryFn: api.storeStatus,
    staleTime: 30_000,
    refetchInterval: 30_000,
  });
