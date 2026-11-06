'use client';

// Dev-only tool: labels here are hard-coded English (not shipped to customers).

import { useState } from 'react';
import { ContactSent } from '@/components/contact/ContactForm';
import { HoursTable } from '@/components/contact/ContactPage';
import { BookingSheet } from '@/components/deals/BookingSheet';
import { BookingNotFound, BookingStatusView } from '@/components/deals/BookingStatus';
import { DealCoupon, EventPoster } from '@/components/deals/cards';
import { DealsScreen } from '@/components/deals/DealsPage';
import { Button } from '@/components/ui/Button';
import { useMenu } from '@/features/menu/useMenu';
import type { Booking, BookingStatus, Deal, Event, StoreStatus } from '@/lib/contracts';
import { Label, Section } from '../guide';

const noop = () => {};
const inDays = (d: number, h: number) =>
  new Date(Date.parse('2026-11-06T00:00:00+05:00') + d * 86_400_000 + h * 3_600_000).toISOString();

const deal = (id: string, extra: Partial<Deal>): Deal => ({
  id,
  title: { en: 'Demo Burger + Fries + Dip', ur: null },
  description: null,
  imagePath: '/images/menu/burger.jpg',
  priceLabel: 'Rs 795',
  promoCode: null,
  items: [
    { itemId: 'itm_crunch-kick', variantId: 'itm_crunch-kick__std', modifierIds: [], qty: 1 },
    { itemId: 'itm_masala-fries', variantId: 'itm_masala-fries__regular', modifierIds: [], qty: 2 },
  ],
  validFrom: null,
  validUntil: null,
  isActive: true,
  sortOrder: 0,
  ...extra,
});
const DEALS = [
  deal('d1', { promoCode: 'MOCK10', validUntil: inDays(4, 23) }),
  deal('d2', { title: { en: 'Demo Wings for two', ur: null }, imagePath: null }),
];

const event = (id: string, extra: Partial<Event>): Event => ({
  id,
  title: { en: 'Demo Live match screening', ur: null },
  description: { en: 'Big screen, loud crowd, loaded fries.', ur: null },
  imagePath: null,
  startsAt: inDays(3, 19),
  endsAt: inDays(3, 23),
  bookable: true,
  capacity: 40,
  spotsLeft: 12,
  isActive: true,
  ...extra,
});
const EVENTS = [
  event('e1', {}),
  event('e2', { title: { en: 'Demo Family night', ur: null }, spotsLeft: 0 }),
];

const booking = (status: BookingStatus, declineReason: string | null = null): Booking => ({
  publicToken: `demo${status}`.padEnd(32, 'x').slice(0, 32),
  type: 'table',
  eventId: null,
  date: '2026-11-13',
  time: '20:30',
  guests: 4,
  name: 'Ayesha',
  phone: '+923001234567',
  note: null,
  status,
  declineReason,
  createdAt: '2026-11-06T19:30:00+05:00',
});

const STATUSES: Booking[] = [
  booking('requested'),
  booking('confirmed'),
  booking('declined', 'Fully booked that evening'),
  booking('cancelled'),
  booking('completed'),
  booking('no_show'),
];

const status = {
  openingHours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    opens: '12:00',
    closes: weekday === 0 || weekday >= 5 ? '02:00' : '23:30',
  })),
  holidays: [{ date: '2027-03-23', note: 'Pakistan Day' }],
} as StoreStatus;

export function DealsSection() {
  const { data: menu } = useMenu();
  const [sheet, setSheet] = useState<'table' | 'event' | 'private_event' | null>(null);
  return (
    <Section
      id="deals"
      title="Deals, events & contact"
      note="/deals coupons + event posters + booking sheet, /booking/[token] statuses, /contact hours table and form. Live: ?scenario=deals_demo, booking_confirmed, booking_declined, event_full."
    >
      <div className="flex flex-col gap-12">
        <div>
          <Label>Coupon · with promo code + validity / menu loading</Label>
          <div className="grid gap-8 md:grid-cols-2">
            <DealCoupon deal={DEALS[0]!} menu={menu} onOrder={noop} onCopyCode={noop} />
            <DealCoupon
              deal={DEALS[1]!}
              menu={undefined}
              index={1}
              onOrder={noop}
              onCopyCode={noop}
            />
          </div>
        </div>

        <div>
          <Label>Event poster · open / fully booked</Label>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <EventPoster event={EVENTS[0]!} onBook={() => setSheet('event')} />
            <EventPoster event={EVENTS[1]!} index={1} onBook={noop} />
          </div>
        </div>

        <div>
          <Label>Booking sheet · table / event / private event</Label>
          <div className="flex flex-wrap gap-3">
            <Button variant="ghost" onClick={() => setSheet('table')}>
              Table
            </Button>
            <Button variant="ghost" onClick={() => setSheet('event')}>
              Event
            </Button>
            <Button variant="ghost" onClick={() => setSheet('private_event')}>
              Private event
            </Button>
          </div>
          <BookingSheet
            open={sheet !== null}
            onClose={() => setSheet(null)}
            type={sheet === 'private_event' ? 'private_event' : 'table'}
            event={sheet === 'event' ? EVENTS[0] : null}
          />
        </div>

        <div>
          <Label>Deals page · empty / error / loading</Label>
          <div className="flex flex-col gap-6 overflow-hidden rounded-card border-3 border-ink">
            <DealsScreen data={{ deals: [], events: [] }} menu={menu} />
            <DealsScreen data={undefined} menu={menu} error={new Error('x')} onRetry={noop} />
            <DealsScreen data={undefined} menu={undefined} />
          </div>
        </div>

        <div>
          <Label>Booking status · every status / not found</Label>
          <div className="grid gap-6 md:grid-cols-2">
            {STATUSES.map((b) => (
              <BookingStatusView key={b.status} booking={b} />
            ))}
            <BookingNotFound />
          </div>
        </div>

        <div>
          <Label>Contact · hours table (Fri–Sun past midnight, holiday) / sent</Label>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-card border-3 border-ink bg-white p-5">
              <HoursTable status={status} now={Date.parse('2026-11-06T13:00:00+05:00')} />
            </div>
            <div className="rounded-card border-3 border-ink bg-white p-5">
              <ContactSent phone="+923001234567" reference="MSG-1A2B3C" onAnother={noop} />
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
