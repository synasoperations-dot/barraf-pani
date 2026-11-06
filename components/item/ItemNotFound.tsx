'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/states';

/** Unknown slug. In a sheet the link also closes it (ItemDetail hides itself off /item/*). */
export function ItemNotFound() {
  const t = useTranslations('item');
  return (
    <EmptyState
      title={t('notFoundTitle')}
      body={t('notFoundBody')}
      action={
        <Link href="/menu" className={buttonClasses({ variant: 'secondary' })}>
          {t('backToMenu')}
        </Link>
      }
    />
  );
}
