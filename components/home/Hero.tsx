'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, type Ref } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { Blob, Bolt, BoltPair, Rings } from '@/components/ui/motifs';
import { defaultVariant, findItemBySlug, isOrderable } from '@/features/menu/helpers';
import { useMenu } from '@/features/menu/useMenu';
import { orderingMode, useStoreStatus } from '@/features/store/useStore';
import type { Menu, StoreStatus } from '@/lib/contracts';
import { formatAmount, localized } from '@/lib/format';
import { prefersReducedMotion } from '@/lib/motion';
import { useCart } from '@/stores/cart';

export interface HeroFeatured {
  name: string;
  price: number;
  soldOut: boolean;
}

interface HeroViewProps {
  status: StoreStatus | undefined;
  /** The tilted tag on the photo (Fillet Fury, price from the menu). Hidden while unknown. */
  featured: HeroFeatured | null;
  cartHasItems: boolean;
  photoRef?: Ref<HTMLDivElement>;
}

export function HeroView({ status, featured, cartHasItems, photoRef }: HeroViewProps) {
  const t = useTranslations();
  const format = useFormatter();
  const mode = orderingMode(status);
  const time = status?.opensAt
    ? format.dateTime(new Date(status.opensAt), {
        weekday: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  const cta =
    mode === 'open'
      ? { href: '/menu', label: t('home.hero.start') }
      : mode === 'preorder'
        ? {
            href: cartHasItems ? '/checkout?schedule=1' : '/menu',
            label: time ? t('home.hero.preorderFor', { time }) : t('home.hero.preorder'),
          }
        : { href: '/menu', label: time ? t('home.hero.opensAt', { time }) : t('home.hero.closed') };

  const banner =
    !status || status.state === 'open'
      ? null
      : status.state === 'paused'
        ? status.pauseReason
          ? t('store.pausedReason', { reason: status.pauseReason })
          : t('store.paused')
        : time
          ? t('store.closedUntil', { time })
          : t('store.closed');

  return (
    // overflow-x-clip (not hidden) so the photo can drift down over the next band on scroll.
    <Rings className="relative overflow-x-clip">
      <Blob size={220} tone="blue" className="-start-20 top-24" />
      <Blob size={120} tone="blue" className="end-[8%] -top-10" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pt-10 pb-20 md:grid-cols-[1.1fr_1fr] md:pt-16 md:pb-28">
        <div className="relative flex flex-col items-start gap-6">
          <p className="inline-flex -rotate-2 items-center gap-2 rounded-sticker border-3 border-ink bg-white px-3 py-1 font-sticker text-lg font-black text-ink shadow-sticker">
            <Bolt size={22} />
            {t('home.hero.location')}
          </p>
          <h1 className="font-display text-5xl leading-[0.95] headline sm:text-7xl lg:text-8xl">
            <span className="block text-white">{t('home.hero.line1')}</span>
            <span className="flex items-center gap-3 text-yellow">
              {t('home.hero.line2')}
              <span className="max-sm:hidden">
                <BoltPair side="end" scale={1.2} />
              </span>
            </span>
          </h1>

          {banner && (
            <p
              role="status"
              className="flex max-w-md items-start gap-2 rounded-sticker border-3 border-ink bg-yellow px-4 py-2.5 font-bold text-ink shadow-hard-sm"
            >
              <Bolt size={20} className="mt-0.5" />
              <span>
                {banner}
                {mode === 'preorder' && (
                  <span className="block font-normal">{t('store.preorderHint')}</span>
                )}
              </span>
            </p>
          )}

          <div className="flex flex-wrap gap-4">
            <Link
              href={cta.href}
              className={buttonClasses({ size: 'lg', className: 'max-sm:px-5 max-sm:text-xl' })}
            >
              {cta.label}
            </Link>
            <Link href="/menu#fries" className={buttonClasses({ size: 'lg', variant: 'ghost' })}>
              {t('home.hero.seeMenu')}
            </Link>
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[min(26rem,82vw)]">
          <div
            ref={photoRef}
            className="relative aspect-square rounded-full border-3 border-ink bg-orange p-[7%] shadow-hard-lg will-change-transform"
          >
            <div className="relative size-full overflow-hidden rounded-full border-3 border-ink">
              <Image
                src="/images/menu/burger.jpg"
                alt={t('home.hero.photoAlt')}
                fill
                sizes="(min-width: 768px) 26rem, 82vw"
                loading="eager"
                fetchPriority="high"
                className="object-cover"
              />
            </div>
            {featured && (
              <p className="absolute -start-2 bottom-[8%] rotate-[-5deg] rounded-sticker border-3 border-ink bg-white px-3 pt-1.5 pb-1 font-price text-2xl leading-none tracking-[0.02em] text-ink uppercase shadow-hard md:text-3xl">
                {t('home.hero.featured', {
                  name: featured.name,
                  price: featured.soldOut
                    ? t('common.soldOut')
                    : t('price.rs', { amount: formatAmount(featured.price) }),
                })}
              </p>
            )}
          </div>
        </div>
      </div>
    </Rings>
  );
}

/** Hero with live store status (closed / paused CTAs) and the GSAP scroll moment (§2.5). */
export function Hero({ menu, status }: { menu?: Menu; status?: StoreStatus }) {
  const locale = useLocale();
  const { data: m } = useMenu(menu);
  const { data: s } = useStoreStatus(status);
  const cartHasItems = useCart((c) => c.lines.length > 0);
  const photo = useRef<HTMLDivElement>(null);

  const item = m ? findItemBySlug(m, 'fillet-fury') : null;
  const featured = item
    ? {
        name: localized(item.name, locale),
        price: defaultVariant(item).price,
        soldOut: !isOrderable(item),
      }
    : null;

  // Scroll moment: the burger scales and drifts toward Fan favourites. GSAP loads only here,
  // only with motion allowed and on devices with more than 4 cores.
  useEffect(() => {
    const el = photo.current;
    if (!el || prefersReducedMotion() || (navigator.hardwareConcurrency ?? 8) <= 4) return;
    let cancelled = false;
    let revert: (() => void) | undefined;
    void Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(
      ([{ gsap }, { ScrollTrigger }]) => {
        if (cancelled) return;
        gsap.registerPlugin(ScrollTrigger);
        const ctx = gsap.context(() => {
          gsap.to(el, {
            scale: 1.1,
            y: 110,
            rotate: -6,
            ease: 'none',
            scrollTrigger: {
              trigger: el,
              start: 'top 25%',
              endTrigger: document.getElementById('fan-favourites') ?? undefined,
              end: 'top 55%',
              scrub: 0.5,
            },
          });
        });
        revert = () => ctx.revert();
      },
    );
    return () => {
      cancelled = true;
      revert?.();
    };
  }, []);

  return <HeroView status={s} featured={featured} cartHasItems={cartHasItems} photoRef={photo} />;
}
