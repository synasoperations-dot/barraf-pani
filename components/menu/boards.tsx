'use client';

import clsx from 'clsx';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { createContext, use, useState, type ReactNode } from 'react';
import { PriceChip } from '@/components/ui/PriceChip';
import { orderingMode, useStoreStatus } from '@/features/store/useStore';
import { Stamp } from '@/components/ui/Stamp';
import { StickerHeading } from '@/components/ui/StickerHeading';
import { Blob, Wave } from '@/components/ui/motifs';
import { Skeleton } from '@/components/ui/states';
import { MenuBoard, Panel } from '@/components/ui/surfaces';
import { useAddToCart } from '@/features/cart/useAddToCart';
import {
  activeCategories,
  childCategories,
  hasRequiredChoice,
  itemImage,
  itemsIn,
  topCategories,
} from '@/features/menu/helpers';
import { highlight, matches, normalizeQuery } from '@/features/menu/search';
import type { Category, Item, Menu, Variant } from '@/lib/contracts';
import { formatAmount, localized } from '@/lib/format';

/* ---------- View: the menu filtered by the search ---------- */

export interface MenuView {
  menu: Menu;
  /** Normalised search query ('' = everything). */
  q: string;
  cats: Map<string, Category>;
  /** Matching items per category slug. */
  rows: Map<string, Item[]>;
  kids: Map<string, Category[]>;
  count: number;
}

export function menuView(menu: Menu, query: string, locale: string): MenuView {
  const q = normalizeQuery(query);
  const cats = new Map(activeCategories(menu).map((c) => [c.slug, c]));
  const rows = new Map<string, Item[]>();
  let count = 0;
  for (const c of cats.values()) {
    // A category-name hit ("pizza", "wings") shows the whole category.
    const all = matches(q, localized(c.name, locale), c.name.en);
    const r = itemsIn(menu, c.id).filter(
      (i) => all || matches(q, localized(i.name, locale), i.name.en),
    );
    rows.set(c.slug, r);
    count += r.length;
  }
  const kids = new Map(topCategories(menu).map((c) => [c.slug, childCategories(menu, c.id)]));
  return { menu, q, cats, rows, kids, count };
}

/** Does this category (or one of its children) have rows to show? Empty boards collapse. */
export const shows = (v: MenuView, slug: string): boolean =>
  (v.rows.get(slug)?.length ?? 0) > 0 || (v.kids.get(slug) ?? []).some((k) => shows(v, k.slug));

const ViewCtx = createContext<MenuView | null>(null);
const useView = () => use(ViewCtx)!;

/* ---------- Atoms ---------- */

function Hl({ text }: { text: string }) {
  const { q } = useView();
  return highlight(text, q).map((s, i) =>
    s.match ? (
      <mark key={i} className="rounded-sm bg-yellow px-0.5 text-ink">
        {s.text}
      </mark>
    ) : (
      s.text
    ),
  );
}

const useCatName = () => {
  const locale = useLocale();
  return (c: Category) => localized(c.name, locale);
};

function Photo({
  src,
  alt,
  sizes,
  className,
}: {
  src: string;
  alt: string;
  sizes: string;
  className?: string;
}) {
  return (
    <div className={clsx('relative overflow-hidden border-3 border-ink', className)}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    </div>
  );
}

const HALF = '(min-width: 1024px) 560px, 100vw';

/** Category photos: two split 2:3, or one full width. Hidden while searching (results stay dense). */
function PhotoStrip({ slug, className }: { slug: string; className?: string }) {
  const v = useView();
  const t = useTranslations('menuPage');
  const name = useCatName();
  const cat = v.cats.get(slug);
  if (!cat || v.q || !cat.imagePaths.length) return null;
  const [a, b] = cat.imagePaths;
  return (
    <div className={clsx('mt-4 grid gap-3', b && 'grid-cols-[2fr_3fr]', className)}>
      <Photo
        src={a!}
        alt={t('photoAlt', { name: name(cat) })}
        sizes={HALF}
        className="h-44 rounded-card md:h-56"
      />
      {b && <Photo src={b} alt="" sizes={HALF} className="h-44 rounded-card md:h-56" />}
    </div>
  );
}

