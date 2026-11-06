'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Bolt } from '@/components/ui/motifs';
import { StickerHeading } from '@/components/ui/StickerHeading';
import { ErrorState, Skeleton } from '@/components/ui/states';
import { Card } from '@/components/ui/surfaces';
import { groupHours } from '@/features/store/hours';
import { useStoreStatus } from '@/features/store/useStore';
import type { StoreStatus } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { SITE } from '@/lib/site';
import { isOffline } from './FanFavourites';

const waHref = `https://wa.me/${SITE.whatsapp.replace(/\D/g, '')}`;

/** Click-to-load map. ponytail: no third-party map at all yet, just a drawn board with the pin; a real embed needs the confirmed place + CSP frame-src. */
export function MapBoard() {
  const t = useTranslations('home.findUs');
  const [shown, setShown] = useState(false);
  const link = useRef<HTMLAnchorElement>(null);
  // Focus moves from the vanished button to the map's link once, not on every re-render.
  useEffect(() => {
    if (shown) link.current?.focus();
  }, [shown]);
  return (
    <div className="relative aspect-[4/3] overflow-hidden rounded-panel border-3 border-ink grid-paper shadow-hard-lg">
      {shown ? (
        <>
          <svg
            viewBox="0 0 400 300"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
            className="absolute inset-0 size-full"
          >
            <g fill="none" strokeLinecap="round">
              <path
                d="M-20 210 C 90 180 150 240 420 170"
                stroke="var(--color-ink)"
                strokeWidth="22"
              />
              <path
                d="M-20 210 C 90 180 150 240 420 170"
                stroke="var(--color-white)"
                strokeWidth="16"
              />
              <path
                d="M150 -20 C 170 90 120 190 180 320"
                stroke="var(--color-ink)"
                strokeWidth="16"
              />
              <path
                d="M150 -20 C 170 90 120 190 180 320"
                stroke="var(--color-yellow)"
                strokeWidth="10"
              />
              <path d="M260 -20 L 300 320" stroke="var(--color-grid-line)" strokeWidth="10" />
            </g>
            <circle
              cx="320"
              cy="70"
              r="34"
              fill="var(--color-blue-light)"
              stroke="var(--color-ink)"
              strokeWidth="3"
            />
          </svg>
          <div className="absolute start-[42%] top-[30%] flex flex-col items-center">
            <span className="rounded-sticker border-3 border-ink bg-white px-2 py-0.5 font-sticker text-sm font-black whitespace-nowrap text-ink shadow-sticker">
              {t('pin')}
            </span>
            {/* Physical corner on purpose: the rotated pin points down in both directions. */}
            <span className="mt-1 grid size-12 rotate-45 place-items-center rounded-full rounded-br-none border-3 border-ink bg-orange shadow-hard-sm">
              <Bolt size={22} className="-rotate-45" />
            </span>
          </div>
          <a
            ref={link}
            href={SITE.mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({
              variant: 'ghost',
              size: 'sm',
              className: 'absolute end-3 bottom-3 min-h-11',
            })}
          >
            {t('openMaps')}
          </a>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4 text-center">
          <Button variant="secondary" onClick={() => setShown(true)}>
            {t('loadMap')}
          </Button>
          <p className="text-sm text-muted">{t('mapHint')}</p>
        </div>
      )}
    </div>
  );
}

interface ViewProps {
  status: StoreStatus | undefined;
  error: unknown;
  onRetry: () => void;
}

export function FindUsView({ status, error, onRetry }: ViewProps) {
  const t = useTranslations('home.findUs');
  const format = useFormatter();
  const h = useId();
  const errorMessage = useErrorMessage();
  // 2024-01-07 is a Sunday, so weekday n (0 = Sunday) is Jan 7 + n. Names come from Intl.
  const day = (n: number) =>
    format.dateTime(new Date(Date.UTC(2024, 0, 7 + n)), { weekday: 'short', timeZone: 'UTC' });
  const time = (hhmm: string) => {
    const [h = 0, m = 0] = hhmm.split(':').map(Number);
    return format.dateTime(new Date(Date.UTC(2024, 0, 1, h, m)), {
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  };

  return (
    <section id="find-us" aria-labelledby={h} className="scroll-mt-24 py-14 md:py-20">
      <div className="mx-auto max-w-6xl px-4">
        <StickerHeading id={h} tilt={-2} halftone>
          {t('title')}
        </StickerHeading>
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          <Card className="flex flex-col gap-6 p-5 md:p-7">
            <div>
              <h3 className="font-sticker text-lg font-black">{t('address')}</h3>
              <p className="mt-1">{SITE.address}</p>
            </div>
            <div>
              <h3 className="font-sticker text-lg font-black">{t('hours')}</h3>
              {status ? (
                <dl className="mt-2 divide-y-2 divide-grid-line">
                  {groupHours(status.openingHours).map((r) => {
                    const first = r.weekdays[0] ?? 0;
                    const last = r.weekdays.at(-1) ?? first;
                    return (
                      <div
                        key={r.weekdays.join()}
                        className="flex flex-wrap justify-between gap-x-4 py-2"
                      >
                        <dt className="font-bold">
                          {first === last
                            ? day(first)
                            : t('days', { from: day(first), to: day(last) })}
                        </dt>
                        <dd className="text-muted">
                          {t('range', { opens: time(r.opens), closes: time(r.closes) })}
                          {r.overnight && <span className="ms-1">{t('nextDay')}</span>}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              ) : error ? (
                <ErrorState
                  className="py-4"
                  offline={isOffline(error)}
                  body={isOffline(error) ? undefined : errorMessage(error)}
                  onRetry={onRetry}
                />
              ) : (
                <div aria-busy="true" className="mt-2 flex flex-col gap-2">
                  <Skeleton className="h-8" />
                  <Skeleton className="h-8" />
                </div>
              )}
            </div>
            <div className="mt-auto flex flex-wrap gap-3">
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: 'whatsapp' })}
              >
                {t('whatsapp')}
              </a>
              <a
                href={SITE.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ variant: 'ghost' })}
              >
                {t('directions')}
              </a>
            </div>
          </Card>
          <MapBoard />
        </div>
      </div>
    </section>
  );
}

export function FindUs({ initial }: { initial?: StoreStatus }) {
  const q = useStoreStatus(initial);
  return <FindUsView status={q.data} error={q.error} onRetry={() => void q.refetch()} />;
}
