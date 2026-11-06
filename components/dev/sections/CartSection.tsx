'use client';

import { useState } from 'react';
import { CartLineView, UndoPill, type CartLineViewProps } from '@/components/cart/CartLine';
import { CheckoutCta, type CtaState } from '@/components/cart/CheckoutCta';
import { EmptyCart } from '@/components/cart/EmptyCart';
import { DipsCarousel, FriesNudge } from '@/components/cart/Nudges';
import { PromoField, type PromoStatus } from '@/components/cart/PromoField';
import { toast } from '@/components/ui/Toast';
import { Label, Section } from '../guide';

const noop = () => {};

const LINE: CartLineViewProps = {
  name: 'Fillet Fury',
  variant: '',
  modifiers: [],
  note: null,
  image: '/images/menu/burger.jpg',
  qty: 1,
  lineTotal: 895,
  soldOut: false,
  replaceHref: '/menu#burgers',
  onQty: noop,
  onRemove: () => toast('Removed (demo)'),
};

const LINES: [string, Partial<CartLineViewProps>][] = [
  ['Default (swipe it on touch)', {}],
  [
    'Variant + add-ons + note',
    {
      name: 'Snow Salt Fries',
      variant: 'Large',
      modifiers: ['Ranch', 'Chipotle'],
      note: 'Extra crispy',
      image: '/images/menu/fries-bucket.jpg',
      qty: 2,
      lineTotal: 1180,
    },
  ],
  ['No photo (dips / sides)', { name: 'Garlic Mayo', image: null, lineTotal: 95 }],
  ['Sold out (live flip / server flag)', { soldOut: true }],
];

const DIPS = [
  ['ranch', 'Ranch', 95],
  ['chipotle', 'Chipotle', 95],
  ['garlic-mayo', 'Garlic Mayo', 95],
  ['peri-peri', 'Peri Peri', 95],
  ['hot-honey-ranch', 'Hot Honey Ranch', 145],
].map(([id, name, price]) => ({
  id: id as string,
  name: name as string,
  price: price as number,
  image: null,
}));

const PROMOS: [string, PromoStatus, string | null][] = [
  ['No code', { kind: 'none' }, null],
  ['Checking (slow_3g)', { kind: 'checking' }, null],
  ['Applied', { kind: 'applied', discount: 115 }, null],
  ['Applied, savings at checkout (MOCKSHIP on pickup)', { kind: 'applied', discount: 0 }, null],
  ['Replaced another code', { kind: 'applied', discount: 100 }, 'MOCK10'],
  ['Invalid / expired / limit', { kind: 'invalid', message: 'That code has expired.' }, null],
  [
    'Network fail (retry)',
    { kind: 'failed', message: "Couldn't reach us. Check your connection and try again." },
    null,
  ],
  ['Quote failed for another reason (closed…)', { kind: 'later' }, null],
];

const CTAS: [string, CtaState, string | null][] = [
  ['Open', { kind: 'open' }, null],
  ['Below minimum (hint only)', { kind: 'open' }, 'Add Rs 155 more. Minimum order is Rs 500.'],
  ['Closed + pre-orders', { kind: 'preorder' }, null],
  ['Closed, no pre-orders', { kind: 'closed', label: "We're closed. Opens at Fri 12:00 PM" }, null],
  [
    'Paused, no pre-orders',
    { kind: 'closed', label: 'Orders are paused: Kitchen at capacity' },
    null,
  ],
  ['Store status loading (slow_3g)', { kind: 'loading' }, null],
  ['Sold-out line in the cart', { kind: 'blocked' }, null],
];

/**
 * /dev/ui section for the Cart screens: every new component in every state.
 * Rendered at the bottom of components/dev/StyleGuide.tsx.
 */
export function CartSection() {
  const [qty, setQty] = useState(1);
  return (
    <Section
      id="cart"
      title="Cart"
      note="Drawer + /cart share CartContents. Promo validation is the server's (pickup quote); the total is an estimate until checkout."
    >
      <div className="grid gap-10 lg:grid-cols-2">
        <div className="min-w-0 space-y-6">
          {LINES.map(([label, over], i) => (
            <div key={label}>
              <Label>{label}</Label>
              <ul>
                <CartLineView
                  {...LINE}
                  {...over}
                  qty={i === 0 ? qty : (over.qty ?? 1)}
                  onQty={i === 0 ? setQty : noop}
                  lineTotal={i === 0 ? 895 * qty : (over.lineTotal ?? 895)}
                />
              </ul>
            </div>
          ))}
          <div>
            <Label>Undo pill (inside the drawer; /cart uses toast())</Label>
            <UndoPill message="Fillet Fury removed" onUndo={() => toast('Restored (demo)')} />
          </div>
          <div>
            <Label>Nudge: burger, no fries</Label>
            <FriesNudge
              item={{
                id: 'f',
                name: 'Snow Salt Fries',
                price: 250,
                image: '/images/menu/fries-bucket.jpg',
              }}
              onAdd={() => toast('Added · Snow Salt Fries')}
            />
          </div>
          <div>
            <Label>Nudge: no dip</Label>
            <DipsCarousel dips={DIPS} onAdd={(id) => toast(`Added · ${id}`)} />
          </div>
        </div>

        <div className="min-w-0 space-y-6">
          <div className="rounded-card border-3 border-ink bg-white">
            <Label>Empty</Label>
            <EmptyCart />
          </div>
          {PROMOS.map(([label, status, replaced]) => (
            <div key={label}>
              <Label>Promo · {label}</Label>
              <PromoField
                code={status.kind === 'none' ? null : 'MOCK10'}
                status={status}
                replaced={replaced}
                onApply={noop}
                onRemove={noop}
                onRetry={noop}
              />
            </div>
          ))}
          {CTAS.map(([label, state, hint]) => (
            <div key={label} className="rounded-card border-3 border-ink bg-white p-4">
              <Label>CTA · {label}</Label>
              <CheckoutCta estimate={1345} state={state} hint={hint} />
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
