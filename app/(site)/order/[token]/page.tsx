import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { OrderMissing } from '@/components/receipt/OrderMissing';
import { Receipt } from '@/components/receipt/Receipt';
import { api } from '@/lib/api';
import { PublicToken } from '@/lib/contracts';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('receipt');
  // The URL carries the public token: never index it or leak it via Referer.
  return { title: t('metaTitle'), robots: { index: false }, referrer: 'no-referrer' };
}

/** Receipt + one-time celebration. The server tries the order first; the client takes over live. */
export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ placed?: string | string[] }>;
}) {
  const [{ token }, { placed }] = await Promise.all([params, searchParams]);
  if (!PublicToken.safeParse(token).success) return <OrderMissing />;
  // Under mocks the server can't see browser-made orders → null → the client fetches.
  const initial = await api.trackOrder(token).catch(() => null);
  return <Receipt key={token} token={token} initial={initial} placed={placed === '1'} />;
}
