'use client';

// Dev-only tool: labels here are hard-coded English (not shipped to customers).

import { useState } from 'react';
import { AddressCard, AddressSheet, LabelIcon } from '@/components/account/AddressBook';
import { HistoryCard, HistorySkeleton, ReorderReview } from '@/components/account/OrderHistory';
import { ProfileForm } from '@/components/account/ProfileScreen';
import { DroppedBucket, NotFoundScreen, SystemScreen } from '@/components/site/SystemScreens';
import { Button } from '@/components/ui/Button';
import { Bolt } from '@/components/ui/motifs';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { Card } from '@/components/ui/surfaces';
import type { Address, Customer, Order, QuotedLine } from '@/lib/contracts';
import type { ReorderPlan } from '@/features/orders/reorder';
import { Label, Section } from '../guide';

const noop = () => {};
const T0 = '2026-11-03T20:15:00+05:00';

const line = (name: string, unitPrice: number, qty = 1): QuotedLine => ({
  itemId: `itm_${name}`,
  variantId: `itm_${name}__std`,
  name: { en: name, ur: null },
  variantName: 'Standard',
  size: null,
  option: null,
  modifiers: [],
  unitPrice,
  qty,
  lineTotal: unitPrice * qty,
  note: null,
});

const ORDER = {
  publicToken: 'demoaccountxxxxxxxxxxxxxxxxxxxx1',
  number: 'BP-1039',
  status: 'picked_up',
  createdAt: T0,
  total: 1645,
  lines: [line('Crunch Kick', 450, 2), line('Masala Fries', 250), line('Ranch Dip', 95, 5)],
} as unknown as Order;

const ME: Customer = {
  id: 'cus_demo',
  phone: '+923001234567',
  name: 'Ayesha',
  phoneVerifiedAt: T0,
  preferredLang: 'en',
  whatsappOptIn: true,
  whatsappOptInAt: T0,
  whatsappOptInSource: 'account',
  codAllowed: true,
  createdAt: T0,
};

const ADDRESSES: Address[] = [
  {
    id: 'a1',
    label: 'home',
    line1: 'House 12, Street 4',
    area: 'Paradise City',
    landmark: 'Opposite the mosque, green gate',
    location: { lat: 31.27, lng: 72.318 },
    isDefault: true,
  },
  {
    id: 'a2',
    label: 'work',
    line1: 'Shop 3, Main Bazaar',
    area: 'Jhang Sadar',
    landmark: null,
    location: { lat: 31.266, lng: 72.32 },
    isDefault: false,
  },
];

const PLAN: ReorderPlan = {
  add: [
    {
      itemId: 'itm_crunch-kick',
      variantId: 'itm_crunch-kick__std',
      modifierIds: [],
      qty: 2,
      note: null,
      snapshot: {
        name: { en: 'Crunch Kick', ur: null },
        size: null,
        option: null,
        unitPrice: 450,
        image: null,
      },
    },
  ],
  issues: [
    { kind: 'sold_out', line: line('Fillet Fury', 495) },
    { kind: 'inactive', line: line('Retired Classic', 300) },
    { kind: 'price_changed', line: line('Crunch Kick', 400, 2), was: 400, now: 450 },
  ],
};

export function AccountSection() {
  const [review, setReview] = useState(false);
  const [sheet, setSheet] = useState<Address | 'new' | null>(null);
  return (
    <>
      <Section
        id="account"
        title="Accounts"
        note="Phone-OTP login (/login), profile with WhatsApp opt-in (off by default; time + source recorded), order history with one-tap Reorder that re-validates against the menu, saved addresses with one default and a zone check on save. Try ?scenario=account_demo, log in with any 03XX number, code 123456."
      >
        <div className="grid gap-10 lg:grid-cols-2">
          <div>
            <Label>Profile (opted in)</Label>
            <ProfileForm me={ME} />
          </div>
          <div className="flex flex-col gap-6">
            <div>
              <Label>History card</Label>
              <HistoryCard order={ORDER} onReorder={() => setReview(true)} />
            </div>
            <div>
              <Label>Reorder review (sold out · inactive · price changed)</Label>
              <Button variant="secondary" onClick={() => setReview(true)}>
                Open review sheet
              </Button>
              <ReorderReview
                plan={review ? PLAN : null}
                onClose={() => setReview(false)}
                onConfirm={() => setReview(false)}
              />
            </div>
            <div>
              <Label>History loading / empty</Label>
              <HistorySkeleton />
              <Card className="mt-4 p-2">
                <EmptyState title="No orders yet" body="Your first Fillet Fury is one tap away." />
              </Card>
            </div>
          </div>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          <div>
            <Label>Address cards (default first)</Label>
            <div className="grid gap-5">
              {ADDRESSES.map((a) => (
                <AddressCard
                  key={a.id}
                  address={a}
                  onEdit={() => setSheet(a)}
                  onDelete={noop}
                  onDefault={noop}
                />
              ))}
            </div>
          </div>
          <div>
            <Label>
              Label icons + add/edit sheet (zone check on save; OUTSIDE_ZONE = &quot;Save
              anyway&quot;)
            </Label>
            <div className="mb-4 flex gap-4">
              <LabelIcon label="home" />
              <LabelIcon label="work" />
              <LabelIcon label="other" />
            </div>
            <Button onClick={() => setSheet('new')}>Open address sheet</Button>
            {sheet && (
              <AddressSheet
                address={sheet === 'new' ? null : sheet}
                onClose={() => setSheet(null)}
              />
            )}
          </div>
        </div>
      </Section>

      <Section
        id="system"
        title="System states"
        note="404 (app/not-found.tsx), error boundary ((site)/error.tsx; global-error.tsx is the same frame without providers), the offline strip, and the maintenance page (MAINTENANCE_MODE=true → proxy.ts rewrites every page)."
      >
        <div className="grid gap-8">
          <Card className="overflow-hidden p-0">
            <NotFoundScreen
              t={{
                title: 'This page got eaten.',
                body: "Whatever was here, someone hungry got to it first. The menu's still full though.",
                menu: 'Back to the menu',
                home: 'Home',
                art: 'A fries bucket dropped on the floor',
              }}
            />
          </Card>
          <Card className="overflow-hidden p-0">
            <SystemScreen
              title="Something burned in the kitchen"
              body="That's on us. Try again, or message us on WhatsApp and we'll sort your order out."
              actions={
                <>
                  <Button size="lg">Try again</Button>
                  <Button size="lg" variant="whatsapp">
                    Order on WhatsApp
                  </Button>
                </>
              }
            />
          </Card>
          <div>
            <Label>Offline strip</Label>
            <div className="border-3 border-ink bg-ink px-4 py-2.5 text-white">
              <p className="flex items-center justify-center gap-2 font-bold">
                <Bolt size={18} />
                You&apos;re offline. The menu still works; ordering waits until you&apos;re back.
              </p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label>Dropped bucket art</Label>
              <DroppedBucket
                label="A fries bucket dropped on the floor"
                className="w-full max-w-sm"
              />
            </div>
            <div>
              <Label>Inline error</Label>
              <ErrorState onRetry={noop} />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
