'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { BoltPair, Rings } from '@/components/ui/motifs';

const KEY = 'bp-intro-seen-v1';
const REDUCED = '(prefers-reduced-motion: reduce)';

function shouldSkip() {
  try {
    return localStorage.getItem(KEY) !== null || matchMedia(REDUCED).matches;
  } catch {
    return true; // storage blocked: we couldn't remember it, so never show it
  }
}

// Read once at load (before our effect writes the flag), so soft navigations back to Home skip it.
let skipped = typeof window !== 'undefined' && shouldSkip();
const noSubscribe = () => () => {};

// Runs during HTML parsing, before first paint: hides the cover on repeat visits / reduced motion,
// otherwise marks it live (data-live lifts it over the sticky header, see CSS).
const HIDE_SCRIPT = `(function(e){try{if(localStorage.getItem(${JSON.stringify(KEY)})===null&&!matchMedia(${JSON.stringify(REDUCED)}).matches)return e.setAttribute('data-live','')}catch(_){}e.style.display='none'})(document.getElementById('bp-intro'))`;

/*
 * Pure CSS timeline (1.4s total, starts at first paint, not at hydration): rings pulse outward,
 * logo pops, bolts flicker, then the cover slides up. JS only remembers it and handles Skip.
 * <main> fades in (.page-fade), which makes it a stacking context, so the cover's z-index can't
 * beat the sticky header on its own: while the cover is live the header drops to z-0.
 * ponytail: header override lives here because globals.css / the layout aren't ours.
 */
const CSS = `
@keyframes bp-intro-rings{from{transform:scale(.6);opacity:.4}to{transform:scale(1.5);opacity:1}}
@keyframes bp-intro-pop{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}
@keyframes bp-intro-flicker{0%,30%,60%{opacity:0}15%,45%,100%{opacity:1}}
@keyframes bp-intro-out{to{transform:translateY(-100%)}}
#bp-intro{animation:bp-intro-out 350ms cubic-bezier(.6,0,.8,.4) 1050ms both}
#bp-intro [data-rings]{animation:bp-intro-rings 700ms ease-out both}
#bp-intro [data-logo]{animation:bp-intro-pop 260ms var(--ease-overshoot) 150ms both}
#bp-intro [data-bolt]{animation:bp-intro-flicker 450ms linear 350ms both}
@media (prefers-reduced-motion:reduce){#bp-intro{display:none}}
body:has(#bp-intro[data-live]) header{z-index:0}
`;

/**
 * First-visit menu cover (≤1.4s, skippable, remembered in localStorage, off under reduced
 * motion). `force` replays it regardless (the /dev/ui demo).
 */
export function Intro({ force, onDone }: { force?: boolean; onDone?: () => void }) {
  const t = useTranslations('home.intro');
  const skip = useSyncExternalStore(
    noSubscribe,
    () => !force && skipped,
    () => false,
  );
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (skip || done || !el || getComputedStyle(el).display === 'none') return; // script / reduced motion
    try {
      localStorage.setItem(KEY, '1');
    } catch {}
    el.setAttribute('data-live', ''); // client-side mounts (soft navigation, /dev/ui replay)
    const end = () => {
      skipped = true;
      setDone(true);
    };
    // The CSS timeline's end. If JS was slow and it already ended, `finished` is resolved.
    for (const a of el.getAnimations()) a.finished.then(end, () => {});
    const leave = () =>
      el
        .animate([{ transform: 'translateY(-100%)' }], { duration: 200, fill: 'forwards' })
        .finished.then(end, () => {});
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') leave();
    };
    el.addEventListener('click', leave); // tap anywhere, or the Skip button (bubbles)
    window.addEventListener('keydown', onKey);
    return () => {
      el.removeEventListener('click', leave);
      window.removeEventListener('keydown', onKey);
    };
  }, [skip, done]);

  useEffect(() => {
    if (done) onDone?.();
  }, [done, onDone]);

  if (skip || done) return null;

  return (
    <>
      <style>{CSS}</style>
      <noscript>
        <style>{'#bp-intro{display:none}'}</style>
      </noscript>
      <div
        ref={ref}
        id="bp-intro"
        suppressHydrationWarning // the inline script may set style / data-live before hydration
        className="fixed inset-0 z-[70] grid place-items-center overflow-hidden bg-blue"
      >
        <Rings data-rings aria-hidden="true" className="absolute -inset-1/4" />
        <div className="relative flex items-center gap-3" aria-hidden="true">
          <span data-bolt>
            <BoltPair side="start" scale={1.8} />
          </span>
          <span data-logo>
            <Logo size={168} />
          </span>
          <span data-bolt>
            <BoltPair side="end" scale={1.8} />
          </span>
        </div>
        <button
          type="button" // click bubbles to the cover's listener
          className={buttonClasses({
            variant: 'ghost',
            size: 'sm',
            className: 'absolute end-4 bottom-6 min-h-11',
          })}
        >
          {t('skip')}
        </button>
      </div>
      {!force && (
        // Server: runs while parsing. Client renders it inert (text/plain) so it never re-runs.
        <script
          type={typeof window === 'undefined' ? 'text/javascript' : 'text/plain'}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: HIDE_SCRIPT }}
        />
      )}
    </>
  );
}
