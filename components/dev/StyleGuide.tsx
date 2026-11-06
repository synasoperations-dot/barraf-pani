'use client';

// Dev-only tool: copy here is intentionally hard-coded English (not shipped to customers).

import { AnimatePresence, motion, MotionConfig } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LanguageToggle } from '@/components/site/LanguageToggle';
import { Badge } from '@/components/ui/Badge';
import { Button, buttonClasses, type ButtonSize, type ButtonVariant } from '@/components/ui/Button';
import { Drawer, Sheet } from '@/components/ui/Dialog';
import { Countdown } from '@/components/ui/Countdown';
import { Checkbox, Input, RadioCards, TextArea } from '@/components/ui/form';
import { MapPinPicker } from '@/components/ui/MapPinPicker';
import { OtpInput } from '@/components/ui/OtpInput';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { SourceTag, StatusTag } from '@/components/ui/StatusTag';
import { Logo, Wordmark } from '@/components/ui/Logo';
import {
  Blob,
  Bolt,
  BoltPair,
  GridPaper,
  Halftone,
  Rings,
  Wave,
  type WavePreset,
} from '@/components/ui/motifs';
import { Odometer } from '@/components/ui/Odometer';
import { PriceChip } from '@/components/ui/PriceChip';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { EmptyState, ErrorState, Skeleton, Tag } from '@/components/ui/states';
import { StickerHeading } from '@/components/ui/StickerHeading';
import { Stepper } from '@/components/ui/Stepper';
import { Card, MenuBoard, Panel } from '@/components/ui/surfaces';
import { toast } from '@/components/ui/Toast';
import { OrderSource, OrderStatus, type GeoPoint } from '@/lib/contracts';
import { bump, flyToCart, pop, stagger, staggerItem, stamp, CART_BUMP_EVENT } from '@/lib/motion';
import { Label, Section } from './guide';
import { HomeSection } from './sections/HomeSection';
import { MenuSection } from './sections/MenuSection';
import { ItemSection } from './sections/ItemSection';
import { CartSection } from './sections/CartSection';
import { CheckoutSection } from './sections/CheckoutSection';
import { PaymentSection } from './sections/PaymentSection';
import { ReceiptSection } from './sections/ReceiptSection';
import { TrackingSection } from './sections/TrackingSection';

/* ---------- Layout helpers ---------- */

/* ---------- Tokens ---------- */

const COLORS = [
  ['blue', 'Primary panel, hero, active toggles'],
  ['blue-deep', 'Links, small labels on white'],
  ['blue-light', '"BARRAF" wordmark, links on dark'],
  ['orange', 'Primary CTA, alternating panels'],
  ['orange-deep', 'Inner panel'],
  ['orange-blob', 'Decorative circles on orange'],
  ['yellow', 'Bolts, "PAANI", highlights, secondary CTA'],
  ['ink', 'Outlines, shadows, body text, footer'],
  ['paper', 'Page background'],
  ['grid-line', 'Grid-paper lines'],
  ['muted', 'Secondary text on light (4.5:1)'],
  ['whatsapp', 'WhatsApp buttons only'],
  ['white', 'Stickers, cards, text on panels'],
] as const;

function Swatch({ name, use }: { name: string; use: string }) {
  // Read the live token value straight into the DOM (keeps hex literals out of the code).
  const readHex = (el: HTMLElement | null) => {
    if (el)
      el.textContent = getComputedStyle(document.documentElement)
        .getPropertyValue(`--color-${name}`)
        .trim()
        .toUpperCase();
  };
  return (
    <div className="overflow-hidden rounded-card border-3 border-ink bg-white shadow-hard-sm">
      <div className="h-20 border-b-3 border-ink" style={{ background: `var(--color-${name})` }} />
      <div className="p-3">
        <p className="font-mono text-sm font-bold">{name}</p>
        <p ref={readHex} className="font-mono text-xs text-muted" />
        <p className="mt-1 text-xs">{use}</p>
      </div>
    </div>
  );
}

