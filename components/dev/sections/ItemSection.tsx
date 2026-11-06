'use client';

import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';
import { DetailSkeleton, ItemConfigurator } from '@/components/item/ItemDetail';
import { ItemNotFound } from '@/components/item/ItemNotFound';
import { spicyBurst } from '@/components/item/spicyBurst';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/states';
import { StickerToggle } from '@/components/ui/StickerToggle';
import type { Item, Menu, Variant, VariantSize } from '@/lib/contracts';
import { Label, Section } from '../guide';

const PizzaArt = dynamic(() => import('@/components/item/PizzaArt'));

/* ---------- Static sample menu (shaped like the real one; not imported from /mocks) ---------- */

const v = (id: string, price: number, over: Partial<Variant> = {}): Variant => ({
  id,
  name: id,
  size: null,
  option: null,
  price,
  isDefault: false,
  isAvailable: true,
  ...over,
});
const item = (
  slug: string,
  name: string,
  categoryId: string,
  variants: Variant[],
  over: Partial<Item> = {},
): Item => ({
  id: `demo_${slug}`,
  categoryId,
  slug: `demo-${slug}`,
  name: { en: name, ur: null },
  description: null,
  basePrice: variants[0]!.price,
  imagePath: null,
  isActive: true,
  isSoldOut: false,
  soldOutUntil: null,
  prepMinutes: null,
  sortOrder: 0,
  variants: variants.map((x, i) => ({ ...x, isDefault: i === 0 })),
  modifierGroupIds: ['g_dips'],
  ...over,
});
const cat = (slug: string, name: string, images: string[]) => ({
  id: `c_${slug}`,
  slug,
  name: { en: name, ur: null },
  sortOrder: 0,
  isActive: true,
  parentId: null,
  imagePaths: images,
});
const dip = (id: string, name: string, price: number, isAvailable = true) => ({
  id,
  name: { en: name, ur: null },
  price,
  isAvailable,
});

const MENU: Menu = {
  updatedAt: '2026-11-06T00:00:00+05:00',
  combos: [],
  categories: [
    cat('fries', 'Fries', ['/images/menu/fries-bucket.jpg']),
    cat('burgers', 'Burgers', ['/images/menu/burger.jpg']),
    cat('wings', 'Wings', ['/images/menu/wings.jpg']),
    cat('pizzas', 'Pizzas', ['/images/menu/pizza-big.jpg']),
    cat('sides', 'Sides', []),
  ],
  modifierGroups: [
    {
      id: 'g_dips',
      name: { en: 'Add a dip', ur: null },
      minSelect: 0,
      maxSelect: 3,
      modifiers: [
        dip('d1', 'Ranch', 95),
        dip('d2', 'Chipotle', 95),
        dip('d3', 'Garlic Mayo', 95),
        dip('d4', 'Peri Peri', 95),
        dip('d5', 'Hot Honey Ranch', 145, false),
      ],
    },
    {
      id: 'g_style',
      name: { en: 'Style', ur: null },
      minSelect: 1,
      maxSelect: 1,
      modifiers: [dip('s1', 'Regular', 0), dip('s2', 'Spicy', 0)],
    },
  ],
  items: [
    item('snow', 'Snow Salt Fries', 'c_fries', [
      v('snow-r', 250, { option: 'regular' }),
      v('snow-l', 400, { option: 'large' }),
    ]),
    item('masala', 'Masala Fries', 'c_fries', [v('masala', 250)]),
    item('lava', 'Lava Burst', 'c_burgers', [
      v('lava-s', 665, { option: 'single' }),
      v('lava-d', 865, { option: 'double' }),
    ]),
    item('fillet', 'Fillet Fury', 'c_burgers', [v('fillet', 495)], { isSoldOut: true }),
    item('honey', 'Honey Glazed Wings', 'c_wings', [v('honey', 550)], {
      modifierGroupIds: ['g_dips', 'g_style'],
    }),
    item('fajita', 'Street Fajita', 'c_pizzas', [
      v('fj-sa', 595, { size: 'S', option: 'optionA' }),
      v('fj-sb', 695, { size: 'S', option: 'optionB' }),
      v('fj-m', 1095, { size: 'M' }),
      v('fj-la', 1695, { size: 'L', option: 'optionA' }),
      v('fj-lb', 1750, { size: 'L', option: 'optionB', isAvailable: false }),
    ]),
    item('nuggets', 'Nuggets', 'c_sides', [v('nuggets', 350)]),
  ],
};
const bySlug = (s: string) => MENU.items.find((i) => i.slug === `demo-${s}`)!;