/** Anchor target for /menu#<slug>; scroll margin clears the sticky header + category bar. */
function Section({
  slug,
  className,
  children,
}: {
  slug: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={slug} aria-labelledby={`${slug}-h`} className={clsx('scroll-mt-40', className)}>
      {children}
    </section>
  );
}

function Sticker({
  slug,
  ...rest
}: { slug: string } & Omit<Parameters<typeof StickerHeading>[0], 'children' | 'id'>) {
  const v = useView();
  const name = useCatName();
  return (
    <StickerHeading id={`${slug}-h`} {...rest}>
      <Hl text={name(v.cats.get(slug)!)} />
    </StickerHeading>
  );
}

/* ---------- Price chips and rows ---------- */

function useVariantLabel() {
  const t = useTranslations();
  return (v: Variant) => [v.size, v.option && t(`variant.${v.option}`)].filter(Boolean).join(' · ');
}

/**
 * One price chip. No required choice → adds straight to the cart (flash, fly, bump, Undo toast).
 * Required choice (Honey Glazed Wings → Regular/Spicy) → opens Item detail (a Sheet via interception).
 */
function ItemChip({
  item,
  variant,
  label,
  compact,
}: {
  item: Item;
  variant: Variant;
  label?: string;
  compact?: boolean;
}) {
  const { menu } = useView();
  const t = useTranslations();
  const locale = useLocale();
  const router = useRouter();
  const add = useAddToCart();
  const variantLabel = useVariantLabel();

  const name = localized(item.name, locale);
  // What the chip shows: its label, then the price (label-in-name, WCAG 2.5.3).
  const visible = [label, formatAmount(variant.price)].filter(Boolean).join(' ');
  const choose = hasRequiredChoice(menu, item);
  const full = variantLabel(variant);
  const out = item.isSoldOut || !variant.isAvailable;
  // Closed with no pre-orders: nothing can be ordered, so chips can't add (pre-orders: they can).
  const closed = orderingMode(useStoreStatus().data) === 'closed';

  return (
    <PriceChip
      price={variant.price}
      label={label}
      disabled={out || closed}
      aria-label={
        out
          ? t('menuPage.soldOutItem', { name, visible })
          : choose
            ? t('menuPage.chooseItem', { name, visible })
            : full
              ? t('menuPage.addVariant', { name, variant: full, visible })
              : t('menuPage.addItem', { name, visible })
      }
      onClick={(e) =>
        choose
          ? router.push(`/item/${item.slug}`)
          : add({
              item,
              variant,
              image: itemImage(menu, item),
              from: e.currentTarget,
              source: 'menu',
              toastAction: 'undo',
            })
      }
      className={clsx(
        'disabled:cursor-not-allowed',
        out && !item.isSoldOut && 'disabled:line-through disabled:opacity-50',
        closed && !out && 'disabled:opacity-60',
        // Compact pizza cells: smaller price, and the A/B label (first of two spans) smaller still.
        compact && 'gap-1! px-1.5! text-lg! [&>span:first-child:not(:last-child)]:text-sm',
      )}
    />
  );
}

function ItemName({ item }: { item: Item }) {
  const locale = useLocale();
  return (
    <Link
      href={`/item/${item.slug}`}
      className="inline-flex min-h-11 items-center font-price text-[28px] leading-none tracking-[0.02em] text-white uppercase decoration-3 underline-offset-4 hover:underline md:text-[30px]"
    >
      <span className="pt-1">
        <Hl text={localized(item.name, locale)} />
      </span>
    </Link>
  );
}

/** Covers a sold-out row. Stamps in with animation when it sells out while the page is open. */
function SoldOut({
  item,
  children,
  className,
}: {
  item: Item;
  children: ReactNode;
  className?: string;
}) {
  const t = useTranslations('menuPage');
  const [wasSoldOut] = useState(item.isSoldOut);
  return (
    <li className={clsx('relative', className)}>
      <div className={clsx('contents', item.isSoldOut && '*:opacity-45')}>{children}</div>
      {item.isSoldOut && (
        <span className="pointer-events-none absolute inset-0 grid place-items-center">
          <Stamp tilt={-6} animate={!wasSoldOut}>
            {t('soldOutToday')}
          </Stamp>
        </span>
      )}
    </li>
  );
}

