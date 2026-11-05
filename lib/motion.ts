/**
 * Motion language (docs/DESIGN.md §Motion). Framer Motion presets + two imperative helpers.
 *
 * Rules: everything collapses to a fade (or nothing) under prefers-reduced-motion; nothing
 * longer than 700ms blocks interaction; never animate layout on the add-to-cart path.
 * Framer is imported as a *type* here so pages that don't animate don't ship it. Wrap animated
 * subtrees in <MotionConfig reducedMotion="user">.
 */
import type { Transition, Variants } from 'framer-motion';

export const OVERSHOOT = [0.2, 1.4, 0.4, 1] as const;

/** press: translate by the shadow offset over 120ms; release springs back. CSS twin: `.press`. */
export const press = {
  whileTap: { x: 4, y: 4, boxShadow: '0 0 0 var(--color-ink)' },
  transition: { type: 'spring', stiffness: 700, damping: 22, duration: 0.12 } satisfies Transition,
};

/** pop: scale 0.85 → 1 with overshoot, 260ms. CSS twin: `animate-pop`. */
export const pop: Variants = {
  hidden: { scale: 0.85, opacity: 0 },
  show: { scale: 1, opacity: 1, transition: { duration: 0.26, ease: OVERSHOOT } },
};

/** stamp: scale 1.6 → 1 at −12°, 380ms. For "Done" labels and success marks. CSS twin: `animate-stamp`. */
export const stamp: Variants = {
  hidden: { scale: 1.6, rotate: -12, opacity: 0 },
  show: { scale: 1, rotate: -12, opacity: 1, transition: { duration: 0.38, ease: OVERSHOOT } },
};

/** bump: 1 → 1.4 → 1 with a −10° wobble, 420ms. CSS twin: `animate-bump`. */
export const bump = {
  scale: [1, 1.4, 1],
  rotate: [0, -10, 0],
  transition: { duration: 0.42, ease: OVERSHOOT } satisfies Transition,
};

/** stagger: children slide in 40ms apart, 8px travel. */
export const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: 0.04 } } };
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
};

/** View Transition name for the shared item photo (menu card → item detail). */
export const itemPhotoTransitionName = (slug: string) => `item-photo-${slug}`;

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Fired when something lands in the cart; the cart badge bumps on it. */
export const CART_BUMP_EVENT = 'bp:cart-bump';
export const bumpCart = () => window.dispatchEvent(new Event(CART_BUMP_EVENT));

/**
 * flyToCart: a yellow ink-outlined dot (or the item's thumbnail) arcs from the tapped element
 * to the cart icon in 620ms, then the cart badge bumps. Pure WAAPI on a detached overlay, so
 * it never touches layout on the add-to-cart path. Under reduced motion it only bumps.
 */
export function flyToCart(fromRect: DOMRect, toRect: DOMRect, imageSrc?: string): Promise<void> {
  if (prefersReducedMotion()) {
    bumpCart();
    return Promise.resolve();
  }
  const size = imageSrc ? 44 : 22;
  const x0 = fromRect.left + fromRect.width / 2 - size / 2;
  const y0 = fromRect.top + fromRect.height / 2 - size / 2;
  const x1 = toRect.left + toRect.width / 2 - size / 2;
  const y1 = toRect.top + toRect.height / 2 - size / 2;

  // Outer moves X linearly, inner moves Y with an ease that dips up first → an arc.
  const outer = document.createElement('div');
  outer.setAttribute('aria-hidden', 'true');
  outer.style.cssText = 'position:fixed;left:0;top:0;z-index:100;pointer-events:none;';
  const dot = document.createElement('div');
  dot.style.cssText = `width:${size}px;height:${size}px;border-radius:999px;border:2px solid var(--color-ink);background:var(--color-yellow) center/cover no-repeat;${imageSrc ? `background-image:url("${encodeURI(imageSrc)}");` : ''}`;
  outer.appendChild(dot);
  document.body.appendChild(outer);

  const duration = 620;
  outer.animate([{ transform: `translateX(${x0}px)` }, { transform: `translateX(${x1}px)` }], {
    duration,
    easing: 'linear',
  });
  const flight = dot.animate(
    [
      { transform: `translateY(${y0}px) scale(1)` },
      { transform: `translateY(${y1}px) scale(0.55)` },
    ],
    { duration, easing: 'cubic-bezier(0.45, -0.6, 0.85, 0.55)', fill: 'forwards' },
  );
  return flight.finished
    .catch(() => {})
    .then(() => {
      outer.remove();
      bumpCart();
    });
}
