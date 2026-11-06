import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PayReturn } from '@/components/payment/PayReturn';
import { OrderMissing } from '@/components/receipt/OrderMissing';
import { OnlineProvider, PublicToken } from '@/lib/contracts';
import { ALLOW_ONLINE_PAYMENTS, USE_MOCKS } from '@/lib/flags';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('payment');
  return { title: t('metaReturn'), robots: { index: false }, referrer: 'no-referrer' };
}

/** /pay/return?token=… : "Confirming payment…" until the server says placed / failed / expired. */
export default async function PayReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; provider?: string | string[] }>;
}) {
  if (!ALLOW_ONLINE_PAYMENTS && !USE_MOCKS) notFound();
  const { token, provider } = await searchParams;
  if (typeof token !== 'string' || !PublicToken.safeParse(token).success) return <OrderMissing />;
  const p = OnlineProvider.safeParse(provider);
  return <PayReturn key={token} token={token} provider={p.success ? p.data : null} />;
}
