import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { TrackingView } from '@/components/tracking/TrackingView';
import { api } from '@/lib/api';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('tracking.meta');
  // The token is a secret link: never sent as a Referer, never indexed (§2.1, §7).
  return { title: t('title'), referrer: 'no-referrer', robots: { index: false, follow: false } };
}

/**
 * Server-rendered first, then realtime (§2.1). Under mocks the server can't see browser
 * orders, so `initial` is null and the client fetch takes over.
 */
export default async function TrackOrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const initial = await api.trackOrder(token).catch(() => null);
  return <TrackingView token={token} initial={initial} />;
}