function Rows({ slug }: { slug: string }) {
  const v = useView();
  const t = useTranslations('variant');
  const items = v.rows.get(slug) ?? [];
  if (!items.length) return null;
  return (
    <ul className="divide-y-2 divide-dashed divide-white/40">
      {items.map((item) => (
        <SoldOut
          key={item.id}
          item={item}
          className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2"
        >
          <ItemName item={item} />
          <div className="flex flex-wrap gap-2">
            {item.variants.map((variant) => (
              <ItemChip
                key={variant.id}
                item={item}
                variant={variant}
                label={
                  [variant.size, variant.option && t(variant.option)].filter(Boolean).join(' ') ||
                  undefined
                }
              />
            ))}
          </div>
        </SoldOut>
      ))}
    </ul>
  );
}

/** A category's rows plus its child categories as inner orange-deep panels (Loaded Fries). */
function CategoryBody({ slug }: { slug: string }) {
  const v = useView();
  const name = useCatName();
  return (
    <>
      <Rows slug={slug} />
      {(v.kids.get(slug) ?? [])
        .filter((k) => shows(v, k.slug))
        .map((k) => (
          <Section key={k.slug} slug={k.slug} className="mt-5">
            <Panel tone="orange-deep" className="max-md:px-4">
              <h3
                id={`${k.slug}-h`}
                className="inline-block -rotate-2 rounded-full border-3 border-ink bg-yellow px-4 pt-1 font-price text-2xl tracking-[0.04em] text-ink uppercase shadow-hard-sm"
              >
                <Hl text={name(k)} />
              </h3>
              <Rows slug={k.slug} />
            </Panel>
          </Section>
        ))}
    </>
  );
}

/* ---------- Pizza table ---------- */

const SIZES = ['S', 'M', 'L', 'XL'] as const;
const PIZZA_COLS = 'grid grid-cols-4 gap-x-1 sm:grid-cols-[minmax(0,1fr)_repeat(4,4.5rem)]';

/** S / M / L / XL grid. Mobile: name on its own line, four compact cells under it (fits 390px). */
function PizzaTable({ slug }: { slug: string }) {
  const v = useView();
  const t = useTranslations();
  const items = v.rows.get(slug) ?? [];
  const short = (o: Variant['option']) =>
    o === 'optionA' || o === 'optionB'
      ? t(`menuPage.optionShort.${o}`)
      : o
        ? t(`variant.${o}`)
        : undefined;
  return (
    <div className="overflow-x-auto">
      <div aria-hidden="true" className={clsx(PIZZA_COLS, 'border-b-3 border-white/60 pb-1')}>
        <span className="hidden sm:block" />
        {SIZES.map((s) => (
          <span key={s} className="text-center font-price text-3xl text-white">
            {s}
          </span>
        ))}
      </div>
      <ul className="divide-y-2 divide-dashed divide-white/40">
        {items.map((item) => (
          <SoldOut
            key={item.id}
            item={item}
            className={clsx(PIZZA_COLS, 'items-center gap-y-1 py-2')}
          >
            <div className="col-span-4 sm:col-span-1">
              <ItemName item={item} />
            </div>
            {SIZES.map((size) => {
              const vs = item.variants.filter((x) => x.size === size);
              return (
                <div key={size} className="flex flex-col items-center gap-1">
                  {vs.length ? (
                    vs.map((x) => (
                      <ItemChip
                        key={x.id}
                        item={item}
                        variant={x}
                        label={short(x.option)}
                        compact
                      />
                    ))
                  ) : (
                    <span className="font-price text-3xl text-white">
                      <span aria-hidden="true">–</span>
                      <span className="sr-only">{t('menuPage.notOffered', { size })}</span>
                    </span>
                  )}
                </div>
              );
            })}
          </SoldOut>
        ))}
      </ul>
    </div>
  );
}

/* ---------- Boards (printed-menu layouts) ---------- */

const BAND = '-mx-4 -mt-4 md:-mx-6 md:-mt-6';

