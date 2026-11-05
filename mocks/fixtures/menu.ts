/**
 * Menu fixture, in the order of the printed menu boards. Prices: whole PKR.
 * Do NOT invent prices, add-ons, drinks or descriptions. Descriptions stay null until the
 * client provides them. Anything marked TODO_CONFIRM is listed in docs/OPEN_QUESTIONS.md.
 */
import type {
  Category,
  Combo,
  Item,
  Menu,
  Modifier,
  ModifierGroup,
  Variant,
  VariantOption,
  VariantSize,
} from '@/lib/contracts';

const IMG = (name: string) => `/images/menu/${name}.jpg`;
const UPDATED_AT = '2026-11-06T00:00:00+05:00';

/* ---------- Variant helpers ---------- */

type V = Omit<Variant, 'id' | 'isDefault' | 'isAvailable'> & { key: string };

const single = (price: number): V[] => [{ key: 'std', size: null, option: null, price }];

/** TODO_CONFIRM: two-price items. Unconfirmed which variant each price is. */
const two = (a: number, b: number, [oa, ob]: [VariantOption, VariantOption]): V[] => [
  { key: oa, size: null, option: oa, price: a },
  { key: ob, size: null, option: ob, price: b },
];

type SizePrice = number | [number, number] | null;
/** Pizza sizes; `[a, b]` = slash price (TODO_CONFIRM: optionA/optionB), null = not available. */
const pizza = (S: SizePrice, M: SizePrice, L: SizePrice, XL: SizePrice): V[] =>
  (
    [
      ['S', S],
      ['M', M],
      ['L', L],
      ['XL', XL],
    ] as [VariantSize, SizePrice][]
  ).flatMap(([size, p]): V[] => {
    if (p === null) return [];
    if (typeof p === 'number') return [{ key: size, size, option: null, price: p }];
    return [
      { key: `${size}-a`, size, option: 'optionA', price: p[0] },
      { key: `${size}-b`, size, option: 'optionB', price: p[1] },
    ];
  });

/* ---------- Modifier groups ---------- */

const DIP_PRICES: [slug: string, name: string, price: number][] = [
  ['ranch', 'Ranch', 95],
  ['chipotle', 'Chipotle', 95],
  ['garlic-mayo', 'Garlic Mayo', 95],
  ['honey-mustard', 'Honey Mustard', 95],
  ['peri-peri', 'Peri Peri', 95],
  ['hot-honey-ranch', 'Hot Honey Ranch', 145],
];

const dipModifiers: Modifier[] = DIP_PRICES.map(([slug, name, price]) => ({
  id: `mod_dip_${slug}`,
  name: { en: name, ur: null },
  price,
  isAvailable: true,
}));

export const GROUP_DIPS = 'grp_dips';
export const GROUP_HONEY_HEAT = 'grp_honey_heat';

const modifierGroups: ModifierGroup[] = [
  // TODO_CONFIRM: max dips per item (6 = one of each).
  {
    id: GROUP_DIPS,
    name: { en: 'Add a dip', ur: null },
    minSelect: 0,
    maxSelect: 6,
    modifiers: dipModifiers,
  },
  {
    id: GROUP_HONEY_HEAT,
    name: { en: 'Heat', ur: null },
    minSelect: 1,
    maxSelect: 1,
    modifiers: [
      { id: 'mod_heat_regular', name: { en: 'Regular', ur: null }, price: 0, isAvailable: true },
      { id: 'mod_heat_spicy', name: { en: 'Spicy', ur: null }, price: 0, isAvailable: true },
    ],
  },
];

/** TODO: extra cheese add-on. Data model is ModifierGroup; ships empty until the client prices it. */
export const extraCheeseModifiers: Modifier[] = [];

/** TODO: meals and combos (FEATURE_COMBOS=false). Ships empty. */
const combos: Combo[] = [];

/* ---------- Categories (printed menu order) ---------- */

type CatDef = {
  slug: string;
  name: string;
  images: string[];
  subsections?: [string, string][];
  dips: boolean;
};

const CATS: CatDef[] = [
  {
    slug: 'fries',
    name: 'Fries',
    images: [IMG('fries-bucket'), IMG('fries-long')],
    subsections: [['loaded-fries', 'Loaded Fries']],
    dips: true,
  },
  { slug: 'sandwiches', name: 'Sandwiches', images: [IMG('sandwich')], dips: true },
  { slug: 'burgers', name: 'Burgers', images: [IMG('burger')], dips: true },
  { slug: 'wings', name: 'Wings', images: [IMG('wings')], dips: true },
  { slug: 'wraps', name: 'Wraps', images: [IMG('wrap')], dips: true },
  { slug: 'pastas', name: 'Pastas', images: [IMG('mac')], dips: false },
  { slug: 'pizzas', name: 'Pizzas', images: [IMG('pizza-small'), IMG('pizza-big')], dips: true },
  { slug: 'dips', name: 'Dips', images: [], dips: false },
  { slug: 'sides', name: 'Sides', images: [], dips: true },
];

const categories: Category[] = CATS.map((c, i) => ({
  id: `cat_${c.slug}`,
  slug: c.slug,
  name: { en: c.name, ur: null },
  sortOrder: i,
  images: c.images,
  subsections: (c.subsections ?? []).map(([slug, name]) => ({
    slug,
    name: { en: name, ur: null },
  })),
  isActive: true,
}));

/* ---------- Items ---------- */

