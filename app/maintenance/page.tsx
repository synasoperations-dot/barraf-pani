import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { buttonClasses } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { SystemScreen } from '@/components/site/SystemScreens';
import { getBusinessFacts } from '@/lib/business-facts';
import { telHref } from '@/lib/site';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('system.maintenance');
  return { title: t('metaTitle'), robots: { index: false, follow: false } };
}

/**
 * Shown for every page while MAINTENANCE_MODE=true (proxy.ts rewrites here). No site shell:
 * nothing that needs the API. Phone and WhatsApp still work.
 */
export default async function MaintenancePage() {
  const [t, facts] = await Promise.all([getTranslations('system.maintenance'), getBusinessFacts()]);
  return (
    <SystemScreen
      title={t('title')}
      body={t('body')}
      art={<Logo size={120} />}
      actions={
        <>
          <a
            href={telHref(facts.phone)}
            className={buttonClasses({ variant: 'ghost', size: 'lg' })}
          >
            {t('call')}
          </a>
          <a
            href={facts.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ variant: 'whatsapp', size: 'lg' })}
          >
            {t('whatsapp')}
          </a>
        </>
      }
    />
  );
}
