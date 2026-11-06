import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/** Staff apps: never indexed, no site chrome. Each section sets its own shell. */
export const metadata: Metadata = {
  title: { default: 'Staff', template: '%s · Barraf Paani staff' },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
