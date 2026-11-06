'use client';

import { useLocale } from 'next-intl';
import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '@/lib/motion';

/**
 * When the language switches, sticker labels (`[data-sticker]`) flip like cards to their new
 * text. Instant under "reduce motion". WAAPI on what's on screen only; nothing re-renders.
 */
export function LocaleFlip() {
  const locale = useLocale();
  const prev = useRef(locale);
  useEffect(() => {
    if (prev.current === locale) return;
    prev.current = locale;
    if (prefersReducedMotion()) return;
    const vh = window.innerHeight;
    document.querySelectorAll<HTMLElement>('[data-sticker]').forEach((el, i) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      el.animate(
        [
          { transform: 'perspective(600px) rotateY(90deg)' },
          { transform: 'perspective(600px) rotateY(-12deg)', offset: 0.7 },
          { transform: 'perspective(600px) rotateY(0deg)' },
        ],
        { duration: 420, delay: Math.min(i, 8) * 30, easing: 'cubic-bezier(.2,1.4,.4,1)' },
      );
    });
  }, [locale]);
  return null;
}
