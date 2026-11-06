import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { BoltPair } from '@/components/ui/motifs';
import { StickerHeading } from '@/components/ui/StickerHeading';
import { Tag } from '@/components/ui/states';
import { tilt } from '@/lib/tilt';

/** Big quote sticker: the story behind the name (client copy TBC). */
export function StoryQuote() {
  const t = useTranslations('about.story');
  return (
    <section aria-labelledby="story-h" className="mx-auto max-w-3xl px-4 py-14 md:py-20">
      <StickerHeading id="story-h" tilt={2}>
        {t('title')}
      </StickerHeading>
      <figure
        className="relative mt-10 rounded-panel border-3 border-ink bg-yellow p-6 shadow-hard-lg md:p-10"
        style={{ rotate: tilt(-1) }}
      >
        <span
          aria-hidden="true"
          className="absolute start-4 -top-8 font-display text-8xl leading-none text-white headline-sm"
        >
          “
        </span>
        <blockquote className="font-display text-2xl leading-snug md:text-4xl">
          <p>{t('quote')}</p>
        </blockquote>
        <figcaption className="mt-6 flex items-center gap-2 font-sticker font-black">
          <BoltPair side="start" scale={0.6} />
          {t('by')}
        </figcaption>
      </figure>
    </section>
  );
}

const STUFF = [
  { key: 'bucket', src: '/images/menu/fries-bucket.jpg', tilt: -3 },
  { key: 'wrap', src: '/images/menu/wrap.jpg', tilt: 2.5 },
] as const;

/** Branded bucket + wrap. ponytail: menu photos stand in until the branded shoot (TBC). */
export function OurStuff() {
  const t = useTranslations('about.stuff');
  return (
    <section aria-labelledby="stuff-h" className="mx-auto max-w-6xl px-4 py-14 md:py-20">
      <StickerHeading id="stuff-h" tilt={-1.5}>
        {t('title')}
      </StickerHeading>
      <p className="mx-auto mt-4 max-w-xl text-center text-muted">{t('sub')}</p>
      <ul className="mx-auto mt-10 grid max-w-3xl gap-8 sm:grid-cols-2">
        {STUFF.map((s) => (
          <li key={s.key} style={{ rotate: tilt(s.tilt) }}>
            <figure className="overflow-hidden rounded-card border-3 border-ink bg-white shadow-hard-md">
              <div className="relative aspect-square">
                <Image
                  src={s.src}
                  alt={t(s.key)}
                  fill
                  sizes="(min-width: 640px) 360px, 90vw"
                  className="object-cover"
                />
                <Tag tone="white" className="absolute end-2 top-2 text-base">
                  {t('tbc')}
                </Tag>
              </div>
              <figcaption className="border-t-3 border-ink px-4 py-3 font-sticker text-lg font-black">
                {t(s.key)}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
