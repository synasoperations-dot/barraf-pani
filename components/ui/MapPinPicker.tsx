'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import type { GeoPoint } from '@/lib/contracts';
import { SITE } from '@/lib/site';
import { Button } from './Button';
import { Input } from './form';

/**
 * The interface every map implementation must satisfy. The real Google Maps / Mapbox picker
 * (ARCHITECTURE §10) replaces MapPinPicker below without changing callers.
 */
export interface MapPinPickerProps {
  value: GeoPoint | null;
  onChange: (point: GeoPoint) => void;
  /** Where the map opens when there is no value yet. */
  center?: GeoPoint;
  /** Shown under the map, e.g. a zone/fee hint or an OUTSIDE_ZONE message. */
  message?: string;
  className?: string;
}

const round = (n: number) => Math.round(n * 1e5) / 1e5;

/**
 * Placeholder implementation: "use my location" + manual coordinates on a sticker-style
 * grid-paper board with a pin. TODO(backend phase, docs/OPEN_QUESTIONS.md): real Google Maps / Mapbox map, §10.
 */
export function MapPinPicker({
  value,
  onChange,
  center = SITE.geo,
  message,
  className,
}: MapPinPickerProps) {
  const t = useTranslations('map');
  const [state, setState] = useState<'idle' | 'locating' | 'denied'>('idle');
  const point = value ?? center;

  const locate = () => {
    if (!navigator.geolocation) return setState('denied');
    setState('locating');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState('idle');
        onChange({ lat: round(pos.coords.latitude), lng: round(pos.coords.longitude) });
      },
      () => setState('denied'),
      { enableHighAccuracy: true, timeout: 10_000 },
    );
  };

  const setCoord = (key: keyof GeoPoint, raw: string) => {
    const n = Number(raw);
    if (Number.isFinite(n)) onChange({ ...point, [key]: n });
  };

  return (
    <div className={clsx('space-y-3', className)}>
      <div className="relative grid aspect-[4/3] place-items-center overflow-hidden rounded-card border-3 border-ink grid-paper">
        <span className="absolute start-3 top-3 rounded-chip border-2 border-ink bg-white px-2 text-xs font-bold">
          {t('placeholder')}
        </span>
        {/* Pin */}
        <svg
          viewBox="0 0 40 52"
          aria-hidden="true"
          className="h-14 w-11 -translate-y-3 drop-shadow-none"
        >
          <path
            d="M20 50s16-17 16-29a16 16 0 1 0-32 0c0 12 16 29 16 29Z"
            fill="var(--color-orange)"
            stroke="var(--color-ink)"
            strokeWidth="3"
          />
          <circle
            cx="20"
            cy="21"
            r="6"
            fill="var(--color-yellow)"
            stroke="var(--color-ink)"
            strokeWidth="2.5"
          />
        </svg>
        <span className="absolute bottom-3 rounded-chip border-2 border-ink bg-white px-2 font-mono text-xs">
          {value ? t('picked', { lat: value.lat, lng: value.lng }) : t('hint')}
        </span>
      </div>

      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={state === 'locating'}
        onClick={locate}
      >
        {state === 'locating' ? t('locating') : t('useLocation')}
      </Button>
      {state === 'denied' && <p className="text-sm text-ink">{t('denied')}</p>}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label={t('lat')}
          inputMode="decimal"
          value={point.lat}
          onChange={(e) => setCoord('lat', e.target.value)}
        />
        <Input
          label={t('lng')}
          inputMode="decimal"
          value={point.lng}
          onChange={(e) => setCoord('lng', e.target.value)}
        />
      </div>
      {message && <p className="text-sm font-medium">{message}</p>}
    </div>
  );
}
