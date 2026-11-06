'use client';

import { useState, type ReactNode } from 'react';
import { CravingsView } from '@/components/home/Cravings';
import { DealsTeaserView } from '@/components/home/DealsTeaser';
import { FanFavouritesView } from '@/components/home/FanFavourites';
import { FindUsView } from '@/components/home/FindUs';
import { HeroView } from '@/components/home/Hero';
import { Intro } from '@/components/home/Intro';
import { TheSpot } from '@/components/home/TheSpot';
import { WaysBand } from '@/components/home/WaysBand';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { ApiError } from '@/lib/api';
import type { Category, DealsEvents, Item, Menu, StoreStatus } from '@/lib/contracts';
import { Label, Section } from '../guide';

/* Static sample data (no /mocks import). */
const IMG = (n: string) => `/images/menu/${n}.jpg`;
const cat = (slug: string, name: string, sortOrder: number, img?: string): Category => ({
  id: `cat_${slug}`,
  slug,
  name: { en: name, ur: null },
  sortOrder,
  isActive: true,
  parentId: null,
  imagePaths: img ? [IMG(img)] : [],
});
const item = (
  slug: string,
  name: string,
  category: string,
  price: number,
  extra: Partial<Item> = {},
): Item => ({
  id: `itm_${slug}`,
  categoryId: `cat_${category}`,
  slug,
  name: { en: name, ur: null },
  description: null,
  basePrice: price,
  imagePath: null,
  isActive: true,
  isSoldOut: false,
  soldOutUntil: null,
  prepMinutes: null,
  sortOrder: 0,
  variants: [
    {
      id: `${slug}__std`,
      name: 'Standard',
      size: null,
      option: null,
      price,
      isDefault: true,
      isAvailable: true,
    },
  ],
  modifierGroupIds: [],
  ...extra,
});

const MENU: Menu = {
  categories: [
    cat('fries', 'Fries', 0, 'fries-bucket'),
    cat('sandwiches', 'Sandwiches', 1, 'sandwich'),
    cat('burgers', 'Burgers', 2, 'burger'),
    cat('wings', 'Wings', 3, 'wings'),
    cat('wraps', 'Wraps', 4, 'wrap'),
    cat('pastas', 'Pastas', 5, 'mac'),
    cat('pizzas', 'Pizzas', 6, 'pizza-big'),
    cat('dips', 'Dips', 7),
    cat('sides', 'Sides', 8),
  ],
  items: [
    item('fillet-fury', 'Fillet Fury', 'burgers', 495),
    item('deep-cheese-core', 'Deep Cheese Core', 'pizzas', 2250, {
      variants: [
        {
          id: 'dcc__l',
          name: 'L',
          size: 'L',
          option: null,
          price: 2250,
          isDefault: true,
          isAvailable: true,
        },
      ],
    }),
    item('philly-cheesesteak-fries', 'Philly Cheesesteak Fries', 'fries', 850),
    item('honey-glazed-wings', 'Honey Glazed Wings', 'wings', 550, {
      modifierGroupIds: ['grp_style'],
    }),
  ],
  modifierGroups: [
    {
      id: 'grp_style',
      name: { en: 'Style', ur: null },
      minSelect: 1,
      maxSelect: 1,
      modifiers: [
        { id: 'mod_regular', name: { en: 'Regular', ur: null }, price: 0, isAvailable: true },
        { id: 'mod_spicy', name: { en: 'Spicy', ur: null }, price: 0, isAvailable: true },
      ],
    },
  ],
  combos: [],
  updatedAt: '2026-11-01T12:00:00+05:00',
};
const SOLD_OUT_MENU: Menu = {
  ...MENU,
  items: MENU.items.map((i) => (i.slug === 'fillet-fury' ? { ...i, isSoldOut: true } : i)),
};

const STATUS: StoreStatus = {
  state: 'open',
  isAcceptingOrders: true,
  pauseReason: null,
  opensAt: null,
  closesAt: '2026-11-06T23:30:00+05:00',
  allowPreorders: true,
  minOrderValue: 500,
  shopPhone: '+920000000000',
  openingHours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
    weekday,
    opens: '12:00',
    closes: weekday === 0 || weekday >= 5 ? '02:00' : '23:30',
  })),
  preorderMaxDays: 7,
  preorderCodMaxHours: 2,
  holidays: [],
  checkedAt: '2026-11-06T10:00:00+05:00',
};
const CLOSED: StoreStatus = {
  ...STATUS,
  state: 'closed',
  isAcceptingOrders: false,
  opensAt: '2026-11-07T12:00:00+05:00',
  closesAt: null,
};

