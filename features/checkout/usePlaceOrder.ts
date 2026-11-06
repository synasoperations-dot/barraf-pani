'use client';

import { useMutation } from '@tanstack/react-query';
import { useReducer, useState } from 'react';
import { api } from '@/lib/api';
import { track } from '@/lib/analytics';
import type { PlaceOrderRequest, PlaceOrderResponse } from '@/lib/contracts';
import { useRecentOrders } from '@/features/orders/recent';
import { createCheckoutSession } from './session';

export type PlaceOrderBody = Omit<PlaceOrderRequest, 'turnstileToken'>;

/**
 * Place an order with the checkout session's idempotency key (see ./session.ts).
 * Mount this once in the checkout screen: the key is created right here, on mount.
 * IN_PROGRESS is retried inside lib/api with the same key, so the UI just stays "Placing…".
 */
export function usePlaceOrder() {
  // Lazy initializer = created once when the checkout screen mounts.
  const [session] = useState(() => createCheckoutSession());
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  const mutation = useMutation<PlaceOrderResponse, Error, PlaceOrderBody>({
    mutationFn: (body) => session.submit((key) => api.placeOrder(body, key)),
    onSuccess: ({ order }) => {
      useRecentOrders.getState().add(order.publicToken);
      track('order_placed', {
        orderNumber: order.number,
        total: order.total,
        paymentMethod: order.paymentMethod,
        fulfilment: order.fulfilment,
      });
    },
    onSettled: rerender,
  });

  return {
    ...mutation,
    idempotencyKey: session.key,
    /** IDEMPOTENCY_CONFLICT happened: ask "Your order changed. Start again?" then call confirmNewSession. */
    conflicted: session.conflicted,
    confirmNewSession: () => {
      if (session.confirmNewSession()) {
        mutation.reset();
        rerender();
      }
    },
  };
}
