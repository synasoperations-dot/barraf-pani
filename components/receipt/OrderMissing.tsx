import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/states';

/** Unknown / missing order token (NOT_FOUND) → "Find my order" (/track). Shared by /order and /pay. */
export function OrderMissing() {
  const t = useTranslations('receipt');
  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <EmptyState
        title={t('notFoundTitle')}
        body={t('notFoundBody')}
        action={
          <Link href="/track" className={buttonClasses({ variant: 'secondary' })}>
            {t('findOrder')}
          </Link>
        }
      />
    </div>
  );
}
