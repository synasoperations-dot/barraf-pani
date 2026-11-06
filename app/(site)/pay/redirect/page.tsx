import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { PayRedirect } from '@/components/payment/PayRedirect';
import { OrderMissing } from '@/components/receipt/OrderMissing';
import { OnlineProvider, PublicToken } from '@/lib/contracts';
import { ALLOW_ONLINE_PAYMENTS, USE_MOCKS } from '@/lib/flags';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('payment');
  return { title: t('metaRedirect'), robots: { index: false }, referrer: 'no-referrer' };
}

/** /pay/redirect?token=…&provider=jazzcash|easypaisa → signed gateway form, auto-posted. */
export default async function PayRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[]; provider?: string | string[] }>;
}) {
  // Mocks accept online payments in payment_* scenarios even with the flag off.
  if (!ALLOW_ONLINE_PAYMENTS && !USE_MOCKS) notFound();
  const { token, provider } = await searchParams;
  const p = OnlineProvider.safeParse(provider);
  if (typeof token !== 'string' || !PublicToken.safeParse(token).success || !p.success)
    return <OrderMissing />;
  return <PayRedirect key={token} token={token} provider={p.data} />;
}
