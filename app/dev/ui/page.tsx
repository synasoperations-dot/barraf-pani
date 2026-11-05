import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StyleGuide } from '@/components/dev/StyleGuide';

export const metadata: Metadata = {
  title: 'Design system · Barraf Paani',
  robots: { index: false },
};

/** Living style guide. Dev / mock builds only. */
export default function DevUiPage() {
  if (process.env.NEXT_PUBLIC_USE_MOCKS !== 'true' && process.env.NODE_ENV === 'production')
    notFound();
  return <StyleGuide />;
}
