'use client';

import { useTranslations } from 'next-intl';
import { useEffect } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { SystemScreen } from '@/components/site/SystemScreens';
import { SITE, waHref } from '@/lib/site';

/** A page under (site) crashed: the shell stays; retry re-fetches the segment. */
export default function SiteError({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations('system.error');
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
  useEffect(() => console.error(error), [error]);
  return (
    <SystemScreen
      title={t('title')}
      body={t('body')}
      actions={
        <>
          <Button size="lg" onClick={retry}>
            {t('retry')}
          </Button>
          <a
            href={waHref(SITE.whatsapp, t('whatsappText'))}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: 'whatsapp', size: 'lg' })}
          >
            {t('whatsapp')}
          </a>
        </>
      }
      extra={digest && <p className="text-sm text-muted">{t('code', { digest })}</p>}
    />
  );
}
