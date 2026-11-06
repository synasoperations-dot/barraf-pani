import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import {
  BookingNotFound,
  BookingStatusFrame,
  BookingStatusPage,
} from '@/components/deals/BookingStatus';
import { PublicToken } from '@/lib/contracts';
import { pageMeta } from '@/lib/seo/meta';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('deals.status');
  // The URL carries the public token: never index it or leak it via Referer.
  return pageMeta({ path: '/booking', title: t('metaTitle'), noindex: true });
}

export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!PublicToken.safeParse(token).success)
    return (
      <BookingStatusFrame>
        <BookingNotFound />
      </BookingStatusFrame>
    );
  return <BookingStatusPage key={token} token={token} />;
}
