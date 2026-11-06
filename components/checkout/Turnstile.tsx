'use client';

import Script from 'next/script';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { Tag } from '@/components/ui/states';
import { setTurnstileProvider } from '@/lib/api';
import { USE_MOCKS } from '@/lib/flags';

// Under mocks the default provider stays (MSW accepts any token), even if a key is set.
const SITE_KEY = USE_MOCKS ? undefined : process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
/** A request never waits forever: no token by then → '' and the server answers TURNSTILE_FAILED. */
const WAIT_MS = 20_000;

interface TurnstileApi {
  render(el: HTMLElement, opts: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

/**
 * Cloudflare Turnstile on the order step (§2.3, §7). With NEXT_PUBLIC_TURNSTILE_SITE_KEY set it
 * renders the widget and registers lib/api's token provider: each order/OTP request takes the
 * current token (or waits for one) and the widget resets for the next, since tokens are single-use.
 * Without a key (mocks) it shows a small sticker and lib/api keeps its default mock provider.
 */
export function Turnstile() {
  const t = useTranslations('checkout.turnstile');
  const box = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const token = useRef<string | null>(null);
  const waiters = useRef<((t: string) => void)[]>([]);
  // Script onReady flips this; already true when the script loaded on an earlier mount.
  const [ready, setReady] = useState(() => typeof window !== 'undefined' && !!window.turnstile);

  useEffect(() => {
    if (!SITE_KEY) return;
    setTurnstileProvider(
      () =>
        new Promise<string>((resolve) => {
          let done = false;
          const take = (tk: string) => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            token.current = null;
            if (widget.current) window.turnstile?.reset(widget.current);
            resolve(tk);
          };
          const timer = setTimeout(() => take(''), WAIT_MS);
          if (token.current) take(token.current);
          else waiters.current.push(take);
        }),
    );
    // ponytail: no widget after unmount → empty token (same as lib/api's non-mock default).
    return () => setTurnstileProvider(async () => '');
  }, []);

  useEffect(() => {
    const ts = window.turnstile;
    if (!SITE_KEY || !ready || !ts || !box.current) return;
    const flush = (tk: string) => waiters.current.splice(0).forEach((w) => w(tk));
    const id = ts.render(box.current, {
      sitekey: SITE_KEY,
      appearance: 'interaction-only',
      callback: (tk: string) => {
        token.current = tk;
        flush(tk);
      },
      'expired-callback': () => (token.current = null),
      // Release a waiting "Placing…" right away: '' → TURNSTILE_FAILED → Try again.
      'error-callback': () => flush(''),
    });
    widget.current = id;
    return () => {
      ts.remove(id);
      widget.current = null;
      token.current = null;
    };
  }, [ready]);

  if (!SITE_KEY)
    return (
      <Tag tone="white" tilt={-3} className="text-base">
        {t('mock')}
      </Tag>
    );
  return (
    <>
      <Script src={SRC} onReady={() => setReady(true)} />
      <div ref={box} aria-label={t('label')} />
    </>
  );
}
