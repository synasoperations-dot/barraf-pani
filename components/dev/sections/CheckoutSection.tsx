'use client';

import { useState, type ReactNode } from 'react';
import { BelowMin, QuotePanel } from '@/components/checkout/QuotePanel';
import {
  Notice,
  OtpPanel,
  OutsideZoneCard,
  PickupCard,
  PromoField,
  SlotPicker,
  StepCard,
} from '@/components/checkout/parts';
import { Turnstile } from '@/components/checkout/Turnstile';
import { Button } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { RadioCards } from '@/components/ui/form';
import type { Item, Quote } from '@/lib/contracts';
import type { CartEntry } from '@/stores/cart';
import { Label, Section } from '../guide';

/* Static sample data (never /mocks). */
const LINES: CartEntry[] = [
  {
    key: 'a',
    itemId: 'itm_fillet',
    variantId: 'var_fillet',
    modifierIds: ['mod_garlic'],
    qty: 2,
    note: null,
    snapshot: {
      name: { en: 'Fillet Fury', ur: null },
      size: null,
      option: null,
      unitPrice: 745,
      image: '/images/menu/burger.jpg',
    },
  },
  {
    key: 'b',
    itemId: 'itm_snow',
    variantId: 'var_snow_l',
    modifierIds: [],
    qty: 1,
    note: 'Extra salt',
    snapshot: {
      name: { en: 'Snow Salt Fries', ur: null },
      size: null,
      option: 'large',
      unitPrice: 400,
      image: '/images/menu/fries-long.jpg',
    },
  },
];

const QUOTE: Quote = {
  lines: [
    {
      itemId: 'itm_fillet',
      variantId: 'var_fillet',
      name: { en: 'Fillet Fury', ur: null },
      variantName: 'Regular',
      size: null,
      option: null,
      modifiers: [{ id: 'mod_garlic', name: { en: 'Garlic Mayo', ur: null }, price: 50 }],
      unitPrice: 745,
      qty: 2,
      lineTotal: 1490,
      note: null,
    },
    {
      itemId: 'itm_snow',
      variantId: 'var_snow_l',
      name: { en: 'Snow Salt Fries', ur: null },
      variantName: 'Large',
      size: null,
      option: 'large',
      modifiers: [],
      unitPrice: 400,
      qty: 1,
      lineTotal: 400,
      note: 'Extra salt',
    },
  ],
  subtotal: 1890,
  deliveryFee: 100,
  discount: 189,
  tax: 0,
  tip: 0,
  total: 1801,
  minOrder: 500,
  etaMinutes: 55,
  zone: { id: 'zn_inner', name: 'Inner Jhang' },
  promo: { code: 'MOCK10', discount: 189 },
  requiresOtp: false,
  cod: { allowed: true, reason: null },
  cartHash: 'demo',
  quotedAt: '2026-11-06T12:00:00+05:00',
};

const item = (id: string, name: string): Item =>
  ({ id, name: { en: name, ur: null } }) as unknown as Item; // display-only sample

const QUICK = [
  { item: item('itm_dip', 'Garlic Mayo Dip'), price: 100 },
  { item: item('itm_side', 'Coleslaw'), price: 150 },
  { item: item('itm_fries', 'Masala Fries'), price: 250 },
];

const DAYS = [
  {
    date: '2026-11-06',
    slots: ['2026-11-06T13:00:00.000Z', '2026-11-06T13:30:00.000Z', '2026-11-06T14:00:00.000Z'],
  },
  { date: '2026-11-07', slots: ['2026-11-07T07:00:00.000Z', '2026-11-07T07:30:00.000Z'] },
  { date: '2026-11-08', slots: ['2026-11-08T07:00:00.000Z'] },
];

const noop = () => {};