const SHEETS = [
  ['lava', 'Burger: variants + dips + fries upsell'],
  ['honey', 'Wings: required Style (pick Spicy)'],
  ['fajita', 'Pizza: sizes, Option A/B, L·B unavailable'],
  ['fillet', 'Sold out'],
  ['nuggets', 'No photo (Sides)'],
] as const;

const SIZES: VariantSize[] = ['S', 'M', 'L', 'XL'];

/**
 * /dev/ui section for the Item screens: every new component in every state.
 * Rendered at the bottom of components/dev/StyleGuide.tsx.
 */
export function ItemSection() {
  const [open, setOpen] = useState<string | null>(null);
  const [dips, setDips] = useState<string[]>(['Ranch']);
  const [size, setSize] = useState<VariantSize>('M');
  const flashRef = useRef<HTMLDivElement>(null);
  const full = dips.length >= 3;

  return (
    <Section
      id="item"
      title="Item detail"
      note="/item/[slug]: one ItemDetail for the intercepted Sheet and the full page. Store closed / paused note: run ?scenario=store_closed or paused. Live sold-out: ?scenario=live_sold_out on Fillet Fury."
    >
      <div className="space-y-10">
        <div>
          <Label>Sheet (Sample data. Add closes the sheet, then flies to the cart)</Label>
          <div className="flex flex-wrap gap-3">
            {SHEETS.map(([slug, label]) => (
              <Button key={slug} variant="ghost" size="sm" onClick={() => setOpen(slug)}>
                {label}
              </Button>
            ))}
          </div>
          {open && (
            <ItemConfigurator
              key={open}
              menu={MENU}
              item={bySlug(open)}
              mode="sheet"
              onClose={() => setOpen(null)}
            />
          )}
        </div>

        <div>
          <Label>Full page (direct load), scrolled inside a box here</Label>
          <div className="max-h-[680px] overflow-y-auto rounded-card border-3 border-ink bg-paper">
            <ItemConfigurator menu={MENU} item={bySlug('fajita')} mode="page" />
          </div>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <div>
            <Label>StickerToggle: off / on / unavailable / group full</Label>
            <div className="flex flex-wrap gap-3">
              {['Ranch', 'Chipotle', 'Garlic Mayo', 'Peri Peri'].map((d) => {
                const on = dips.includes(d);
                return (
                  <StickerToggle
                    key={d}
                    checked={on}
                    disabled={!on && full}
                    onChange={() => setDips(on ? dips.filter((x) => x !== d) : [...dips, d])}
                    aside={<span className="font-price text-xl">+Rs 95</span>}
                  >
                    {d}
                  </StickerToggle>
                );
              })}
              <StickerToggle disabled aside={<span className="font-price text-xl">Sold out</span>}>
                Hot Honey Ranch
              </StickerToggle>
            </div>
          </div>

          <div>
            <Label>PizzaArt: spring between sizes</Label>
            <div className="flex items-center gap-4">
              <div className="w-40">
                <PizzaArt size={size} />
              </div>
              <div className="flex flex-col gap-2">
                {SIZES.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={s === size ? 'secondary' : 'ghost'}
                    onClick={() => setSize(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <Label>spicyBurst (skipped under reduced motion)</Label>
            <div
              ref={flashRef}
              className="relative grid h-32 place-items-center rounded-card border-3 border-ink bg-white"
            >
              <Button size="sm" onClick={() => spicyBurst(flashRef.current)}>
                Spicy!
              </Button>
            </div>
          </div>

          <div>
            <Label>Loading (sheet / page skeleton)</Label>
            <DetailSkeleton label="Loading the item…" />
          </div>

          <div>
            <Label>Error with retry / offline</Label>
            <ErrorState onRetry={() => {}} />
            <ErrorState offline onRetry={() => {}} />
          </div>

          <div>
            <Label>Unknown slug</Label>
            <ItemNotFound />
          </div>
        </div>
      </div>
    </Section>
  );
}
