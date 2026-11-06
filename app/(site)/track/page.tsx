import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { FindMyOrder } from '@/components/tracking/FindMyOrder';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('tracking.meta');
  return {
    title: t('findTitle'),
    referrer: 'no-referrer',
    robots: { index: false, follow: false },
  };
}

export default function FindMyOrderPage() {
  return <FindMyOrder />;
}
