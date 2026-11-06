import type { ReactNode } from 'react';
import { SiteShell } from '@/components/site/SiteShell';

/** `modal` = the @modal parallel slot: /item/[slug] opens as a Sheet over the current page (intercepted). */
export default function SiteLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return <SiteShell modal={modal}>{children}</SiteShell>;
}
