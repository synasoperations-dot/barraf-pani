'use client';

import { useTranslations } from 'next-intl';
import { Bolt } from '@/components/ui/motifs';
import { useOnline } from '@/features/net/useOnline';

/**
 * Site-wide strip while offline. Loaded data (menu, deals) stays on screen from the query cache;
 * checkout disables "Place order" with its own explanation.
 * ponytail: no service worker, so a cold reload offline still fails; add one with the PWA phase.
 */
export function OfflineBanner() {
  const t = useTranslations('system.offline');
  const online = useOnline();
  if (online) return null;
  return (
    <div role="status" className="border-b-3 border-ink bg-ink px-4 py-2.5 text-white">
      <p className="mx-auto flex max-w-6xl items-center justify-center gap-2 text-center font-bold">
        <Bolt size={18} />
        {t('banner')}
      </p>
    </div>
  );
}
