'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { MenuScreen } from '@/components/menu/MenuPage';
import { ApiError } from '@/lib/api';
import type { Category, Item, Menu, StoreStatus, Variant, VariantOption } from '@/lib/contracts';
import { Label, Section } from '../guide';

/* Static sample data (not /mocks): a few rows per board, every row type. */

const cat = (
  slug: string,
  name: string,
  i: number,
  images: string[] = [],
  parent?: string,
): Category => ({
  id: `c_${slug}`,
  slug,
  name: { en: name, ur: null },
  sortOrder: i,
  isActive: true,
  parentId: parent ? `c_${parent}` : null,
  imagePaths: images.map((n) => `/images/menu/${n}.jpg`),
});

const CATS = [
  cat('fries', 'Fries', 0, ['fries-bucket', 'fries-long']),
  cat('loaded-fries', 'Loaded Fries', 1, [], 'fries'),
  cat('sandwiches', 'Sandwiches', 2, ['sandwich']),
  cat('burgers', 'Burgers', 3, ['burger']),
  cat('wings', 'Wings', 4, ['wings']),
  cat('wraps', 'Wraps', 5, ['wrap']),
  cat('pastas', 'Pastas', 6, ['mac']),
  cat('pizzas', 'Pizzas', 7, ['pizza-small', 'pizza-big']),
  cat('dips', 'Dips', 8),
  cat('sides', 'Sides', 9),
];

const v = (
  key: string,
  price: number,
  size: Variant['size'] = null,
  option: VariantOption | null = null,
): Variant => ({
  id: `v_${key}`,
  name: key,
  size,
  option,
  price,
  isDefault: false,
  isAvailable: true,
});

let n = 0;
const item = (c: string, name: string, variants: Variant[], extra: Partial<Item> = {}): Item => {
  const slug = `${c}-${name.toLowerCase().replace(/\W+/g, '-')}`;
  return {
    id: `i_${slug}`,
    categoryId: `c_${c}`,
    slug,
    name: { en: name, ur: null },
    description: null,
    basePrice: variants[0]!.price,
    imagePath: null,
    isActive: true,
    isSoldOut: false,
    soldOutUntil: null,
    prepMinutes: null,
    sortOrder: n++,
    variants: variants.map((x) => ({ ...x, id: `${x.id}_${slug}` })),
    modifierGroupIds: [],
    ...extra,
  };
};

const RL = (a: number, b: number) => [v('r', a, null, 'regular'), v('l', b, null, 'large')];

const BASE: Menu = {
  categories: CATS,
  modifierGroups: [
    {
      id: 'g_style',
      name: { en: 'Style', ur: null },
      minSelect: 1,
      maxSelect: 1,
      modifiers: [{ id: 'm_reg', name: { en: 'Regular', ur: null }, price: 0, isAvailable: true }],
    },
  ],
  combos: [],
  updatedAt: '2026-11-06T00:00:00+05:00',
  items: [
    item('fries', 'Snow Salt Fries', RL(250, 400)),
    item('fries', 'Crème Fries', [v('s', 450)]),
    item('loaded-fries', 'Cheese Meltdown', [v('s', 545)]),
    item('sandwiches', 'Cheese Melt', [v('s', 695)]),
    item('burgers', 'Fillet Fury', [v('s', 495)]),
    item('burgers', 'Lava Burst', [v('a', 665, null, 'single'), v('b', 865, null, 'double')]),
    item('wings', 'Honey Glazed Wings', [v('s', 550)], { modifierGroupIds: ['g_style'] }),
    item('wings', 'Hot Wings', [v('s', 395)], { isSoldOut: true }),
    item('wraps', 'Zing Wrap', [v('s', 650)]),
    item('pastas', 'Mac and Cheese', RL(395, 695)),
    item('pizzas', 'Street Fajita', [
      v('sa', 595, 'S', 'optionA'),
      v('sb', 695, 'S', 'optionB'),
      v('m', 1095, 'M'),
      v('la', 1695, 'L', 'optionA'),
      v('lb', 1750, 'L', 'optionB'),
      v('xl', 2295, 'XL'),
    ]),
    item('pizzas', 'Pepperon Magic', [v('l', 1795, 'L')]),
    item(
      'pizzas',
      'All Cheese',
      [v('s', 500, 'S'), v('m', 900, 'M'), v('l', 1600, 'L'), v('xl', 2000, 'XL')],
      {
        isSoldOut: true,
      },
    ),
    item('dips', 'Garlic Mayo', [v('s', 95)]),
    item('sides', 'Garlic Bread', [v('c', 450, null, 'classic'), v('ch', 550, null, 'cheese')]),
  ],
};

const STATUS: StoreStatus = {
  state: 'open',
  isAcceptingOrders: true,
  pauseReason: null,
  opensAt: null,
  closesAt: null,
  allowPreorders: true,
  minOrderValue: 500,
  shopPhone: '+920000000000',
  openingHours: [],
  preorderMaxDays: 7,
  preorderCodMaxHours: 2,
  checkedAt: '2026-11-06T00:00:00+05:00',
};

const STATES = ['ready', 'loading', 'error', 'offline'] as const;
const STORES = {
  open: STATUS,
  preorder: { ...STATUS, state: 'closed', isAcceptingOrders: false },
  closed: { ...STATUS, state: 'closed', isAcceptingOrders: false, allowPreorders: false },
  paused: { ...STATUS, state: 'paused', isAcceptingOrders: false, pauseReason: 'Rush hour' },
} satisfies Record<string, StoreStatus>;

const STORE_KEYS = Object.keys(STORES) as (keyof typeof STORES)[];

function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <Button
            key={o}
            size="sm"
            variant={value === o ? 'secondary' : 'ghost'}
            aria-pressed={value === o}
            onClick={() => onChange(o)}
          >
            {o}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** /dev/ui section for the Menu screen: the real MenuScreen fed sample data, in every state. */
export function MenuSection() {
  const [state, setState] = useState<(typeof STATES)[number]>('ready');
  const [store, setStore] = useState<keyof typeof STORES>('open');
  const [filletOut, setFilletOut] = useState(false);
  const menu: Menu = {
    ...BASE,
    items: BASE.items.map((i) =>
      i.name.en === 'Fillet Fury' ? { ...i, isSoldOut: filletOut } : i,
    ),
  };

  return (
    <Section
      id="menu"
      title="Menu"
      note="The real /menu screen with sample data. Tap a chip to add (flash, fly, bump, Undo toast); Honey Glazed Wings opens Item detail; try searching “che” (highlight) or “zzz” (empty state); toggle Fillet Fury to see the live stamp-in."
    >
      <div className="mb-6 flex flex-col gap-4">
        <Choice label="Data" options={STATES} value={state} onChange={setState} />
        <Choice label="Store" options={STORE_KEYS} value={store} onChange={setStore} />
        <div>
          <Label>Live sold-out (realtime)</Label>
          <Button size="sm" variant="dark" onClick={() => setFilletOut((x) => !x)}>
            {filletOut ? 'Restock Fillet Fury' : 'Sell out Fillet Fury'}
          </Button>
        </div>
      </div>
      <div className="overflow-clip rounded-card border-3 border-ink bg-paper">
        <MenuScreen
          menu={state === 'ready' ? menu : undefined}
          status={STORES[store]}
          error={
            state === 'error'
              ? new ApiError('INTERNAL_ERROR', 'x', 500)
              : state === 'offline'
                ? new ApiError('NETWORK_ERROR', 'x', 0)
                : undefined
          }
          onRetry={() => setState('ready')}
        />
      </div>
    </Section>
  );
}