/** Centred sticker over one panel (Fries, Pizzas, and any category added later). */
function SimpleBoard({
  slug,
  tone = 'orange',
  table,
}: {
  slug: string;
  tone?: 'orange' | 'blue';
  table?: boolean;
}) {
  const v = useView();
  const t = useTranslations('menuPage');
  const name = useCatName();
  const cat = v.cats.get(slug)!;
  return (
    <MenuBoard className={clsx(table && 'max-md:p-2')}>
      <Section slug={slug}>
        <Sticker slug={slug} size="lg" tilt={table ? 2 : -2} className="relative z-10 -mb-7" />
        <Panel
          tone={tone}
          blobs={!table}
          className={clsx('pt-11 md:pt-12', table && 'max-md:px-3')}
        >
          {table ? <PizzaTable slug={slug} /> : <CategoryBody slug={slug} />}
        </Panel>
        {table ? (
          !v.q &&
          cat.imagePaths.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-card border-3 border-ink bg-orange p-3">
              {cat.imagePaths.slice(0, 2).map((src, i) => (
                <Photo
                  key={src}
                  src={src}
                  alt={i ? '' : t('photoAlt', { name: name(cat) })}
                  sizes="(min-width: 1024px) 280px, 50vw"
                  className="aspect-square rounded-card"
                />
              ))}
            </div>
          )
        ) : (
          <PhotoStrip slug={slug} />
        )}
      </Section>
    </MenuBoard>
  );
}

/**
 * Sandwiches + Burgers (orange band) and Wraps + Pastas (blue band): a band with a curved bottom,
 * the first sticker and a tilted photo; the first panel; the second sticker end-aligned over the
 * second panel; the second category's photo strip.
 */
function DuoBoard({ a, b, band }: { a: string; b: string; band: 'orange' | 'blue' }) {
  const v = useView();
  const t = useTranslations('menuPage');
  const name = useCatName();
  const catA = v.cats.get(a);
  const photo = catA?.imagePaths[0];
  return (
    <MenuBoard className="overflow-hidden">
      {shows(v, a) && (
        <Section slug={a} className="mb-10">
          <div
            className={clsx(
              BAND,
              'mb-6 flex flex-wrap items-center justify-between gap-4 rounded-b-[50%_2.5rem] border-b-3 border-ink px-3 pt-7 pb-10 md:px-8',
              band === 'orange' ? 'bg-orange' : 'rings',
            )}
          >
            <Sticker slug={a} align="start" tilt={-3} />
            {photo && !v.q && (
              <Photo
                src={photo}
                alt={t('photoAlt', { name: name(catA!) })}
                sizes="160px"
                className="ms-auto size-28 shrink-0 rotate-6 rounded-card shadow-hard-md md:size-40"
              />
            )}
          </div>
          <Panel tone={band === 'orange' ? 'blue' : 'orange'}>
            <CategoryBody slug={a} />
          </Panel>
        </Section>
      )}
      {shows(v, b) && (
        <Section slug={b}>
          <div className="relative z-10 -mb-7 flex justify-end pe-3">
            <Sticker slug={b} align="start" tilt={3} />
          </div>
          <Panel tone={band} className="pt-11 md:pt-12">
            <CategoryBody slug={b} />
          </Panel>
          <PhotoStrip slug={b} />
        </Section>
      )}
    </MenuBoard>
  );
}

/** Wings: orange top with a blob, blue panel bleeding off the inline-end edge, photo with a big start corner. */
function WingsBoard({ slug }: { slug: string }) {
  const v = useView();
  const t = useTranslations('menuPage');
  const name = useCatName();
  const cat = v.cats.get(slug)!;
  return (
    <MenuBoard className="overflow-hidden">
      <Section slug={slug}>
        <div
          className={clsx(
            BAND,
            'relative overflow-hidden border-b-3 border-ink bg-orange px-5 pt-8 pb-16',
          )}
        >
          <Blob size={170} className="-end-12 -top-16" />
          <Blob size={64} className="start-6 bottom-3" />
          <Sticker slug={slug} size="lg" tilt={-2} className="relative" />
        </div>
        <Panel tone="blue" className="relative z-10 -me-4 -mt-9 rounded-e-none border-e-0 md:-me-6">
          <CategoryBody slug={slug} />
        </Panel>
        {cat.imagePaths[0] && !v.q && (
          <Photo
            src={cat.imagePaths[0]}
            alt={t('photoAlt', { name: name(cat) })}
            sizes={HALF}
            className="mt-5 h-48 rounded-chip rounded-ss-[4rem] md:h-60"
          />
        )}
      </Section>
    </MenuBoard>
  );
}

