'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { QuoteRequest } from '@/lib/contracts';

/** Debounce a value (quote requests follow typing in promo / note fields). */
export function useDebounced<T>(value: T, ms = 250) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

/**
 * The server's quote: the ONLY total checkout may show as final (§2.4). Re-fetches whenever the
 * request changes (lines, fulfilment, pin, promo, time, phone); the previous quote stays on screen
 * while the next one loads (`isFetching` drives the skeleton/odometer). Business errors
 * (BELOW_MIN_ORDER, PROMO_*, OUTSIDE_ZONE…) arrive as `error` and are not retried.
 */
export function useQuote(request: QuoteRequest | null) {
  const req = useDebounced(request);
  return useQuery({
    queryKey: ['quote', req],
    queryFn: ({ signal }) => api.cartQuote(req!, signal),
    enabled: req !== null && req.lines.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 0,
    retry: false,
  });
}
