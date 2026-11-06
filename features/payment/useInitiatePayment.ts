'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { api, newIdempotencyKey } from '@/lib/api';
import type { OnlineProvider } from '@/lib/contracts';
import { rememberExpiry } from './payView';

/**
 * Start (or resume) the online payment for an order. The idempotency key is created on mount
 * and reused for every retry; the server also reuses an existing pending payment (§4.3 step 2).
 */
export function useInitiatePayment(token: string, provider: OnlineProvider) {
  const [key] = useState(newIdempotencyKey);
  return useMutation({
    mutationFn: () => api.initiatePayment(provider, { orderToken: token }, key),
    onSuccess: (p) => rememberExpiry(token, p.expiresAt),
    retry: false,
  });
}
