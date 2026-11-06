'use client';

import { useState } from 'react';
import { Celebration } from '@/components/receipt/Celebration';
import { OrderMissing } from '@/components/receipt/OrderMissing';
import { ReceiptCard, ReceiptSkeleton } from '@/components/receipt/ReceiptCard';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/states';
import { toast } from '@/components/ui/Toast';
import type { Order } from '@/lib/contracts';
import { Label, Section } from '../guide';

const at = '2026-11-06T19:42:00+05:00';
const ORDER: Order = {
  publicToken: 'demo0000000000000000000000000000',
  number: 'BP-1042',
  status: 'placed',
  source: 'website',
  fulfilment: 'delivery',
  paymentMethod: 'cod',
  paymentStatus: 'unpaid',
  lines: [
    {
      itemId: 'i1',
      variantId: 'v1',
      name: { en: 'Fillet Fury', ur: null },
      variantName: 'Double',
      size: null,
      option: 'double',
      modifiers: [{ id: 'm1', name: { en: 'Extra cheese', ur: null }, price: 100 }],
      unitPrice: 895,
      qty: 2,
      lineTotal: 1790,
      note: 'No onions',
    },
    {
      itemId: 'i2',
      variantId: 'v2',
      name: { en: 'Loaded Fries', ur: null },
      variantName: 'L',
      size: 'L',
      option: null,
      modifiers: [],
      unitPrice: 650,
      qty: 1,
      lineTotal: 650,
      note: null,
    },
  ],
  subtotal: 2440,
  deliveryFee: 150,
  discount: 244,
  tax: 0,
  tip: 0,
  total: 2346,
  address: {
    label: 'Home',
    line1: 'House 12, Street 4',
    area: 'Paradise City',
    landmark: 'Green mosque',
    location: { lat: 31.27, lng: 72.32 },
    recipientName: null,
    recipientPhone: null,
  },
  customerNote: 'Ring twice',
  scheduledFor: null,
  estimatedReadyAt: null,
  estimatedDeliveryAt: null,
  canCancel: true,
  createdAt: at,
  events: [],
  rider: null,
  releasesAt: null,
  review: null,
};

const PICKUP: Order = {
  ...ORDER,
  number: 'BP-1043',
  fulfilment: 'pickup',
  paymentMethod: 'jazzcash',
  paymentStatus: 'paid',
  status: 'preparing',
  deliveryFee: 0,
  discount: 0,
  total: 2440,
  address: null,
  customerNote: null,
  scheduledFor: '2026-11-07T20:30:00+05:00',
};

const demoReorder = () => toast('Reorder (demo)');

/**
 * /dev/ui section for the Receipt screens: every new component in every state.
 * Rendered at the bottom of components/dev/StyleGuide.tsx.
 */
export function ReceiptSection() {
  const [run, setRun] = useState(0);
  return (
    <Section
      id="receipt"
      title="Receipt"
      note="/order/[token]: celebration (once per order, ?placed=1) and the sticker receipt."
    >
      <Label>Celebration (preview box; the real one is a full-screen modal dialog)</Label>
      <Celebration key={run} preview order={ORDER} onDismiss={() => toast('Dismissed (demo)')} />
      <Button variant="ghost" className="mt-4" onClick={() => setRun((n) => n + 1)}>
        Replay
      </Button>

      <div className="mt-10 space-y-10">
        <div>
          <Label>delivery · COD · placed (discount, landmark, note)</Label>
          <ReceiptCard order={ORDER} onReorder={demoReorder} />
        </div>
        <div>
          <Label>pickup · JazzCash paid · scheduled · reorder loading (menu not ready)</Label>
          <ReceiptCard order={PICKUP} onReorder={demoReorder} reorderReady={false} />
        </div>
        <div>
          <Label>pending_payment → link to /pay/return</Label>
          <ReceiptCard
            order={{
              ...PICKUP,
              status: 'pending_payment',
              paymentStatus: 'pending',
              scheduledFor: null,
            }}
            onReorder={demoReorder}
          />
        </div>
        <div>
          <Label>terminal · rejected</Label>
          <ReceiptCard
            order={{ ...ORDER, status: 'rejected', canCancel: false }}
            onReorder={demoReorder}
          />
        </div>
        <div>
          <Label>loading</Label>
          <ReceiptSkeleton />
        </div>
        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <Label>not found</Label>
            <OrderMissing />
          </div>
          <div>
            <Label>offline / error with retry</Label>
            <ErrorState offline onRetry={() => toast('Retry (demo)')} />
          </div>
        </div>
      </div>
    </Section>
  );
}
