'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PageHeader } from '@/components/site/PageHeader';
import { Button, buttonClasses } from '@/components/ui/Button';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { StickerHeading } from '@/components/ui/StickerHeading';
import { Card } from '@/components/ui/surfaces';
import { toast } from '@/components/ui/Toast';
import { addDealToCart } from '@/features/deals/addDeal';
import { useDealsEvents, useMenu } from '@/features/menu/useMenu';
import { isApiError } from '@/lib/api';
import type { BookingType, Deal, DealsEvents, Event, Menu } from '@/lib/contracts';
import { SITE } from '@/lib/site';
import { useCart } from '@/stores/cart';
import { useUi } from '@/stores/ui';
import { BookingSheet } from './BookingSheet';
import { DealCoupon, EventPoster } from './cards';

interface SheetState {
  open: boolean;
  type: BookingType;
  event: Event | null;
}

export interface DealsScreenProps {
  data: DealsEvents | undefined;
  menu: Menu | undefined;
  error?: unknown;
  onRetry?: () => void;
}

/** The /deals screen for given data (also rendered by /dev/ui in each state). */
export function DealsScreen({ data, menu, error, onRetry }: DealsScreenProps) {
  const t = useTranslations('deals');
  const tCart = useTranslations('cart');
  const [sheet, setSheet] = useState<SheetState>({ open: false, type: 'table', event: null });
  const book = (type: BookingType, event: Event | null = null) =>
    setSheet({ open: true, type, event });
  const [now] = useState(() => Date.now());

  const deals = data?.deals ?? [];
  // The server already hides past events; this catches one ending while the page is open.
  const events = (data?.events ?? []).filter((e) => Date.parse(e.endsAt) >= now);

  function order(deal: Deal) {
    if (!menu) return;
    const { added, skipped } = addDealToCart(deal, menu);
    const openCart = () => useUi.getState().setCartOpen(true);
    if (!added) toast(t('deal.none'));
    else if (skipped)
      toast(t('deal.skipped', { count: skipped }), {
        action: { label: tCart('viewCart'), onClick: openCart },
      });
    else openCart();
  }

  function copyCode(code: string) {
    void navigator.clipboard?.writeText(code).catch(() => {});
    useCart.getState().setPromoCode(code);
    toast(t('deal.copied', { code }));
  }

  let body;
  if (!data && error) {
    const offline = isApiError(error) && error.code === 'NETWORK_ERROR';
    body = (
      <ErrorState
        offline={offline}
        title={offline ? undefined : t('loadError')}
        onRetry={onRetry}
      />
    );
  } else if (!data) {
    body = (
      <div aria-busy="true" className="grid gap-8 md:grid-cols-2">
        <Skeleton className="h-72 rounded-card" />
        <Skeleton className="h-72 rounded-card" />
      </div>
    );
  } else if (!deals.length && !events.length) {
    body = (
      <Card className="p-2">
        <EmptyState
          title={t('emptyTitle')}
          body={t('emptyBody')}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              {SITE.socials.instagram && (
                <a
                  href={SITE.socials.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonClasses({ variant: 'ghost' })}
                >
                  {t('followInstagram')}
                </a>
              )}
              <Button variant="secondary" onClick={() => book('table')}>
                {t('bookTable')}
              </Button>
            </div>
          }
        />
      </Card>
    );
  } else {
    body = (
      <div className="flex flex-col gap-16">
        {deals.length > 0 && (
          <section aria-labelledby="deals-h">
            <StickerHeading id="deals-h" tilt={-2} halftone>
              {t('dealsTitle')}
            </StickerHeading>
            <ul className="mt-10 grid gap-8 md:grid-cols-2">
              {deals.map((d, i) => (
                <li key={d.id}>
                  <DealCoupon
                    deal={d}
                    menu={menu}
                    index={i}
                    onOrder={() => order(d)}
                    onCopyCode={copyCode}
                  />
                </li>
              ))}
            </ul>
          </section>
        )}
        {events.length > 0 && (
          <section aria-labelledby="events-h">
            <StickerHeading id="events-h" tilt={2} halftone>
              {t('eventsTitle')}
            </StickerHeading>
            <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e, i) => (
                <li key={e.id}>
                  <EventPoster event={e} index={i} onBook={() => book('event', e)} />
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={t('title')}
        sub={t('sub')}
        actions={
          <Button variant="secondary" size="lg" onClick={() => book('table')}>
            {t('bookTable')}
          </Button>
        }
      />
      <div className="grid-paper">
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16">{body}</div>
      </div>
      <BookingSheet
        open={sheet.open}
        type={sheet.type}
        event={sheet.event}
        onClose={() => setSheet((s) => ({ ...s, open: false }))}
      />
    </>
  );
}

export function DealsPage({ initial, initialMenu }: { initial?: DealsEvents; initialMenu?: Menu }) {
  const q = useDealsEvents(initial);
  const { data: menu } = useMenu(initialMenu);
  return <DealsScreen data={q.data} menu={menu} error={q.error} onRetry={() => void q.refetch()} />;
}
