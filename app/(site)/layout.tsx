import type { ReactNode } from 'react';
import { ViewTransition } from 'react';
import { CartDrawer } from '@/components/site/CartDrawer';
import { Footer } from '@/components/site/Footer';
import { Header } from '@/components/site/Header';
import { MobileCartBar } from '@/components/site/MobileCartBar';
import { StoreStatusBanner } from '@/components/site/StoreStatusBanner';

/** `modal` = the @modal parallel slot: /item/[slug] opens as a Sheet over the current page (intercepted). */
export default function SiteLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <>
      <Header />
      <StoreStatusBanner />
      {/* Route navigations cross-fade via View Transitions; `.page-fade` is the fallback. */}
      <ViewTransition>
        <main id="main" className="page-fade">
          {children}
        </main>
      </ViewTransition>
      {modal}
      <Footer />
      <MobileCartBar />
      <CartDrawer />
    </>
  );
}