const DEALS: DealsEvents = {
  deals: [
    {
      id: 'd1',
      title: { en: 'DEMO Burger + Fries + Dip', ur: null },
      description: null,
      imagePath: null,
      priceLabel: 'Rs 795',
      promoCode: null,
      items: [
        { itemId: 'itm_fillet-fury', variantId: 'fillet-fury__std', modifierIds: [], qty: 1 },
      ],
      validFrom: null,
      validUntil: null,
      isActive: true,
      sortOrder: 0,
    },
  ],
  events: [
    {
      id: 'e1',
      title: { en: 'DEMO Live match screening', ur: null },
      description: null,
      imagePath: null,
      startsAt: '2026-11-09T19:00:00+05:00',
      endsAt: '2026-11-09T23:00:00+05:00',
      bookable: true,
      capacity: 40,
      spotsLeft: 40,
      isActive: true,
    },
    {
      id: 'e2',
      title: { en: 'DEMO Family night', ur: null },
      description: null,
      imagePath: null,
      startsAt: '2026-11-12T18:00:00+05:00',
      endsAt: '2026-11-12T22:00:00+05:00',
      bookable: true,
      capacity: null,
      spotsLeft: null,
      isActive: true,
    },
  ],
};

const FEATURED = { name: 'Fillet Fury', price: 495, soldOut: false };
const noop = () => {};
const demoAdd = () => toast('Added (demo)');
const FAIL = new ApiError('INTERNAL_ERROR', 'demo', 500);
const OFFLINE = new ApiError('NETWORK_ERROR', 'demo', 0);

const Frame = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <Label>{label}</Label>
    <div className="overflow-hidden rounded-card border-3 border-ink bg-paper">{children}</div>
  </div>
);

/** /dev/ui section for the Home screens: every new component in every state. */
export function HomeSection() {
  const [intro, setIntro] = useState(0);
  return (
    <Section
      id="home"
      title="Home"
      note="components/home/*. Views take plain props; the page wires them to useMenu / useStoreStatus / useDealsEvents. Try /?scenario=store_closed, paused, slow_3g, network_fail, deals_demo, live_sold_out."
    >
      <div className="flex flex-col gap-10">
        <div>
          <Label>Intro (first visit only, ≤1.4s, skippable; off under reduced motion)</Label>
          <Button variant="secondary" onClick={() => setIntro((n) => n + 1)}>
            Replay intro
          </Button>
          {intro > 0 && <Intro key={intro} force onDone={() => setIntro(0)} />}
        </div>

        <Frame label="Hero · open">
          <HeroView status={STATUS} featured={FEATURED} cartHasItems={false} />
        </Frame>
        <Frame label="Hero · closed + pre-orders (cart has items → /checkout?schedule=1)">
          <HeroView status={CLOSED} featured={FEATURED} cartHasItems />
        </Frame>
        <Frame label="Hero · closed, no pre-orders; featured sold out">
          <HeroView
            status={{ ...CLOSED, allowPreorders: false }}
            featured={{ ...FEATURED, soldOut: true }}
            cartHasItems={false}
          />
        </Frame>
        <Frame label="Hero · paused with a reason (pre-orders on); menu not loaded yet (no tag)">
          <HeroView
            status={{
              ...STATUS,
              state: 'paused',
              isAcceptingOrders: false,
              pauseReason: 'Kitchen is slammed, back in 20 min',
            }}
            featured={null}
            cartHasItems={false}
          />
        </Frame>

        <Frame label="Ways band">
          <div className="rings pt-10">
            <WaysBand />
          </div>
        </Frame>

        {/* One instance per item: duplicate ViewTransition names break the photo morph. */}
        <Frame label="Fan favourites · loaded: sold out (live_sold_out) / add / add / required choice → item sheet">
          <FanFavouritesView menu={SOLD_OUT_MENU} error={null} onRetry={noop} onAdd={demoAdd} />
        </Frame>
        <Frame label="Fan favourites · loading (slow_3g)">
          <FanFavouritesView menu={undefined} error={null} onRetry={noop} onAdd={noop} />
        </Frame>
        <Frame label="Fan favourites · error / offline">
          <div className="grid md:grid-cols-2">
            <FanFavouritesView
              menu={undefined}
              error={FAIL}
              onRetry={() => toast('Retry (demo)')}
              onAdd={noop}
            />
            <FanFavouritesView
              menu={undefined}
              error={OFFLINE}
              onRetry={() => toast('Retry (demo)')}
              onAdd={noop}
            />
          </div>
        </Frame>

        <Frame label="Cravings · loaded / loading / failed (only the menu link)">
          <CravingsView menu={MENU} loading={false} />
          <CravingsView menu={undefined} loading />
          <CravingsView menu={undefined} loading={false} />
        </Frame>

        <Frame label="Deals & Events teaser (empty data renders nothing)">
          <DealsTeaserView data={DEALS} />
          <DealsTeaserView data={{ deals: [], events: [] }} />
        </Frame>

        <Frame label="The spot (TODO_CONFIRM photos)">
          <TheSpot />
        </Frame>

        <Frame label="Find us · loaded (past-midnight hours) / loading / error">
          <FindUsView status={STATUS} error={null} onRetry={noop} />
          <FindUsView status={undefined} error={null} onRetry={noop} />
          <FindUsView status={undefined} error={OFFLINE} onRetry={() => toast('Retry (demo)')} />
        </Frame>
      </div>
    </Section>
  );
}
