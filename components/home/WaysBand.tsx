import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Bolt, Halftone, Wave } from '@/components/ui/motifs';

const TILTS = ['-rotate-2', 'rotate-1', '-rotate-1'];

/** Wave into the orange band: Delivery / Pickup / Dine-in as white sticker cards. */
export function WaysBand() {
  const t = useTranslations();
  const h = useId();
  const ways = [
    { href: '/menu', title: t('fulfilment.delivery'), body: t('home.ways.deliveryBody') },
    { href: '/menu', title: t('fulfilment.pickup'), body: t('home.ways.pickupBody') },
    { href: '#find-us', title: t('home.ways.dineIn'), body: t('home.ways.dineInBody') },
  ];
  return (
    <section aria-labelledby={h} className="relative">
      <Wave preset="choppy" fillClassName="fill-orange" className="relative -mt-6 md:-mt-10" />
      <div className="bg-orange pb-14">
        <Halftone className="mx-auto mb-8 w-48 max-w-full" />
        <div className="mx-auto max-w-6xl px-4">
          {/* Small text on orange must be ink (DESIGN.md contrast rules). */}
          <h2 id={h} className="mb-8 text-center font-display text-4xl text-white headline-sm">
            {t('fulfilment.label')}
          </h2>
          <ul className="grid gap-5 sm:grid-cols-3">
            {ways.map((w, i) => (
              <li key={w.title}>
                <Link
                  href={w.href}
                  className={`flex h-full press flex-col gap-2 rounded-sticker border-3 border-ink bg-white p-5 text-ink shadow-hard-md [--press-x:6px] [--press-y:6px] ${TILTS[i]}`}
                >
                  <span className="flex items-center gap-2 font-sticker text-2xl font-black">
                    <Bolt size={24} />
                    {w.title}
                  </span>
                  <span className="text-muted">{w.body}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <Wave preset="gentle" fillClassName="fill-paper" className="-mb-px bg-orange" />
    </section>
  );
}