/* ---------- Demo data (real menu items/prices, hard-coded for the guide) ---------- */

const FRIES = [
  {
    name: 'Snow Salt Fries',
    prices: [
      ['Regular', 250],
      ['Large', 400],
    ],
  },
  {
    name: 'Masala Fries',
    prices: [
      ['Regular', 250],
      ['Large', 400],
    ],
  },
  {
    name: 'Arctic Heat Fries',
    prices: [
      ['Regular', 300],
      ['Large', 500],
    ],
  },
  { name: 'Long Fries', prices: [['', 450]] },
] as const;

const LOADED = [
  ['Cheese Meltdown', 545],
  ['Pizza Party', 650],
  ['Crunch Attack', 650],
  ['Fire on Fries', 650],
] as const;

/* ---------- Page ---------- */

export function StyleGuide() {
  const [fulfilment, setFulfilment] = useState<'delivery' | 'pickup'>('delivery');
  const [qty, setQty] = useState(2);
  const [chip, setChip] = useState<string | null>('L-a');
  const [sheet, setSheet] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [badge, setBadge] = useState(3);
  const [bumpKey, setBumpKey] = useState(0);
  const [replay, setReplay] = useState(0);
  const [total, setTotal] = useState(1895);
  const [pay, setPay] = useState<'cod' | 'jazzcash' | 'easypaisa'>('cod');
  const [optIn, setOptIn] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);
  const [otp, setOtp] = useState('');
  const [pin, setPin] = useState<GeoPoint | null>(null);
  const [deadline] = useState(() => new Date(Date.now() + 8 * 60_000).toISOString());
  const flyTarget = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const on = () => setBumpKey((n) => n + 1);
    window.addEventListener(CART_BUMP_EVENT, on);
    return () => window.removeEventListener(CART_BUMP_EVENT, on);
  }, []);

  const nav = [
    'colors',
    'type',
    'shape',
    'motifs',
    'buttons',
    'chips',
    'surfaces',
    'overlays',
    'forms',
    'staff',
    'states',
    'motion',
  ];

  return (
    <MotionConfig reducedMotion="user">
      <GridPaper className="min-h-dvh">
        {/* Hero */}
        <Rings className="border-b-3 border-ink px-4 py-14">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center">
            <Logo size={120} label="Barraf Paani" />
            <h1 className="font-display text-5xl text-white headline md:text-7xl">Design system</h1>
            <p className="rounded-sticker border-3 border-ink bg-white px-4 py-2 font-medium shadow-hard-sm">
              Every token, motif and component, in every state. Source: docs/DESIGN.md
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/" className={buttonClasses({ variant: 'ghost', size: 'sm' })}>
                See the site shell
              </Link>
              <LanguageToggle />
            </div>
          </div>
        </Rings>

        <div className="mx-auto max-w-6xl px-4 pb-24">
          <nav aria-label="Sections" className="flex flex-wrap gap-2 py-6">
            {nav.map((n) => (
              <a
                key={n}
                href={`#${n}`}
                className="rounded-chip border-2 border-ink bg-white px-3 py-1 text-sm font-bold capitalize hover:bg-yellow"
              >
                {n}
              </a>
            ))}
          </nav>

          {/* Colours */}
          <Section
            id="colors"
            title="Colour"
            note="Only these tokens exist; Tailwind's default palette is cleared and ESLint rejects hex literals."
          >
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {COLORS.map(([name, use]) => (
                <Swatch key={name} name={name} use={use} />
              ))}
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <Panel tone="orange">
                <p className="font-price text-3xl text-white uppercase">
                  White on orange: 24px+ only
                </p>
                <p className="mt-2 text-sm text-ink">Small text on orange is ink.</p>
              </Panel>
              <Panel tone="blue">
                <p className="font-price text-3xl text-white uppercase">
                  White on blue: 24px+ only
                </p>
                <p className="mt-2 text-sm text-ink">Small text on blue is ink.</p>
              </Panel>
            </div>
          </Section>

          {/* Type */}
          <Section
            id="type"
            title="Type"
            note="Self-hosted via next/font. Lilita One 400 · Poppins 800/900 · Bebas Neue 400 · DM Sans 400/500/700 · Urdu: Noto Nastaliq Urdu + Lalezar."
          >
            <div className="space-y-8">
              <div>
                <Label>Display: Lilita One + 3px stroke + 5px hard shadow</Label>
                <p className="font-display text-6xl text-yellow headline md:text-8xl">
                  Made fresh. Served furious.
                </p>
              </div>
              <div>
                <Label>Sticker heading: Poppins 900</Label>
                <p className="font-sticker text-5xl font-black">Fries · Burgers · Wings</p>
              </div>
              <div>
                <Label>Item names & prices: Bebas Neue, uppercase, 0.02em</Label>
                <p className="font-price text-4xl tracking-[0.02em] uppercase">
                  Philly Cheesesteak Fries <span className="text-orange-deep">Rs 850</span>
                </p>
              </div>
              <div>
                <Label>Body: DM Sans 400 / 500 / 700</Label>
                <p className="max-w-xl text-lg">
                  Short, punchy, confident.{' '}
                  <span className="font-medium">Medium for emphasis,</span>{' '}
                  <span className="font-bold">bold for labels.</span>{' '}
                  <span className="text-muted">Muted for helper text.</span>
                </p>
              </div>
              <div
                lang="ur"
                dir="rtl"
                className="rounded-card border-3 border-dashed border-ink bg-white p-4"
              >
                <Label>Urdu (fonts load when the locale is اردو, line-height 1.9)</Label>
                <p className="font-display text-4xl">آج کیا کھانے کا دل ہے؟</p>
                <p className="text-lg leading-[1.9]">
                  فرائز، برگر، ونگز، ریپس اور پیزا۔ پیراڈائز سٹی، جھنگ۔
                </p>
              </div>
            </div>
          </Section>

          {/* Shape */}
          <Section
            id="shape"
            title="Shape & depth"
            note="3px ink outlines (2px on small chips). Hard offset shadows only, never blurred."
          >
            <Label>Shadows</Label>
            <div className="mb-10 flex flex-wrap gap-8">
              {(
                [
                  ['shadow-hard-sm', '3px small'],
                  ['shadow-hard', '4px buttons'],
                  ['shadow-hard-md', '6px cards'],
                  ['shadow-hard-lg', '8px boards'],
                  ['shadow-sticker', '0 6px sticker'],
                  ['shadow-hard-orange', 'cart bar'],
                ] as const
              ).map(([cls, label]) => (
                <div
                  key={cls}
                  className={`grid size-28 place-items-center rounded-card border-3 border-ink bg-white p-2 text-center text-xs font-bold ${cls}`}
                >
                  {label}
                </div>
              ))}
            </div>
            <Label>Radius</Label>
            <div className="flex flex-wrap items-end gap-6">
              {(
                [
                  ['rounded-chip', '10 chip'],
                  ['rounded-sticker', '12 sticker'],
                  ['rounded-input', '14 input'],
                  ['rounded-button', '16 button'],
                  ['rounded-card', '22 card'],
                  ['rounded-panel', '28 panel'],
                  ['rounded-full', '999 pill'],
                ] as const
              ).map(([cls, label]) => (
                <div key={cls} className="text-center">
                  <div className={`size-20 border-3 border-ink bg-blue-light ${cls}`} />
                  <p className="mt-1 font-mono text-xs">{label}</p>
                </div>
              ))}
            </div>
          </Section>

          {/* Motifs */}
          <Section id="motifs" title="Motifs">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <Label>GridPaper</Label>
                <GridPaper className="h-40 rounded-card border-3 border-ink" />
              </div>
              <div>
                <Label>Rings</Label>
                <Rings className="h-40 rounded-card border-3 border-ink" />
              </div>
              <div>
                <Label>Halftone</Label>
                <div className="rounded-card border-3 border-ink bg-white p-6">
                  <Halftone className="h-8" />
                </div>
              </div>
              <div>
                <Label>Bolt / BoltPair</Label>
                <div className="flex h-24 items-center justify-center gap-6 rounded-card border-3 border-ink bg-white">
                  <Bolt size={48} />
                  <BoltPair side="start" />
                  <span className="font-display text-2xl">Heading</span>
                  <BoltPair side="end" />
                </div>
              </div>
            </div>

            <Label>
              <span className="mt-10 block">StickerHeading: sizes, tilts, align, halftone</span>
            </Label>
            <div className="grid gap-10 rounded-panel border-3 border-ink bg-white p-8 md:grid-cols-3">
              <StickerHeading size="sm" tilt={-2}>
                Dips
              </StickerHeading>
              <StickerHeading size="md" tilt={3} halftone>
                Wings
              </StickerHeading>
              <StickerHeading size="lg" tilt={-1}>
                Fries
              </StickerHeading>
              <StickerHeading size="md" align="start" tilt={4} bolts={false}>
                No bolts
              </StickerHeading>
              <div dir="rtl" lang="ur" className="md:col-span-2">
                <StickerHeading size="md" tilt={2}>
                  ونگز (RTL: bolts mirror)
                </StickerHeading>
              </div>
            </div>

            <Label>
              <span className="mt-10 block">Wave presets + Blob</span>
            </Label>
            <div className="overflow-hidden rounded-panel border-3 border-ink">
              {(['gentle', 'choppy', 'blob'] as WavePreset[]).map((p, i) => (
                <div key={p} className={i % 2 ? 'bg-orange' : 'bg-blue'}>
                  <p className="px-4 pt-4 font-price text-2xl text-white uppercase">{p}</p>
                  <Wave preset={p} fillClassName={i % 2 ? 'fill-blue' : 'fill-orange'} />
                </div>
              ))}
              <div className="relative h-32 overflow-hidden bg-orange">
                <Blob size={160} className="-top-10 -left-8" />
                <Blob size={80} className="right-10 bottom-4" />
                <p className="relative p-4 font-price text-2xl text-white uppercase">
                  Blobs on orange
                </p>
              </div>
            </div>

            <Label>
              <span className="mt-10 block">Logo + Wordmark (TODO: replace with client SVG)</span>
            </Label>
            <div className="flex flex-wrap items-center gap-8 rounded-panel border-3 border-ink bg-ink p-6">
              <Logo size={48} />
              <Logo size={80} />
              <Logo size={140} />
              <Wordmark className="text-6xl" />
            </div>
          </Section>

          {/* Buttons */}
          <Section
            id="buttons"
            title="Buttons"
            note="Press it: the button moves by its shadow offset and the shadow drops to 0."
          >
            <div className="space-y-6">
              {(['primary', 'secondary', 'ghost', 'dark', 'whatsapp'] as ButtonVariant[]).map(
                (v) => (
                  <div key={v}>
                    <Label>{v}</Label>
                    <div className="flex flex-wrap items-center gap-4">
                      {(['sm', 'md', 'lg'] as ButtonSize[]).map((s) => (
                        <Button key={s} variant={v} size={s}>
                          {v === 'whatsapp' ? 'WhatsApp us' : 'Order now'}
                        </Button>
                      ))}
                      <Button variant={v} loading>
                        Placing…
                      </Button>
                      <Button variant={v} disabled>
                        Disabled
                      </Button>
                    </div>
                  </div>
                ),
              )}
              <div>
                <Label>Link styled as a button + block width</Label>
                <div className="max-w-sm space-y-3">
                  <Link href="/" className={buttonClasses({ variant: 'secondary' })}>
                    I&apos;m a link
                  </Link>
                  <Button block size="lg">
                    Checkout · Rs 1,895
                  </Button>
                </div>
              </div>
            </div>
          </Section>

          {/* Chips, toggles, steppers */}
          <Section id="chips" title="Chips & controls">
            <div className="grid gap-6 md:grid-cols-2">
              <Panel tone="orange" blobs>
                <p className="mb-3 font-price text-3xl text-white uppercase">Street Fajita</p>
                <div className="flex flex-wrap gap-3">
                  {(
                    [
                      ['S-a', 'S', 595],
                      ['S-b', 'S', 695],
                      ['M', 'M', 1095],
                      ['L-a', 'L', 1695],
                      ['L-b', 'L', 1750],
                      ['XL', 'XL', 2295],
                    ] as const
                  ).map(([id, label, price]) => (
                    <PriceChip
                      key={id}
                      label={label}
                      price={price}
                      selected={chip === id}
                      onClick={() => setChip(id)}
                    />
                  ))}
                </div>
              </Panel>
              <Panel tone="blue" blobs>
                <p className="mb-3 font-price text-3xl text-white uppercase">Lava Burst</p>
                <div className="flex flex-wrap gap-3">
                  <PriceChip label="Single" price={665} />
                  <PriceChip label="Double" price={865} />
                </div>
              </Panel>
              <div className="rounded-card border-3 border-ink bg-white p-5">
                <Label>PriceChip on paper</Label>
                <div className="flex gap-3">
                  <PriceChip tone="paper" price={95} label="Ranch" />
                  <PriceChip tone="paper" price={145} label="Hot Honey" selected />
                </div>
              </div>
              <div className="space-y-5 rounded-card border-3 border-ink bg-white p-5">
                <div>
                  <Label>SegmentedToggle</Label>
                  <SegmentedToggle
                    label="How do you want it?"
                    value={fulfilment}
                    onChange={setFulfilment}
                    options={[
                      { value: 'delivery', label: 'Delivery' },
                      { value: 'pickup', label: 'Pickup' },
                    ]}
                  />
                </div>
                <div className="flex flex-wrap items-center gap-6">
                  <div>
                    <Label>Stepper</Label>
                    <Stepper value={qty} onChange={setQty} />
                  </div>
                  <div>
                    <Label>Stepper sm (at min)</Label>
                    <Stepper size="sm" value={1} onChange={() => {}} />
                  </div>
                </div>
              </div>
            </div>
          </Section>

          {/* Surfaces */}
          <Section
            id="surfaces"
            title="Cards, boards, panels"
            note="Menu cards keep a fixed 1:1 photo ratio. Descriptions are null until the client provides them; cards must look complete without."
          >
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {(
                [
                  ['Crunch Kick', 450, 'burger', null],
                  ['Hot Wings', 395, 'wings', 'New'],
                  ['Smoky Wrap', 650, 'wrap', null],
                  ['Fillet Fury', 495, 'burger', 'Sold out'],
                ] as const
              ).map(([name, price, img, tag]) => (
                <Card key={name} interactive={tag !== 'Sold out'} className="overflow-hidden">
                  <div className="relative aspect-square border-b-3 border-ink">
                    <Image
                      src={`/images/menu/${img}.jpg`}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 25vw, 50vw"
                      className={`object-cover ${tag === 'Sold out' ? 'grayscale' : ''}`}
                    />
                    {tag && (
                      <Tag
                        tone={tag === 'Sold out' ? 'ink' : 'yellow'}
                        tilt={-5}
                        className="absolute start-3 top-3"
                      >
                        {tag}
                      </Tag>
                    )}
                  </div>
                  <div className="flex items-end justify-between gap-2 p-4">
                    <p className="font-price text-2xl leading-none tracking-[0.02em] uppercase">
                      {name}
                    </p>
                    <p className="font-price text-2xl leading-none text-orange-deep">Rs {price}</p>
                  </div>
                </Card>
              ))}
            </div>

            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              <MenuBoard>
                <StickerHeading size="md" tilt={-2} halftone>
                  Fries
                </StickerHeading>
                <ul className="mt-6 divide-y-2 divide-dashed divide-ink/30">
                  {FRIES.map((f) => (
                    <li key={f.name} className="flex items-center justify-between gap-3 py-3">
                      <span className="font-price text-2xl tracking-[0.02em] uppercase">
                        {f.name}
                      </span>
                      <span className="flex gap-2">
                        {f.prices.map(([l, p]) => (
                          <PriceChip
                            key={l + p}
                            tone="paper"
                            price={p}
                            label={l ? l[0] : undefined}
                          />
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
                <Panel tone="orange-deep" className="mt-6">
                  <p className="font-display text-3xl text-white headline-sm">Loaded Fries</p>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {LOADED.map(([n, p]) => (
                      <li key={n} className="flex items-center justify-between gap-2">
                        <span className="font-price text-2xl text-white uppercase">{n}</span>
                        <PriceChip price={p} />
                      </li>
                    ))}
                  </ul>
                </Panel>
              </MenuBoard>
              <div className="space-y-6">
                <Panel tone="orange" blobs>
                  <p className="font-display text-4xl text-white headline-sm">Orange panel</p>
                  <p className="mt-2 text-ink">Alternates with blue down the page.</p>
                </Panel>
                <Panel tone="blue" blobs>
                  <p className="font-display text-4xl text-white headline-sm">Blue panel (rings)</p>
                  <p className="mt-2 text-ink">Hero and page headers.</p>
                </Panel>
                <Panel tone="orange-deep">
                  <p className="font-display text-4xl text-white headline-sm">
                    Orange-deep inner panel
                  </p>
                </Panel>
              </div>
            </div>
          </Section>

          {/* Overlays */}
          <Section
            id="overlays"
            title="Sheet, drawer, toast, badge"
            note="Native <dialog>: background is inert, focus is trapped inside and restored on close, Esc closes."
          >
            <div className="flex flex-wrap items-center gap-4">
              <Button variant="ghost" onClick={() => setSheet(true)}>
                Open sheet
              </Button>
              <Button variant="ghost" onClick={() => setDrawer(true)}>
                Open drawer
              </Button>
              <Button variant="dark" onClick={() => toast('Crunch Kick added')}>
                Show toast
              </Button>
              <span className="inline-flex items-center gap-3 rounded-button border-3 border-ink bg-white px-4 py-2">
                Badge
                <Badge count={badge} bumpKey={bumpKey} />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setBadge((n) => n + 1);
                    setBumpKey((n) => n + 1);
                  }}
                >
                  +1
                </Button>
              </span>
            </div>
            <Sheet
              open={sheet}
              onClose={() => setSheet(false)}
              title="Honey Glazed Wings"
              footer={
                <Button block size="lg" onClick={() => setSheet(false)}>
                  Add · Rs 550
                </Button>
              }
            >
              <p className="mb-4 text-muted">Bottom sheet on mobile, centered modal on desktop.</p>
              <RadioCards
                legend="Heat"
                value="regular"
                onChange={() => {}}
                options={[
                  { value: 'regular', label: 'Regular' },
                  { value: 'spicy', label: 'Spicy' },
                ]}
              />
            </Sheet>
            <Drawer open={drawer} onClose={() => setDrawer(false)} title="Your order">
              <EmptyState
                title="Nothing here yet"
                body="Your cart is hungry. Pick something loud from the menu."
              />
            </Drawer>
          </Section>

          {/* Forms */}
          <Section
            id="forms"
            title="Forms"
            note="Labels always visible. Errors are friendly and say what to do. WhatsApp opt-in is unchecked by default."
          >
            <div className="grid gap-8 md:grid-cols-2">
              <div className="space-y-5">
                <Input label="Your name" placeholder="Ali" autoComplete="name" />
                <Input
                  label="Phone"
                  placeholder="03xx xxxxxxx"
                  inputMode="tel"
                  hint="We'll text you a 6-digit code."
                />
                <Input
                  label="Phone"
                  defaultValue="0300 12"
                  error="That number looks short. Pakistani mobiles have 11 digits."
                />
                <Input
                  label="Promo code"
                  optionalLabel="Optional"
                  disabled
                  placeholder="Disabled"
                />
                <TextArea
                  label="Note for the kitchen"
                  optionalLabel="Optional"
                  placeholder="Extra crispy, no onions…"
                />
              </div>
              <div className="space-y-6">
                <RadioCards
                  legend="How will you pay?"
                  value={pay}
                  onChange={setPay}
                  options={[
                    {
                      value: 'cod',
                      label: 'Cash on delivery',
                      description: 'Pay the rider in cash',
                    },
                    {
                      value: 'jazzcash',
                      label: 'JazzCash',
                      aside: <Tag tone="blue">Soon</Tag>,
                      disabled: true,
                    },
                    {
                      value: 'easypaisa',
                      label: 'Easypaisa',
                      aside: <Tag tone="blue">Soon</Tag>,
                      disabled: true,
                    },
                  ]}
                />
                <Checkbox
                  label="Send order updates on WhatsApp"
                  hint="Optional. You can turn this off any time."
                  checked={optIn}
                  onChange={(e) => setOptIn(e.target.checked)}
                />
                <Checkbox label="Disabled checkbox" disabled />
              </div>
            </div>
            <div className="mt-10 grid gap-8 md:grid-cols-2">
              <div className="space-y-6">
                <div>
                  <PhoneInput value={phone} onChange={setPhone} />
                  <p className="mt-2 font-mono text-xs text-muted">API value: {phone ?? 'null'}</p>
                </div>
                <OtpInput
                  value={otp}
                  onChange={setOtp}
                  onComplete={(c) => toast(`Code ${c} entered`)}
                />
                <OtpInput
                  value="12"
                  onChange={() => {}}
                  error="That code isn't right. Check it and try again."
                />
              </div>
              <MapPinPicker
                value={pin}
                onChange={setPin}
                message="Inner Jhang · Rs 100 delivery · ~35 min (mock)"
              />
            </div>
          </Section>

          {/* Staff tags */}
          <Section
            id="staff"
            title="Status, source, countdown"
            note="One tag per order_status: icon + label + lightness, never colour alone. Source labels show everywhere staff see orders."
          >
            <Label>StatusTag (all 12 order_status values)</Label>
            <div className="mb-8 flex flex-wrap gap-3">
              {OrderStatus.options.map((s) => (
                <StatusTag key={s} status={s} />
              ))}
            </div>
            <Label>SourceTag</Label>
            <div className="mb-8 flex flex-wrap gap-3">
              {OrderSource.options.map((s) => (
                <SourceTag key={s} source={s} />
              ))}
            </div>
            <Label>Countdown (8-minute accept window)</Label>
            <Countdown
              to={deadline}
              className="text-5xl"
              onExpire={() => toast('Auto-rejected (demo)')}
            />
          </Section>

          {/* States */}
          <Section
            id="states"
            title="States"
            note="Every screen ships loading, empty, error, closed, sold out and offline."
          >
            <Label>Skeleton (grid-paper shimmer)</Label>
            <div className="mb-10 grid gap-6 sm:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="space-y-3">
                  <Skeleton className="aspect-square rounded-card" />
                  <Skeleton className="h-6 w-2/3" />
                </div>
              ))}
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <Card>
                <EmptyState
                  title="Nothing here yet"
                  body="Your cart is hungry."
                  action={<Button variant="secondary">Browse the menu</Button>}
                />
              </Card>
              <Card>
                <ErrorState onRetry={() => toast('Retrying…')} />
              </Card>
              <Card>
                <ErrorState offline onRetry={() => toast('Retrying…')} />
              </Card>
            </div>
            <Label>
              <span className="mt-8 block">Tags</span>
            </Label>
            <div className="flex flex-wrap items-center gap-3">
              <Tag>New</Tag>
              <Tag tone="ink">Sold out</Tag>
              <Tag tone="blue">Soon</Tag>
              <Tag tone="white">TBC</Tag>
              <Tag tone="orange" tilt={5}>
                Hot
              </Tag>
              <Tag tilt={-5}>Rs 450</Tag>
            </div>
          </Section>

          {/* Motion */}
          <Section
            id="motion"
            title="Motion"
            note="lib/motion.ts. Turn on 'reduce motion' in your OS: everything collapses to a fade or nothing."
          >
            <div className="grid gap-6 md:grid-cols-3">
              <Card className="p-5">
                <Label>pop · stamp · bump</Label>
                <div className="flex h-36 items-center justify-around">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={`p${replay}`}
                      variants={pop}
                      initial="hidden"
                      animate="show"
                      className="rounded-sticker border-3 border-ink bg-yellow px-3 py-1 font-display text-2xl"
                    >
                      Pop
                    </motion.span>
                  </AnimatePresence>
                  <motion.span
                    key={`s${replay}`}
                    variants={stamp}
                    initial="hidden"
                    animate="show"
                    className="rounded-chip border-3 border-orange-deep px-3 py-1 font-display text-3xl text-orange-deep"
                  >
                    Done!
                  </motion.span>
                  <motion.span
                    key={`b${replay}`}
                    animate={replay ? bump : undefined}
                    className="grid size-10 place-items-center rounded-full border-2 border-ink bg-yellow font-price text-xl"
                  >
                    3
                  </motion.span>
                </div>
                <Button size="sm" variant="secondary" onClick={() => setReplay((n) => n + 1)}>
                  Replay
                </Button>
              </Card>

              <Card className="p-5">
                <Label>stagger (40ms, 8px)</Label>
                <motion.ul
                  key={replay}
                  variants={stagger}
                  initial="hidden"
                  animate="show"
                  className="space-y-2"
                >
                  {['Hot Wings', 'Buffalo Wings', 'Honey Glazed Wings', 'BBQ Wings'].map((w) => (
                    <motion.li
                      key={w}
                      variants={staggerItem}
                      className="rounded-chip border-2 border-ink bg-paper px-3 py-1.5 font-price text-xl uppercase"
                    >
                      {w}
                    </motion.li>
                  ))}
                </motion.ul>
              </Card>

              <Card className="p-5">
                <Label>flyToCart (620ms) → badge bump</Label>
                <div className="flex h-36 items-center justify-between">
                  <Button
                    variant="primary"
                    onClick={(e) => {
                      if (flyTarget.current)
                        void flyToCart(
                          e.currentTarget.getBoundingClientRect(),
                          flyTarget.current.getBoundingClientRect(),
                        );
                    }}
                  >
                    Add
                  </Button>
                  <span
                    ref={flyTarget}
                    className="relative grid size-14 place-items-center rounded-button border-3 border-ink bg-yellow shadow-hard-sm"
                  >
                    <span className="font-display text-sm">Cart</span>
                    <Badge count={badge} bumpKey={bumpKey} className="absolute -end-2.5 -top-2.5" />
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    if (flyTarget.current)
                      void flyToCart(
                        e.currentTarget.getBoundingClientRect(),
                        flyTarget.current.getBoundingClientRect(),
                        '/images/menu/burger.jpg',
                      );
                  }}
                >
                  Fly a thumbnail
                </Button>
              </Card>

              <Card className="p-5 md:col-span-3">
                <Label>odometer (number roll for totals)</Label>
                <div className="flex flex-wrap items-center gap-6">
                  <Odometer value={total} className="text-6xl" />
                  <Button size="sm" variant="secondary" onClick={() => setTotal((n) => n + 445)}>
                    + Buffalo Wings
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setTotal((n) => Math.max(0, n - 95))}
                  >
                    − Dip
                  </Button>
                </div>
              </Card>
            </div>
          </Section>

          {/* Screen components (prompt 2), one file per area. */}
          <HomeSection />
          <MenuSection />
          <ItemSection />
          <CartSection />
          <CheckoutSection />
          <PaymentSection />
          <ReceiptSection />
          <TrackingSection />
        </div>
      </GridPaper>
    </MotionConfig>
  );
}
