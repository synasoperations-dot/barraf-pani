'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { GeoPoint } from '@/lib/contracts';
import { useDebounced } from '@/features/cart/useQuote';

/** Pin → zone, fee, min order, ETA (POST /api/delivery/quote). OUTSIDE_ZONE arrives as `error`. */
export function useDeliveryQuote(location: GeoPoint | null) {
  const pin = useDebounced(location, 300);
  return useQuery({
    queryKey: ['delivery-quote', pin?.lat, pin?.lng],
    queryFn: () => api.deliveryQuote({ location: pin! }),
    enabled: pin !== null,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 60_000,
  });
}
