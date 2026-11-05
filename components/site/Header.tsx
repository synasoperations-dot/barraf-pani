'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { buttonClasses } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { BoltPair } from '@/components/ui/motifs';
import { CART_BUMP_EVENT } from '@/lib/motion';
import { selectCount, useCart } from '@/stores/cart';
import { useUi } from '@/stores/ui';
import { LanguageToggle } from './LanguageToggle';

export const NAV = [
  { href: '/menu', key: 'menu' },
  { href: '/deals', key: 'deals' },
  { href: '/about', key: 'about' },
  { href: '/visit', key: 'visit' },
] as const;

/** Cart icon button. `id="cart-target"` is where flyToCart aims. */
export function CartButton({ className }: { className?: string }) {
  const t = useTranslations('cart');
  const count = useCart(selectCount);
  const [bump, setBump] = useState(0);
  const setOpen = useUi((s) => s.setCartOpen);

  useEffect(() => {
    const on = () => setBump((n) => n + 1);
    window.addEventListener(CART_BUMP_EVENT, on);
    return () => window.removeEventListener(CART_BUMP_EVENT, on);
  }, []);

  return (
    <button
      id="cart-target"
      type="button"
      onClick={() => setOpen(true)}
      aria-label={t('open', { count })}
      className={clsx(
        'relative grid size-12 press place-items-center rounded-button border-3 border-ink bg-yellow shadow-hard-sm [--press-x:3px] [--press-y:3px]',
        className,
      )}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
        <path
          d="M3 4h2.5l2.2 10.2a1.5 1.5 0 0 0 1.5 1.2h7.9a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.3"
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="9.5" cy="19.5" r="1.6" fill="var(--color-ink)" />
        <circle cx="17" cy="19.5" r="1.6" fill="var(--color-ink)" />
      </svg>
      <Badge count={count} bumpKey={bump} className="absolute -end-2.5 -top-2.5" />
    </button>
  );
}

/** Full-screen sticker-style nav for mobile. Native <dialog> for focus handling. */
function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (open && d && !d.open) d.showModal();
    if (!open && d?.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={t('a11y.primaryNav')}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      className="m-0 h-dvh max-h-none w-screen max-w-none flex-col rings p-6 transition-[opacity,display,overlay] transition-discrete duration-200 open:flex starting:opacity-0"
    >
      <div className="flex items-center justify-between">
        <Logo size={56} />
        <button
          type="button"
          onClick={onClose}
          className={buttonClasses({ variant: 'ghost', size: 'sm' })}
        >
          {t('nav.closeMenu')}
        </button>
      </div>
      <nav className="mt-10 flex flex-1 flex-col items-center gap-6">
        {NAV.map((n, i) => (
          <Link
            key={n.href}
            href={n.href}
            onClick={onClose}
            className="inline-block press rounded-sticker border-3 border-ink bg-white px-6 py-1 font-sticker text-4xl font-black text-ink shadow-sticker [--press-x:0px] [--press-y:6px]"
            style={{ transform: `rotate(${[-2, 3, -1, 2][i]}deg)` }}
          >
            {t(`nav.${n.key}`)}
          </Link>
        ))}
        <div className="mt-4 flex items-center gap-3">
          <BoltPair side="start" />
          <Link href="/menu" onClick={onClose} className={buttonClasses({ size: 'lg' })}>
            {t('nav.orderNow')}
          </Link>
          <BoltPair side="end" />
        </div>
      </nav>
      <div className="flex justify-center">
        <LanguageToggle />
      </div>
    </dialog>
  );
}

export function Header() {
  const t = useTranslations();
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b-3 border-ink bg-white">
      <a
        href="#main"
        className="sr-only rounded-chip bg-yellow px-3 py-2 font-bold focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50"
      >
        {t('a11y.skipToContent')}
      </a>
      <div className="mx-auto flex h-18 max-w-6xl items-center gap-4 px-4">
        <Link href="/" aria-label={t('a11y.logo')} className="shrink-0">
          <Logo size={54} />
        </Link>

        <nav aria-label={t('a11y.primaryNav')} className="ms-4 hidden items-center gap-1 md:flex">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? 'page' : undefined}
                className={clsx(
                  'rounded-chip border-2 px-3 py-1.5 font-display text-lg transition-colors',
                  active
                    ? 'border-ink bg-blue text-white'
                    : 'border-transparent text-ink hover:border-ink',
                )}
              >
                {t(`nav.${n.key}`)}
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto flex items-center gap-3">
          <LanguageToggle className="hidden md:inline-flex" />
          <CartButton />
          <Link
            href="/menu"
            className={buttonClasses({ size: 'md', className: 'hidden md:inline-flex' })}
          >
            {t('nav.orderNow')}
          </Link>
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-expanded={navOpen}
            aria-label={t('nav.openMenu')}
            className="grid size-12 press place-items-center rounded-button border-3 border-ink bg-white shadow-hard-sm [--press-x:3px] [--press-y:3px] md:hidden"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="size-6">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="var(--color-ink)"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />
    </header>
  );
}
