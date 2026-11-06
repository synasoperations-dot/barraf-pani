'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Odometer } from '@/components/ui/Odometer';

export type CtaState =
  | { kind: 'loading' }
  | { kind: 'open' }
  | { kind: 'preorder' }
  /** `label` = "We're closed. Opens at 12:00 PM" / "Orders are paused…" */
  | { kind: 'closed'; label: string }
  /** Sold-out lines must go first. */
  | { kind: 'blocked' };

/** "Estimate" (Odometer) + the one CTA: Checkout / Pre-order / disabled closed label. */
export function CheckoutCta({
  estimate,
  state,
  hint,
  onNavigate,
}: {
  estimate: number;
  state: CtaState;
  /** e.g. the minimum-order nudge. */
  hint?: string | null;
  onNavigate?: () => void;
}) {
  const t = useTranslations('cartFlow');
  const big = { block: true, size: 'lg' } as const;

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-bold">{t('estimate')}</span>
        <Odometer value={estimate} className="text-3xl" />
      </div>
      <p className="text-sm text-muted">{t('estimateNote')}</p>
      {hint && <p className="text-sm font-medium">{hint}</p>}

      {state.kind === 'open' || state.kind === 'preorder' ? (
        <Link
          href={state.kind === 'open' ? '/checkout' : '/checkout?schedule=1'}
          onClick={onNavigate}
          className={buttonClasses({
            ...big,
            variant: state.kind === 'open' ? 'primary' : 'secondary',
          })}
        >
          {t(state.kind === 'open' ? 'checkout' : 'preorder')}
        </Link>
      ) : state.kind === 'loading' ? (
        <Button {...big} loading>
          {t('checkout')}
        </Button>
      ) : state.kind === 'closed' ? (
        // Looks like the disabled button but wraps: closed labels are long.
        <p className="rounded-button border-3 border-ink bg-grid-line px-4 py-3 text-center font-display text-xl leading-tight text-muted">
          {state.label}
        </p>
      ) : (
        <>
          <Button {...big} disabled>
            {t('checkout')}
          </Button>
          <p role="status" className="text-sm font-medium">
            {t('soldOutBlock')}
          </p>
        </>
      )}
    </div>
  );
}
