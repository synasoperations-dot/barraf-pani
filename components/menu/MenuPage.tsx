'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/form';
import { Bolt, Rings, Wave } from '@/components/ui/motifs';
import { EmptyState, ErrorState } from '@/components/ui/states';
import { StickerHeading } from '@/components/ui/StickerHeading';
import { useMenu } from '@/features/menu/useMenu';
import { topCategories } from '@/features/menu/helpers';
import { orderingMode, useStoreStatus } from '@/features/store/useStore';
import { track } from '@/lib/analytics';
import { isApiError } from '@/lib/api';
import { useErrorMessage } from '@/lib/errors';
import type { Menu, StoreStatus } from '@/lib/contracts';
import { CategoryBar } from './CategoryBar';
import { MenuBoards, MenuSkeleton, menuView, shows } from './boards';

/** Closed / pre-order / paused note in the page header. Chips still add; checkout blocks ordering. */
export function StoreNotice({ status }: { status: StoreStatus | undefined }) {
  const t = useTranslations('menuPage');
  const mode = orderingMode(status);
  if (!status || mode === 'open') return null;
  return (
    <p className="flex items-center gap-2 rounded-sticker border-3 border-ink bg-yellow px-4 py-2 text-start font-bold text-ink shadow-hard-sm">
      <Bolt size={20} />
      {status.state === 'paused'
        ? t('pausedNotice')
        : mode === 'preorder'
          ? t('preorderNotice')
          : t('closedNotice')}
    </p>
  );
}

export interface MenuScreenProps {
  menu: Menu | undefined;
  status: StoreStatus | undefined;
  error?: unknown;
  onRetry?: () => void;
}

/** The whole /menu screen for given data (also rendered by /dev/ui in every state). */
export function MenuScreen({ menu, status, error, onRetry }: MenuScreenProps) {
  const t = useTranslations('menuPage');
  const locale = useLocale();
  const message = useErrorMessage();
  const [query, setQuery] = useState('');
  const search = useRef<HTMLInputElement>(null);
  const q = useDeferredValue(query);
  const view = useMemo(() => menu && menuView(menu, q, locale), [menu, q, locale]);
  const pills = view ? topCategories(view.menu).filter((c) => shows(view, c.slug)) : [];

  // Deep links (/menu#burgers) when the boards only render after the client fetch.
  const ready = Boolean(view);
  useEffect(() => {
    if (ready && location.hash)
      document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  }, [ready]);

  const offline =
    (isApiError(error) && error.code === 'NETWORK_ERROR') ||
    (typeof navigator !== 'undefined' && !navigator.onLine);

  return (
    <>
      <Rings className="px-4 pt-10 pb-14 md:pt-14 md:pb-20">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 text-center">
          <StickerHeading as="h1" size="lg" tilt={-2}>
            {t('title')}
          </StickerHeading>
          <p className="rounded-sticker border-3 border-ink bg-white px-4 py-2 font-medium text-ink shadow-hard-sm">
            {t('sub')}
          </p>
          <StoreNotice status={status} />
          <div
            role="search"
            className="w-full max-w-md rounded-card border-3 border-ink bg-white p-4 text-start shadow-hard-md"
          >
            <Input
              ref={search}
              type="search"
              label={t('searchLabel')}
              placeholder={t('searchPlaceholder')}
              autoComplete="off"
              enterKeyHint="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={!view}
            />
          </div>
          <p role="status" className="sr-only">
            {view?.q ? t('results', { count: view.count }) : ''}
          </p>
        </div>
      </Rings>
      <Wave preset="gentle" fillClassName="fill-paper" className="relative -mt-6 md:-mt-10" />
      <CategoryBar cats={pills} />

      <div className="mx-auto max-w-6xl px-4 pt-6 pb-16">
        {view ? (
          view.count > 0 ? (
            <MenuBoards view={view} />
          ) : view.q ? (
            <EmptyState
              title={t('emptyTitle')}
              body={t('emptyBody', { query: query.trim() })}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setQuery('');
                    search.current?.focus();
                  }}
                >
                  {t('clearSearch')}
                </Button>
              }
            />
          ) : (
            <EmptyState />
          )
        ) : error ? (
          <ErrorState
            onRetry={onRetry}
            offline={offline}
            body={offline ? undefined : message(error)}
          />
        ) : (
          <MenuSkeleton />
        )}
      </div>
    </>
  );
}

/** Client island for /menu: cached server menu as `initial`, live sold-out via useMenu. */
export function MenuPage({
  initialMenu,
  initialStatus,
}: {
  initialMenu?: Menu;
  initialStatus?: StoreStatus;
}) {
  const menu = useMenu(initialMenu);
  const { data: status } = useStoreStatus(initialStatus);
  useEffect(() => track('menu_viewed', {}), []);
  return (
    <MenuScreen
      menu={menu.data}
      status={status}
      error={menu.error}
      onRetry={() => void menu.refetch()}
    />
  );
}
