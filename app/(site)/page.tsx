import { Cravings } from '@/components/home/Cravings';
import { DealsTeaser } from '@/components/home/DealsTeaser';
import { FanFavourites } from '@/components/home/FanFavourites';
import { FindUs } from '@/components/home/FindUs';
import { Hero } from '@/components/home/Hero';
import { Intro } from '@/components/home/Intro';
import { TheSpot } from '@/components/home/TheSpot';
import { WaysBand } from '@/components/home/WaysBand';
import type { Metadata } from 'next';
import { JsonLd } from '@/components/seo/JsonLd';
import { getDealsEvents, getMenu, getStoreStatus } from '@/features/menu/server';
import { buildFacts } from '@/lib/business-facts';
import { restaurantJsonLd } from '@/lib/seo/jsonld';
import { pageMeta } from '@/lib/seo/meta';

/**
 * Home (§2.1): menu and deals are cached with tag `menu`, store status short-cached (~30 s).
 * Each read falls back to null; the client hooks then fetch (skeletons, never blank).
 */
export const metadata: Metadata = pageMeta({ path: '/' });

export default async function HomePage() {
  const [menu, deals, status] = await Promise.all([getMenu(), getDealsEvents(), getStoreStatus()]);
  const m = menu ?? undefined;
  const s = status ?? undefined;
  const facts = buildFacts(status, menu);
  return (
    <>
      <JsonLd data={restaurantJsonLd(facts)} />
      <Intro />
      <Hero menu={m} status={s} />
      <WaysBand />
      <FanFavourites initial={m} />
      <Cravings initial={m} />
      <DealsTeaser initial={deals ?? undefined} />
      <TheSpot />
      <FindUs initial={s} />
    </>
  );
}
