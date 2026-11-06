'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Bolt } from '@/components/ui/motifs';
import { StickerHeading } from '@/components/ui/StickerHeading';
import { Stamp } from '@/components/ui/Stamp';
import { Tag } from '@/components/ui/states';
import { tilt } from '@/lib/tilt';

/**
 * TODO_CONFIRM: real reel embed URLs (Instagram: https://www.instagram.com/reel/<id>/embed,
 * TikTok: https://www.tiktok.com/embed/v2/<id>). Hosts are allowed in the CSP frame-src.
 */
const REELS = [
  { key: 'fries', platform: 'instagram', embedUrl: null, bg: 'bg-orange', tilt: -2 },
  { key: 'burger', platform: 'tiktok', embedUrl: null, bg: 'rings', tilt: 1.5 },
  { key: 'pizza', platform: 'instagram', embedUrl: null, bg: 'bg-yellow', tilt: -1 },
] as const satisfies readonly {
  key: string;
  platform: 'instagram' | 'tiktok';
  embedUrl: string | null;
  bg: string;
  tilt: number;
}[];

/** Click-to-load facades: no third-party script or iframe until the play sticker is tapped. */
export function Reels() {
  const t = useTranslations('about.reels');
  const [playing, setPlaying] = useState<string | null>(null);
  return (
    <section aria-labelledby="reels-h" className="overflow-x-clip py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <StickerHeading id="reels-h" tilt={1.5}>
          {t('title')}
        </StickerHeading>
        <p className="mt-4 text-center text-muted">{t('hint')}</p>
        <ul className="mt-10 flex snap-x snap-mandatory gap-6 overflow-x-auto px-1 pt-2 pb-6 md:grid md:grid-cols-3 md:overflow-visible">
          {REELS.map((r) => {
            const name = t(`items.${r.key}`);
            const platform = t(r.platform);
            const url: string | null = r.embedUrl;
            return (
              <li
                key={r.key}
                className="w-[70vw] max-w-72 shrink-0 snap-center md:w-auto md:max-w-none"
                style={{ rotate: tilt(r.tilt) }}
              >
                <div className="relative aspect-[9/16] overflow-hidden rounded-card border-3 border-ink shadow-hard-md">
                  {playing === r.key && url ? (
                    <iframe
                      src={url}
                      title={name}
                      allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                      allowFullScreen
                      className="size-full bg-white"
                    />
                  ) : (
                    <div
                      className={clsx(
                        'flex size-full flex-col items-center justify-center gap-4 p-4',
                        r.bg,
                      )}
                    >
                      <Tag tone="white" className="absolute start-2 top-2 text-base">
                        {platform}
                      </Tag>
                      {url ? (
                        <button
                          type="button"
                          aria-label={t('play', { platform, name })}
                          onClick={() => setPlaying(r.key)}
                          className="grid size-20 press place-items-center rounded-full border-3 border-ink bg-yellow shadow-hard [--press-x:4px] [--press-y:4px]"
                        >
                          <svg viewBox="0 0 24 24" aria-hidden="true" className="ms-1 size-9">
                            <path d="M7 4.5v15l12.5-7.5z" fill="var(--color-ink)" />
                          </svg>
                        </button>
                      ) : (
                        <>
                          <Bolt size={44} />
                          <Stamp tone="white" size="sm">
                            {t('soon')}
                          </Stamp>
                        </>
                      )}
                      <span className="rounded-sticker border-3 border-ink bg-white px-2 py-0.5 text-center font-sticker text-sm font-black text-ink shadow-sticker">
                        {name}
                      </span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
