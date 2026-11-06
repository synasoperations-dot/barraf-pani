'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '@/lib/api';
import type { BookingRequest } from '@/lib/contracts';
import { subscribeToBooking } from '@/lib/realtime';

export const bookingKey = (token: string) => ['booking', token] as const;

/** POST /api/bookings with the sheet's idempotency key (created on open, reused on retry). */
export function useCreateBooking(idempotencyKey: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<BookingRequest, 'turnstileToken'>) =>
      api.createBooking(body, idempotencyKey),
    onSuccess: (b) => qc.setQueryData(bookingKey(b.publicToken), b),
  });
}

/** Booking status, kept live over realtime (polling fallback is built into lib/realtime). */
export function useBooking(token: string) {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: bookingKey(token),
    queryFn: () => api.booking(token),
    staleTime: 10_000,
  });
  useEffect(
    () => subscribeToBooking(token, (b) => qc.setQueryData(bookingKey(token), b)),
    [token, qc],
  );
  return q;
}
