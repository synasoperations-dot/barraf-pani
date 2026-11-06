import type { ReactNode } from 'react';
import { ViewTransition } from 'react';
import { getBusinessFacts } from '@/lib/business-facts';
import { CartDrawer } from './CartDrawer';
import { Footer } from './Footer';
import { Header } from './Header';
import { InstallPrompt } from './InstallPrompt';
import { LocaleFlip } from './LocaleFlip';
import { MobileCartBar } from './MobileCartBar';
import { OfflineBanner } from './OfflineBanner';
import { StoreStatusBanner } from './StoreStatusBanner';

/** Header, status banners, main, footer and the cart UI. Used by the (site) layout and the 404. */
export async function SiteShell({ children, modal }: { children: ReactNode; modal?: ReactNode }) {
  const facts = await getBusinessFacts();
  return (
    <>
      <Header />
      <OfflineBanner />
      <StoreStatusBanner />
      {/* Route navigations cross-fade via View Transitions; `.page-fade` is the fallback. */}
      <ViewTransition>
        <main id="main" className="page-fade">
          {children}
        </main>
      </ViewTransition>
      {modal}
      <Footer facts={facts} />
      <MobileCartBar />
      <CartDrawer />
      <InstallPrompt />
      <LocaleFlip />
    </>
  );
}