type ItemDef = {
  name: string;
  variants: V[];
  subsection?: string;
  image?: string;
  /** Extra groups beyond the category's dip group. */
  groups?: string[];
  /** Override slug when the name repeats across categories (e.g. BP Homemade). */
  slug?: string;
};

const RL: [VariantOption, VariantOption] = ['regular', 'large'];

const ITEMS: Record<string, ItemDef[]> = {
  fries: [
    // Snow Salt Fries = plain fries.
    { name: 'Snow Salt Fries', variants: two(250, 400, RL) },
    { name: 'Masala Fries', variants: two(250, 400, RL) },
    { name: 'Arctic Heat Fries', variants: two(300, 500, RL) },
    { name: 'Long Fries', variants: single(450), image: IMG('fries-long') },
    { name: 'BP Homemade', slug: 'bp-homemade-fries', variants: single(495) },
    { name: 'Cheese Meltdown', variants: single(545), subsection: 'loaded-fries' },
    { name: 'Pizza Party', variants: single(650), subsection: 'loaded-fries' },
    { name: 'Crunch Attack', variants: single(650), subsection: 'loaded-fries' },
    { name: 'Fire on Fries', variants: single(650), subsection: 'loaded-fries' },
    { name: 'Philly Cheesesteak Fries', variants: single(850), subsection: 'loaded-fries' },
  ],
  sandwiches: [
    { name: 'Barraf Royal Club', variants: single(695) },
    { name: 'Cheese Melt', variants: single(695) },
    { name: 'Mellow Mushroom', variants: single(745) },
    { name: 'Yellow Fellow', variants: single(745) },
    { name: 'Chipotle Sandwich', variants: single(745) },
  ],
  burgers: [
    { name: 'Crunch Kick', variants: single(450) },
    { name: 'Fillet Fury', variants: single(495) },
    { name: 'Grilled Chicken', variants: single(550) },
    { name: 'Smoky Stack', variants: single(550) },
    { name: 'Sizzlin Mushroom', variants: single(595) },
    { name: 'Lava Burst', variants: two(665, 865, ['single', 'double']) },
    { name: 'Beef Smash', variants: single(800) },
    { name: 'Caramelised Onion and Beef', variants: single(850) },
    { name: 'OG Anda Shami', variants: single(250) },
  ],
  wings: [
    { name: 'Hot Wings', variants: single(395) },
    { name: 'Buffalo Wings', variants: single(445) },
    { name: 'Honey Glazed Wings', variants: single(550), groups: [GROUP_HONEY_HEAT] },
    { name: 'Oven-Baked Wings', variants: single(395) },
    { name: 'BBQ Wings', variants: single(445) },
  ],
  wraps: [
    { name: 'Smoky Wrap', variants: single(650) },
    { name: 'Zing Wrap', variants: single(650) },
    { name: 'Fillet Wrap', variants: single(650) },
    { name: "BP's Best", variants: single(675) },
  ],
  pastas: [
    { name: 'Mac and Cheese', variants: two(395, 695, RL) },
    { name: 'BP Homemade', slug: 'bp-homemade-pasta', variants: two(395, 695, RL) },
    { name: 'Golden Crunch', variants: two(395, 695, RL) },
  ],
  pizzas: [
    { name: 'Street Fajita', variants: pizza([595, 695], 1095, [1695, 1750], 2295) },
    { name: 'Smoky Tikka', variants: pizza([595, 695], 1095, [1695, 1750], 2295) },
    { name: 'Pepperon Magic', variants: pizza(null, null, 1795, null) },
    { name: 'Pepper Heat', variants: pizza(null, null, 2100, null) },
    { name: 'Malai Magic', variants: pizza([650, 750], 1200, 1895, 2500) },
    { name: 'Full House', variants: pizza([700, 750], 1250, 1995, 2650) },
    { name: 'Burger Bomb', variants: pizza([700, 750], 1200, 1895, 2500) },
    { name: 'Deep Cheese Core', variants: pizza(null, null, 2250, null) },
    { name: 'All Cheese', variants: pizza(500, 900, 1600, 2000) },
  ],
  dips: DIP_PRICES.map(([slug, name, price]) => ({
    name,
    slug: `dip-${slug}`,
    variants: single(price),
  })),
  sides: [
    { name: 'Tenders', variants: single(695) },
    { name: 'Garlic Bread', variants: two(450, 550, ['classic', 'cheese']) }, // TODO_CONFIRM: "C/P"
    { name: 'Nuggets', variants: single(350) },
  ],
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const items: Item[] = CATS.flatMap((cat) =>
  (ITEMS[cat.slug] ?? []).map((def, i): Item => {
    const slug = def.slug ?? slugify(def.name);
    const id = `itm_${slug}`;
    return {
      id,
      slug,
      categoryId: `cat_${cat.slug}`,
      subsection: def.subsection ?? null,
      name: { en: def.name, ur: null },
      description: null,
      image: def.image ?? null,
      variants: def.variants.map(({ key, ...v }, vi) => ({
        ...v,
        id: `${id}__${key}`,
        isDefault: vi === 0,
        isAvailable: true,
      })),
      modifierGroupIds: [...(cat.dips ? [GROUP_DIPS] : []), ...(def.groups ?? [])],
      isActive: true,
      isSoldOut: false,
      soldOutUntil: null,
      prepMinutes: null,
      sortOrder: i,
    };
  }),
);

export const FILLET_FURY_ID = 'itm_fillet-fury';

export const menuFixture: Menu = {
  categories,
  items,
  modifierGroups,
  combos,
  updatedAt: UPDATED_AT,
};