/** Dips (sticker top-end + halftone, orange panel) → wave → Sides (blue band) → wave → orange footer. */
function DipsSidesBoard() {
  const v = useView();
  const t = useTranslations('brand');
  const sides = shows(v, 'sides');
  return (
    <MenuBoard className="overflow-hidden">
      {shows(v, 'dips') && (
        <Section slug="dips">
          <div className="relative z-10 -mb-7 flex justify-end">
            <Sticker slug="dips" align="start" tilt={3} halftone />
          </div>
          <Panel tone="orange" className="pt-11 md:pt-12">
            <CategoryBody slug="dips" />
          </Panel>
        </Section>
      )}
      {sides && (
        <Section slug="sides" className="-mx-4 mt-6 md:-mx-6">
          <Wave preset="choppy" fillClassName="fill-blue" />
          <div className="rings px-5 pt-4 pb-6 md:px-8">
            <Sticker slug="sides" align="start" tilt={-2} className="mb-2" />
            <CategoryBody slug="sides" />
          </div>
        </Section>
      )}
      <div className={clsx('-mx-4 -mb-4 md:-mx-6 md:-mb-6', !sides && 'mt-6')}>
        <Wave preset="blob" fillClassName="fill-orange" className={clsx(sides && 'bg-blue')} />
        <div className="relative overflow-hidden bg-orange px-4 pt-6 pb-10 text-center">
          <Blob size={120} className="-start-8 -bottom-10" />
          <Blob size={80} className="end-10 -top-6" />
          <p className="relative font-display text-3xl text-white headline-sm md:text-4xl">
            {t('tagline')}
          </p>
        </div>
      </div>
    </MenuBoard>
  );
}

/* ---------- All boards ---------- */

const BOARDS: { slugs: string[]; board: ReactNode }[] = [
  { slugs: ['fries'], board: <SimpleBoard slug="fries" /> },
  {
    slugs: ['sandwiches', 'burgers'],
    board: <DuoBoard a="sandwiches" b="burgers" band="orange" />,
  },
  { slugs: ['wings'], board: <WingsBoard slug="wings" /> },
  { slugs: ['wraps', 'pastas'], board: <DuoBoard a="wraps" b="pastas" band="blue" /> },
  { slugs: ['pizzas'], board: <SimpleBoard slug="pizzas" tone="blue" table /> },
  { slugs: ['dips', 'sides'], board: <DipsSidesBoard /> },
];
const KNOWN = new Set(BOARDS.flatMap((b) => b.slugs));

/** The printed menu boards, one column on mobile, two on lg. Categories added later get a SimpleBoard. */
export function MenuBoards({ view }: { view: MenuView }) {
  const extra = topCategories(view.menu).filter((c) => !KNOWN.has(c.slug) && shows(view, c.slug));
  return (
    <ViewCtx value={view}>
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
        {BOARDS.filter((b) => b.slugs.some((s) => shows(view, s))).map((b) => (
          <div key={b.slugs[0]}>{b.board}</div>
        ))}
        {extra.map((c) => (
          <SimpleBoard key={c.slug} slug={c.slug} />
        ))}
      </div>
    </ViewCtx>
  );
}

/** Brand skeleton boards while the menu loads (no server data, slow network). */
export function MenuSkeleton() {
  const t = useTranslations('common');
  return (
    <div role="status" className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2">
      <span className="sr-only">{t('loading')}</span>
      {[0, 1, 2, 3].map((i) => (
        <MenuBoard key={i}>
          <Skeleton className="relative z-10 mx-auto -mb-7 h-14 w-44 rounded-sticker" />
          <Skeleton className="h-80 rounded-panel" />
          <Skeleton className="mt-4 h-44 rounded-card" />
        </MenuBoard>
      ))}
    </div>
  );
}
