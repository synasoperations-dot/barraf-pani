'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

const TABS = [
  { href: '/account', key: 'profile' },
  { href: '/account/orders', key: 'orders' },
  { href: '/account/addresses', key: 'addresses' },
] as const;

/** Profile / Orders / Addresses sticker tabs. */
export function AccountTabs() {
  const t = useTranslations('account.nav');
  const pathname = usePathname();
  return (
    <nav aria-label={t('section')} className="-mx-1 flex gap-2 overflow-x-auto px-1 pt-1 pb-3">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={clsx(
              'inline-flex min-h-11 shrink-0 press items-center rounded-sticker border-3 border-ink px-4 font-sticker font-black shadow-hard-sm [--press-x:3px] [--press-y:3px]',
              active ? 'bg-yellow' : 'bg-white',
            )}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
