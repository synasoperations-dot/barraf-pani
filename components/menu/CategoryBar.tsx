'use client';

import clsx from 'clsx';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { track } from '@/lib/analytics';
import type { Category } from '@/lib/contracts';
import { localized } from '@/lib/format';
import { prefersReducedMotion } from '@/lib/motion';
import { tilt } from '@/lib/tilt';

const behavior = (): ScrollBehavior => (prefersReducedMotion() ? 'auto' : 'smooth');

/**
 * Sticky sticker pills under the header (top-18). Scroll-spy via IntersectionObserver on the
 * category sections; tapping a pill smooth-scrolls there and the active pill scrolls into view.
 */
export function CategoryBar({ cats }: { cats: Category[] }) {
  const t = useTranslations('menuPage');
  const locale = useLocale();
  const [active, setActive] = useState(cats[0]?.slug);
  const bar = useRef<HTMLDivElement>(null);
  // After a tap, ignore the spy while the smooth scroll passes other sections.
  const lockUntil = useRef(0);
  const slugs = cats.map((c) => c.slug).join(' ');

  useEffect(() => {
    const order = slugs.split(' ');
    const visible = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries)
          if (e.isIntersecting) visible.add(e.target.id);
          else visible.delete(e.target.id);
        if (Date.now() < lockUntil.current) return;
        const first = order.find((s) => visible.has(s));
        if (first) setActive(first);
      },
      // A band just under the sticky header + bar.
      { rootMargin: '-150px 0px -55% 0px' },
    );
    for (const s of order) {
      const el = document.getElementById(s);
      if (el) io.observe(el);
    }
    return () => io.disconnect();
  }, [slugs]);

  // Keep the active pill visible inside the scroller (scrollBy, so the page scroll isn't interrupted).
  useEffect(() => {
    const pill = bar.current?.querySelector(`[data-slug="${active}"]`);
    if (!bar.current || !pill) return;
    const b = bar.current.getBoundingClientRect();
    const p = pill.getBoundingClientRect();
    bar.current.scrollBy({
      left: p.left + p.width / 2 - (b.left + b.width / 2),
      behavior: behavior(),
    });
  }, [active]);

  if (!cats.length) return null;
  return (
    <nav aria-label={t('categories')} className="sticky top-18 z-30 border-b-3 border-ink bg-white">
      <div
        ref={bar}
        className="mx-auto flex max-w-6xl [scrollbar-width:none] gap-2 overflow-x-auto px-4 py-3"
      >
        {cats.map((c, i) => (
          <a
            key={c.slug}
            href={`#${c.slug}`}
            data-slug={c.slug}
            aria-current={active === c.slug ? 'location' : undefined}
            onClick={(e) => {
              e.preventDefault();
              lockUntil.current = Date.now() + 1000;
              setActive(c.slug);
              track('menu_viewed', { category: c.slug });
              document
                .getElementById(c.slug)
                ?.scrollIntoView({ behavior: behavior(), block: 'start' });
              history.replaceState(null, '', `#${c.slug}`);
            }}
            className={clsx(
              'inline-flex min-h-11 shrink-0 press items-center rounded-sticker border-3 border-ink px-3 font-sticker text-base font-black whitespace-nowrap text-ink shadow-hard-sm [--press-x:3px] [--press-y:3px]',
              active === c.slug ? 'bg-yellow' : 'bg-white',
            )}
            style={{ rotate: tilt(i % 2 ? 1.5 : -1.5) }}
          >
            {localized(c.name, locale)}
          </a>
        ))}
      </div>
    </nav>
  );
}