export function CheckoutSection() {
  const [slot, setSlot] = useState<string | null>(DAYS[0]!.slots[1]!);
  const [chip, setChip] = useState<string | null>('b');
  const [pay, setPay] = useState<'cod' | 'jazzcash' | 'easypaisa' | null>('jazzcash');
  const panel = (problem?: ReactNode, soldOut: string[] = [], fetching = false) => (
    <QuotePanel
      lines={LINES}
      quote={problem === undefined ? QUOTE : null}
      fetching={fetching}
      fulfilment="delivery"
      soldOutIds={soldOut}
      replaceHref={() => '/menu#burgers'}
      onRemove={noop}
      onEditCart={noop}
      problem={problem}
    />
  );

  return (
    <Section
      id="checkout"
      title="Checkout"
      note="/checkout pieces in every state. CheckoutScreen wires them to the quote, OTP and place-order hooks."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <Label>ChoiceChips (components/ui): native radios</Label>
          <ChoiceChips
            legend="Pick one"
            value={chip}
            onChange={setChip}
            options={[
              { value: 'a', label: 'Fri', sub: '7 Nov' },
              { value: 'b', label: 'Sat', sub: '8 Nov' },
              { value: 'c', label: 'Sun', sub: '9 Nov', disabled: true },
            ]}
          />
        </div>
        <div>
          <Label>StepCard (numbered sticker step)</Label>
          <StepCard n={1} title="Contact">
            <p className="text-muted">Step content…</p>
          </StepCard>
        </div>

        <div className="space-y-3">
          <Label>Notice: error / info / with actions</Label>
          <Notice>Something in your cart just sold out. We highlighted it.</Notice>
          <Notice tone="info">We&apos;re closed right now, so this one&apos;s a pre-order.</Notice>
          <Notice
            title="You're offline"
            action={
              <Button size="sm" variant="secondary">
                Try again
              </Button>
            }
          >
            Your order is safe on this page. It won&apos;t be sent twice.
          </Notice>
        </div>
        <div className="space-y-3">
          <Label>OUTSIDE_ZONE · Pickup store card</Label>
          <OutsideZoneCard onPickup={noop} />
          <PickupCard etaMinutes={20} phone="+920000000000" />
        </div>

        <div>
          <Label>SlotPicker (preorderSlots → day + time chips)</Label>
          <SlotPicker
            days={DAYS}
            value={slot}
            onChange={setSlot}
            today="2026-11-06"
            tomorrow="2026-11-07"
          />
        </div>
        <div>
          <Label>Payment: COD blocked (preorder_too_far), online on</Label>
          <RadioCards
            legend="How will you pay?"
            value={pay}
            onChange={setPay}
            options={[
              {
                value: 'cod',
                label: 'Cash on delivery',
                description:
                  'Cash on delivery works for orders up to 2 hours ahead. Pay online or pick a sooner time.',
                disabled: true,
              },
              { value: 'jazzcash', label: 'JazzCash', description: 'Pay online now' },
              { value: 'easypaisa', label: 'Easypaisa', description: 'Pay online now' },
            ]}
          />
        </div>

        <div className="space-y-3">
          <Label>OTP: idle · sent (resend timer) · wrong code · locked · verified</Label>
          <OtpPanel
            phone="0300 1234567"
            sent={false}
            verified={false}
            sending={false}
            verifying={false}
            resendIn={0}
            lockedFor={0}
            error={null}
            onSend={noop}
            onVerify={noop}
          />
          <OtpPanel
            phone="0300 1234567"
            sent
            verified={false}
            sending={false}
            verifying={false}
            resendIn={24}
            lockedFor={0}
            error="That code isn't right. Check it and try again."
            onSend={noop}
            onVerify={noop}
          />
          <OtpPanel
            phone="0300 1234567"
            sent={false}
            verified={false}
            sending={false}
            verifying={false}
            resendIn={0}
            lockedFor={538}
            error={null}
            onSend={noop}
            onVerify={noop}
          />
          <OtpPanel
            phone="0300 1234567"
            sent
            verified
            sending={false}
            verifying={false}
            resendIn={0}
            lockedFor={0}
            error={null}
            onSend={noop}
            onVerify={noop}
          />
        </div>
        <div className="space-y-3">
          <Label>Promo: empty · applied · PROMO_EXPIRED</Label>
          <PromoField applied={null} discount={null} error={null} onApply={noop} onRemove={noop} />
          <PromoField applied="MOCK10" discount={189} error={null} onApply={noop} onRemove={noop} />
          <PromoField
            applied="MOCKOLD"
            discount={null}
            error="That code has expired."
            onApply={noop}
            onRemove={noop}
          />
          <Label>Turnstile (no key / mocks)</Label>
          <Turnstile />
        </div>

        <div>
          <Label>Quote panel: server totals (promo applied)</Label>
          {panel()}
        </div>
        <div>
          <Label>Quote panel: re-quoting (Odometer dims)</Label>
          {panel(undefined, [], true)}
        </div>
        <div>
          <Label>Quote panel: loading (no quote yet)</Label>
          {panel(null)}
        </div>
        <div>
          <Label>BELOW_MIN_ORDER with quick adds</Label>
          {panel(<BelowMin shortBy={3110} minOrder={5000} items={QUICK} onAdd={noop} />)}
        </div>
        <div>
          <Label>ITEM_SOLD_OUT: line highlighted, remove or swap</Label>
          {panel(<Notice>Something in your cart just sold out. We highlighted it.</Notice>, [
            'itm_fillet',
          ])}
        </div>
        <div>
          <Label>No pin yet (delivery)</Label>
          {panel(
            <Notice tone="info">Drop your pin to see the delivery fee and your total.</Notice>,
          )}
        </div>
      </div>
    </Section>
  );
}
