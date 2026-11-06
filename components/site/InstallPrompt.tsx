'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const VISITS = 'bp-visits';
const SEEN = 'bp-visit-counted';
const DISMISSED = 'bp-install-dismissed';

/** Counts one visit per browser session (storage can throw in private modes). */
function visitCount() {
  try {
    let n = Number(localStorage.getItem(VISITS) ?? 0);
    if (!sessionStorage.getItem(SEEN)) {
      sessionStorage.setItem(SEEN, '1');
      localStorage.setItem(VISITS, String(++n));
    }
    return localStorage.getItem(DISMISSED) ? 0 : n;
  } catch {
    return 0;
  }
}

/**
 * "Add to home screen" card, only from the second visit on and only where the browser offers
 * an install (Chrome/Edge/Android `beforeinstallprompt`). Dismiss is remembered.
 */
export function InstallPrompt() {
  const t = useTranslations('system.install');
  const [event, setEvent] = useState<InstallEvent | null>(null);

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault(); // keep the browser's mini-infobar away; we ask at the right time
      if (visitCount() >= 2) setEvent(e as InstallEvent);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    visitCount();
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);

  if (!event) return null;
  const close = () => {
    try {
      localStorage.setItem(DISMISSED, '1');
    } catch {}
    setEvent(null);
  };

  return (
    <div
      role="dialog"
      aria-label={t('title')}
      className="fixed inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md animate-pop items-center gap-3 rounded-card border-3 border-ink bg-white p-3 shadow-hard-md md:bottom-6"
    >
      <Logo size={48} />
      <div className="min-w-0 flex-1">
        <p className="leading-tight font-bold">{t('title')}</p>
        <p className="text-sm text-muted">{t('body')}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-2">
        <Button
          size="sm"
          onClick={() => {
            void event.prompt();
            void event.userChoice.finally(close);
          }}
        >
          {t('install')}
        </Button>
        <Button size="sm" variant="ghost" onClick={close}>
          {t('dismiss')}
        </Button>
      </div>
    </div>
  );
}
