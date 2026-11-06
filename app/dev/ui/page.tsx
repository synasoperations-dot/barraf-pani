import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { StyleGuide } from '@/components/dev/StyleGuide';

export const metadata: Metadata = {
  title: 'Design system · Barraf Paani',
  robots: { index: false },
};

/** Living style guide. Disabled in production builds. */
export default function DevUiPage() {
  if (process.env.NODE_ENV === 'production') notFound();
  return <StyleGuide />;
}
