'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Button } from './Button';
import { Bolt } from './motifs';

/* ---------- Skeleton ---------- */

/** Grid-paper shimmer placeholder. Size it with className (e.g. `h-40 rounded-card`). */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={clsx('animate-shimmer rounded-input border-3 border-grid-line', className)}
      style={{
        backgroundColor: 'var(--color-paper)',
        backgroundImage:
          'linear-gradient(100deg, transparent 30%, rgb(255 255 255 / 0.9) 50%, transparent 70%), linear-gradient(var(--color-grid-line) 1px, transparent 1px), linear-gradient(90deg, var(--color-grid-line) 1px, transparent 1px)',
        backgroundSize: '200% 100%, 22px 22px, 22px 22px',
      }}
    />
  );
}

/* ---------- Empty / Error ---------- */

interface StateProps {
  title?: ReactNode;
  body?: ReactNode;
  action?: ReactNode;
  className?: string;
}

function StateFrame({
  title,
  body,
  action,
  className,
  tone,
}: StateProps & { tone: 'empty' | 'error' }) {
  return (
    <div className={clsx('flex flex-col items-center gap-4 px-4 py-10 text-center', className)}>
      <div className="flex items-end gap-1" aria-hidden="true">
        <Bolt size={tone === 'error' ? 30 : 22} style={{ transform: 'rotate(-18deg)' }} />
        <span
          className={clsx(
            'grid size-20 place-items-center rounded-full border-3 border-ink font-display text-4xl shadow-hard-sm',
            tone === 'error' ? 'bg-orange text-white' : 'bg-blue-light text-ink',
          )}
        >
          {tone === 'error' ? '!' : '?'}
        </span>
        <Bolt
          size={tone === 'error' ? 22 : 30}
          style={{ transform: 'scaleX(-1) rotate(-18deg)' }}
        />
      </div>
      <h3 className="font-display text-3xl">{title}</h3>
      {body && <p className="max-w-sm text-muted">{body}</p>}
      {action}
    </div>
  );
}

export function EmptyState(props: StateProps) {
  const t = useTranslations('states');
  return <StateFrame tone="empty" {...props} title={props.title ?? t('emptyTitle')} />;
}

/** Friendly error, never blamey. Pass `onRetry` for the default "Try again" button. */
export function ErrorState({
  onRetry,
  offline,
  ...props
}: StateProps & { onRetry?: () => void; offline?: boolean }) {
  const t = useTranslations();
  return (
    <StateFrame
      tone="error"
      title={props.title ?? (offline ? t('states.offlineTitle') : t('states.errorTitle'))}
      body={props.body ?? (offline ? t('states.offlineBody') : t('states.errorBody'))}
      action={
        props.action ??
        (onRetry && (
          <Button variant="secondary" onClick={onRetry}>
            {t('common.retry')}
          </Button>
        ))
      }
      className={props.className}
    />
  );
}

/* ---------- Tag ---------- */

const TAG_TONES = {
  yellow: 'bg-yellow text-ink',
  blue: 'bg-blue-deep text-white',
  white: 'bg-white text-ink',
  ink: 'bg-ink text-white',
  orange: 'bg-orange text-ink',
} as const;

/** Small label ("NEW", "SOLD OUT", "TBC"). Optional tilt for floating price tags (±5°). */
export function Tag({
  children,
  tone = 'yellow',
  tilt = 0,
  className,
}: {
  children: ReactNode;
  tone?: keyof typeof TAG_TONES;
  tilt?: number;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-chip border-2 border-ink px-2 pt-0.5 font-price text-lg leading-6 tracking-[0.02em] uppercase',
        TAG_TONES[tone],
        className,
      )}
      style={tilt ? { transform: `rotate(${tilt}deg)` } : undefined}
    >
      {children}
    </span>
  );
}
