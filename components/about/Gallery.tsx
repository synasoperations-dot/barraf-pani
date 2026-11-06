'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Logo } from '@/components/ui/Logo';
import { BoltPair } from '@/components/ui/motifs';
import { StickerHeading } from '@/components/ui/StickerHeading';
import { Tag } from '@/components/ui/states';
import { tilt } from '@/lib/tilt';

// TODO_CONFIRM: client ambiance photos. Designed placeholder tiles until then (no <img> to 404);
// swap each tile body for a next/image keeping its aspect ratio.
const TILES = [
  { key: 'counter', bg: 'rings', aspect: 'aspect-[4/5]', tilt: -2.5 },
  { key: 'fryer', bg: 'bg-orange', aspect: 'aspect-square', tilt: 2 },
  { key: 'seats', bg: 'bg-yellow', aspect: 'aspect-[3/4]', tilt: -1 },
  { key: 'night', bg: 'bg-ink', aspect: 'aspect-[4/3]', tilt: 3 },
  { key: 'crew', bg: 'bg-blue-light', aspect: 'aspect-[4/5]', tilt: -3 },
  { key: 'neon', bg: 'bg-orange-deep', aspect: 'aspect-square', tilt: 1.5 },
  { key: 'buckets', bg: 'grid-paper', aspect: 'aspect-[3/4]', tilt: -1.5 },
  { key: 'street', bg: 'rings', aspect: 'aspect-[4/3]', tilt: 2.5 },
] as const;
type TileKey = (typeof TILES)[number]['key'];

function TileArt({ bg, label, big }: { bg: string; label: string; big?: boolean }) {
  const t = useTranslations('about.gallery');
  return (
    <span
      className={clsx('relative flex size-full flex-col items-center justify-center gap-3 p-3', bg)}
    >
      <span className="flex items-center gap-1">
        <BoltPair side="start" scale={big ? 1.2 : 0.7} />
        <Logo size={big ? 110 : 56} />
        <BoltPair side="end" scale={big ? 1.2 : 0.7} />
      </span>
      <span
        className={clsx(
          'rounded-sticker border-3 border-ink bg-white px-2 py-0.5 text-center font-sticker font-black text-ink shadow-sticker',
          big ? 'text-xl' : 'text-sm',
        )}
      >
        {label}
      </span>
      <Tag tone="white" className="absolute end-2 top-2 text-base">
        {t('soon')}
      </Tag>
    </span>
  );
}

/** Masonry (CSS columns) of tilted photo tiles + a lightbox (<dialog>: ←/→/Esc, swipe). */
export function Gallery() {
  const t = useTranslations('about.gallery');
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const swipeX = useRef<number | null>(null);
  const total = TILES.length;
  const current = index === null ? null : TILES[index];
  const name = (k: TileKey) => t(`tiles.${k}`);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (index !== null && !d.open) d.showModal();
    if (index === null && d.open) d.close();
  }, [index]);

  const step = (by: number) => setIndex((i) => (i === null ? i : (i + by + total) % total));
  // "Next" is to the inline end: right in LTR, left in RTL.
  const rtl = () => document.documentElement.dir === 'rtl';
  const close = () => {
    setIndex(null);
    opener.current?.focus();
  };

  return (
    <section aria-labelledby="gallery-h" className="overflow-x-clip bg-white py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <StickerHeading id="gallery-h" tilt={-2} halftone>
          {t('title')}
        </StickerHeading>
        <p className="mt-4 text-center text-muted">{t('hint')}</p>
        <ul className="mt-10 columns-2 gap-5 md:columns-3 lg:columns-4 [&>li]:mb-6">
          {TILES.map((tile, i) => (
            <li key={tile.key} className="break-inside-avoid" style={{ rotate: tilt(tile.tilt) }}>
              <button
                type="button"
                onClick={(e) => {
                  opener.current = e.currentTarget;
                  setIndex(i);
                }}
                className={clsx(
                  'block w-full press overflow-hidden rounded-card border-3 border-ink shadow-hard-md [--press-x:6px] [--press-y:6px]',
                  tile.aspect,
                )}
              >
                <span className="sr-only">{t('openPrefix')} </span>
                <TileArt bg={tile.bg} label={name(tile.key)} />
              </button>
            </li>
          ))}
        </ul>
      </div>

      <dialog
        ref={dialog}
        aria-label={
          current && index !== null
            ? t('dialog', { n: index + 1, total, name: name(current.key) })
            : undefined
        }
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        onClick={(e) => e.target === e.currentTarget && close()}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') step(rtl() ? -1 : 1);
          if (e.key === 'ArrowLeft') step(rtl() ? 1 : -1);
        }}
        onPointerDown={(e) => (swipeX.current = e.clientX)}
        onPointerUp={(e) => {
          if (swipeX.current === null) return;
          const dx = e.clientX - swipeX.current;
          swipeX.current = null;
          if (Math.abs(dx) < 50) return;
          // Swiping toward the inline start brings the next photo in.
          step(dx < 0 !== rtl() ? 1 : -1);
        }}
        className="m-auto w-[min(92vw,640px)] max-w-none touch-pan-y overflow-visible bg-transparent p-0 backdrop:bg-ink/80 open:flex open:flex-col open:items-center open:gap-4"
      >
        {current && index !== null && (
          <>
            <figure className="w-full">
              <div
                className={clsx(
                  'w-full overflow-hidden rounded-panel border-3 border-ink shadow-hard-lg select-none',
                  current.aspect,
                )}
              >
                <TileArt bg={current.bg} label={name(current.key)} big />
              </div>
              <figcaption className="mt-3 text-center font-bold text-white">
                <span dir="ltr">
                  {index + 1} / {total}
                </span>
                <span className="block text-sm text-white/80">{t('swipe')}</span>
              </figcaption>
            </figure>
            <div className="flex items-center gap-3">
              <NavButton label={t('prev')} onClick={() => step(-1)} glyph="‹" />
              <button
                type="button"
                onClick={close}
                className="min-h-12 press rounded-button border-3 border-ink bg-white px-5 font-display text-xl text-ink shadow-hard"
              >
                {t('close')}
              </button>
              <NavButton label={t('next')} onClick={() => step(1)} glyph="›" />
            </div>
          </>
        )}
      </dialog>
    </section>
  );
}

function NavButton({
  label,
  onClick,
  glyph,
}: {
  label: string;
  onClick: () => void;
  glyph: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="grid size-12 press place-items-center rounded-button border-3 border-ink bg-yellow font-display text-3xl leading-none text-ink shadow-hard rtl:-scale-x-100"
    >
      <span aria-hidden="true">{glyph}</span>
    </button>
  );
}
