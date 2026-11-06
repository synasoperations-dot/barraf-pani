'use client';

// Dev-only tool: labels here are hard-coded English (not shipped to customers).

import { useState } from 'react';
import { CancelOrder } from '@/components/tracking/CancelOrder';
import { ComicStrip } from '@/components/tracking/ComicStrip';
import { OrderList } from '@/components/tracking/FindMyOrder';
import { BoltRating, ReviewPanel } from '@/components/tracking/Review';
import { ReconnectingBanner, RiderCard, SpecialScreen } from '@/components/tracking/screens';
import { TrackHeader } from '@/components/tracking/TrackHeader';
import { NotFound } from '@/components/tracking/TrackingView';
import { TrackingSkeleton } from '@/components/tracking/TrackingSkeleton';
import { ErrorState } from '@/components/ui/states';
import type { Fulfilment, Order, OrderStatus } from '@/lib/contracts';
import { Label, Section } from '../guide';

const T0 = '2026-11-06T19:30:00+05:00';
const soon = new Date(Date.now() + 14 * 60_000).toISOString();
const past = new Date(Date.now() - 60_000).toISOString();

function sample(
  status: OrderStatus,
  extra: Partial<Order> & { fulfilment?: Fulfilment } = {},
): Order {
  return {
    publicToken: `demo${status}`.padEnd(32, 'x').slice(0, 32),
    number: 'BP-1042',
    status,
    source: 'website',
    fulfilment: 'delivery',
    paymentMethod: 'cod',
    paymentStatus: 'unpaid',
    lines: [
      {
        itemId: 'item_demo',
        variantId: 'var_demo',
        name: { en: 'Demo Burger', ur: null },
        variantName: 'Regular',
        size: null,
        option: null,
        modifiers: [],
        unitPrice: 650,
        qty: 2,
        lineTotal: 1300,
        note: null,
      },
    ],
    subtotal: 1300,
    deliveryFee: 100,
    discount: 0,
    tax: 0,
    tip: 0,
    total: 1400,
    address: null,
    customerNote: null,
    scheduledFor: null,
    estimatedReadyAt: soon,
    estimatedDeliveryAt: soon,
    canCancel: status === 'placed',
    createdAt: T0,
    events: [{ status, at: T0, note: null }],
    rider: null,
    releasesAt: null,
    review: null,
    ...extra,
  };
}

const RIDER = { name: 'Bilal', phone: '+923001234567' };
const note = (status: OrderStatus, n: string) => ({ events: [{ status, at: T0, note: n }] });

const STRIPS: [string, Order][] = [
  ['placed (receipt bobs)', sample('placed')],
  ['accepted (stamped)', sample('accepted')],
  ['preparing (flame + halftone)', sample('preparing')],
  ['ready · delivery (packed)', sample('ready')],
  ['out_for_delivery (rider rides)', sample('out_for_delivery', { rider: RIDER })],
  ['delivered', sample('delivered')],
  ['ready · pickup (at the counter)', sample('ready', { fulfilment: 'pickup' })],
  ['picked_up', sample('picked_up', { fulfilment: 'pickup' })],
];

const SCREENS = [
  [
    'scheduled pre-order',
    'scheduled',
    sample('placed', { scheduledFor: '2026-11-06T20:30:00+05:00', releasesAt: T0 }),
  ],
  ['pending_payment', 'pending_payment', sample('pending_payment', { paymentMethod: 'jazzcash' })],
  ['payment_failed', 'payment_failed', sample('payment_failed', { paymentMethod: 'jazzcash' })],
  ['expired', 'expired', sample('expired', { paymentMethod: 'easypaisa' })],
  [
    'rejected (kitchen note)',
    'rejected',
    sample('rejected', note('rejected', 'Kitchen is too busy right now')),
  ],
  [
    'auto-rejected (8 min)',
    'auto_rejected',
    sample('rejected', note('rejected', 'Auto-rejected: not accepted within 8 minutes')),
  ],
  [
    'cancelled (paid online)',
    'cancelled',
    sample('cancelled', {
      paymentMethod: 'jazzcash',
      paymentStatus: 'paid',
      ...note('cancelled', 'Ordered by mistake'),
    }),
  ],
] as const;

export function TrackingSection() {
  const [rating, setRating] = useState<number | null>(null);
  return (
    <Section
      id="tracking"
      title="Tracking"
      note="/track/[token] comic strip, special screens, rider card, cancel, review; /track Find my order. Motion is off under reduced motion."
    >
      <div className="flex flex-col gap-12">
        <div>
          <Label>Header · ETA counting down / staff WhatsApp order / ETA passed</Label>
          <div className="flex flex-col gap-6">
            <TrackHeader order={sample('preparing')} />
            <TrackHeader order={sample('out_for_delivery', { source: 'whatsapp' })} />
            <TrackHeader order={sample('accepted', { estimatedDeliveryAt: past })} />
          </div>
        </div>

        <div>
          <Label>Reconnecting banner (connection === polling)</Label>
          <ReconnectingBanner />
        </div>

        {STRIPS.map(([label, o]) => (
          <div key={label}>
            <Label>Comic strip · {label}</Label>
            <ComicStrip order={o} />
          </div>
        ))}

        <div>
          <Label>Rider card · cancel (opens the confirm Sheet; demo token → error state)</Label>
          <div className="flex flex-col items-start gap-4">
            <RiderCard rider={RIDER} />
            <CancelOrder token={'demo'.padEnd(32, 'x')} shopPhone="+920000000000" canCancel />
          </div>
        </div>

        {SCREENS.map(([label, screen, o]) => (
          <div key={label}>
            <Label>Screen · {label}</Label>
            <SpecialScreen screen={screen} order={o} shopPhone="+920000000000" />
          </div>
        ))}

        <div>
          <Label>Bolt rating · empty → pick / read-only 5</Label>
          <div className="flex flex-wrap gap-10">
            <BoltRating value={rating} onChange={setRating} />
            <BoltRating value={5} onChange={() => {}} disabled />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <Label>Review · form</Label>
            <ReviewPanel order={sample('delivered')} />
          </div>
          <div>
            <Label>Review · thank-you (rating 5; Google button hidden while URL is null)</Label>
            <ReviewPanel
              order={sample('picked_up', {
                fulfilment: 'pickup',
                review: { rating: 5, comment: null },
              })}
            />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <Label>Find my order · receipt cards</Label>
            <OrderList
              orders={[
                sample('out_for_delivery'),
                sample('delivered', { number: 'BP-1039', total: 2150, subtotal: 2050 }),
              ]}
            />
          </div>
          <div>
            <Label>Not found / error / offline</Label>
            <NotFound />
            <ErrorState onRetry={() => {}} />
            <ErrorState offline onRetry={() => {}} />
          </div>
        </div>

        <div>
          <Label>Loading skeleton strip (also slow_3g)</Label>
          <TrackingSkeleton />
        </div>
      </div>
    </Section>
  );
}
