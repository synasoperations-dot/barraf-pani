'use client';

import { useQuery } from '@tanstack/react-query';
import { api, isApiError } from '@/lib/api';

/** The signed-in customer, or null for a guest (UNAUTHENTICATED is not an error here). */
export const useMe = () =>
  useQuery({
    queryKey: ['me'],
    queryFn: () =>
      api.me().catch((e: unknown) => {
        if (isApiError(e) && e.code === 'UNAUTHENTICATED') return null;
        throw e;
      }),
    staleTime: 60_000,
  });

/** Saved addresses (only when logged in). Invalidated with ['me'] after OTP verify. */
export const useAddresses = (enabled: boolean) =>
  useQuery({
    queryKey: ['me', 'addresses'],
    queryFn: () => api.addresses(),
    enabled,
    staleTime: 60_000,
  });
