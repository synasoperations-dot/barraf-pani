import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Logo } from '@/components/ui/Logo';
import { BoltPair } from '@/components/ui/motifs';
import { StickerHeading } from '@/components/ui/StickerHeading';
import { Tag } from '@/components/ui/states';

// TODO_CONFIRM: client photos of the shop. Until then these are designed placeholder tiles
// (no <img>, so nothing can 404). Swap each tile's body for a next/image at aspect 4/5.
const TILES = [
  { key: 'counter', bg: 'rings', tilt: -3 },
  { key: 'fryer', bg: 'bg-orange', tilt: 2 },
  { key: 'seats', bg: 'bg-yellow', tilt: -1.5 },
  { key: 'night', bg: 'bg-ink', tilt: 3 },
] as const;

export function TheSpot() {
  const t = useTranslations('home.spot');
  const h = useId();
  return (
    <section aria-labelledby={h} className="overflow-x-clip py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <StickerHeading id={h} tilt={2}>
          {t('title')}
        </StickerHeading>
        <ul className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-4 md:gap-6">
          {TILES.map((tile) => (
            <li
              key={tile.key}
              style={{ rotate: `${tile.tilt}deg` }}
              className={clsx(
                'relative flex aspect-[4/5] flex-col items-center justify-center gap-3 overflow-hidden rounded-card border-3 border-ink p-3 shadow-hard-md',
                tile.bg,
              )}
            >
              <span className="flex items-center gap-1">
                <BoltPair side="start" scale={0.8} />
                <Logo size={64} />
                <BoltPair side="end" scale={0.8} />
              </span>
              <span className="rounded-sticker border-3 border-ink bg-white px-2 py-0.5 text-center font-sticker text-sm font-black text-ink shadow-sticker md:text-base">
                {t(tile.key)}
              </span>
              <Tag tone="white" className="absolute end-2 top-2 text-base">
                {t('soon')}
              </Tag>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
