'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useId } from 'react';
import { Bolt, Wave } from '@/components/ui/motifs';
import { StickerHeading } from '@/components/ui/StickerHeading';
import { Skeleton } from '@/components/ui/states';
import { topCategories } from '@/features/menu/helpers';
import { useMenu } from '@/features/menu/useMenu';
import type { Menu } from '@/lib/contracts';
import { localized } from '@/lib/format';

const TILTS = [-3, 2, -1, 3, -2, 1];
const pill = (bg = 'bg-white') =>
  `press inline-flex min-h-12 items-center gap-2 rounded-full border-3 border-ink ${bg} px-5 font-sticker text-xl font-black text-ink shadow-hard`;

/** "What's the craving?": category pills in printed-menu order, each → /menu#slug. */
export function CravingsView({ menu, loading }: { menu: Menu | undefined; loading: boolean }) {
  const t = useTranslations();
  const h = useId();
  const locale = useLocale();
  return (
    <section aria-labelledby={h}>
      <Wave preset="blob" fillClassName="fill-blue-deep" className="grid-paper" />
      <div className="bg-blue-deep px-4 py-12 md:py-16">
        <StickerHeading id={h} tilt={2}>
          {t('brand.craving')}
        </StickerHeading>
        <ul className="mx-auto mt-10 flex max-w-6xl flex-wrap justify-center gap-4">
          {menu
            ? topCategories(menu).map((c, i) => (
                <li key={c.id} style={{ rotate: `${TILTS[i % TILTS.length]}deg` }}>
                  <Link href={`/menu#${c.slug}`} className={pill()}>
                    {localized(c.name, locale)}
                  </Link>
                </li>
              ))
            : loading &&
              TILTS.map((tilt) => (
                <li key={tilt} aria-hidden="true">
                  <Skeleton className="h-12 w-32 rounded-full" />
                </li>
              ))}
          {/* Always there, so the section is never blank (menu failed to load, slow network…). */}
          <li style={{ rotate: '-2deg' }}>
            <Link href="/menu" className={pill('bg-yellow')}>
              <Bolt size={22} />
              {t('home.cravings.seeMenu')}
            </Link>
          </li>
        </ul>
      </div>
      <Wave preset="gentle" fillClassName="fill-paper" className="bg-blue-deep" />
    </section>
  );
}

export function Cravings({ initial }: { initial?: Menu }) {
  const { data, isPending } = useMenu(initial);
  return <CravingsView menu={data} loading={isPending} />;
}
