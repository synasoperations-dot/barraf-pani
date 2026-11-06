'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/form';
import { formatAmount } from '@/lib/format';

/** What the server said about the stored code (derived from the pickup quote). */
export type PromoStatus =
  | { kind: 'none' }
  | { kind: 'checking' }
  | { kind: 'applied'; discount: number }
  /** PROMO_INVALID / PROMO_EXPIRED / PROMO_LIMIT / min order: the code's fault. */
  | { kind: 'invalid'; message: string }
  /** Network / server trouble: offer a retry. */
  | { kind: 'failed'; message: string }
  /** Quote failed for another reason (closed, min order…): don't blame the code. */
  | { kind: 'later' };

interface PromoFieldProps {
  code: string | null;
  status: PromoStatus;
  /** The code this one replaced (one code per order). */
  replaced: string | null;
  onApply: (code: string) => void;
  onRemove: () => void;
  onRetry: () => void;
}

/** One promo code, no stacking. The server validates it; this only shows what it said. */
export function PromoField({
  code,
  status,
  replaced,
  onApply,
  onRemove,
  onRetry,
}: PromoFieldProps) {
  const t = useTranslations('cartFlow');
  const tc = useTranslations('common');
  const tp = useTranslations('price');
  const [draft, setDraft] = useState('');

  let message: ReactNode = null;
  if (code)
    switch (status.kind) {
      case 'checking':
        message = (
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-4 animate-spin rounded-full border-3 border-ink border-e-transparent"
            />
            {t('promoChecking', { code })}
          </span>
        );
        break;
      case 'applied':
        message =
          status.discount > 0
            ? t('promoApplied', {
                code,
                price: tp('rs', { amount: formatAmount(status.discount) }),
              })
            : t('promoAppliedLater', { code });
        break;
      case 'invalid':
        message = (
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-ink bg-orange font-display text-xs"
            >
              !
            </span>
            {status.message}
          </span>
        );
        break;
      case 'later':
        message = t('promoLater', { code });
        break;
      case 'failed':
        message = (
          <span className="flex flex-wrap items-center gap-2">
            {status.message}
            <Button variant="secondary" onClick={onRetry}>
              {tc('retry')}
            </Button>
          </span>
        );
        break;
    }

  return (
    <div className="space-y-2">
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const next = draft.trim();
          if (next) onApply(next);
          setDraft('');
        }}
      >
        <div className="min-w-0 flex-1">
          <Input
            label={t('promoLabel')}
            placeholder={t('promoPlaceholder')}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            maxLength={32}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <Button type="submit" variant="dark" disabled={!draft.trim()}>
          {t('promoApply')}
        </Button>
      </form>

      {code && (
        <div
          className={clsx(
            'flex items-center gap-2 rounded-input border-2 px-3 py-2',
            status.kind === 'invalid' ? 'border-orange-deep bg-paper' : 'border-ink bg-white',
          )}
        >
          <span className="rounded-chip border-2 border-ink bg-yellow px-2 pt-0.5 font-price text-lg tracking-[0.06em]">
            {code}
          </span>
          <p aria-live="polite" className="min-w-0 flex-1 text-sm font-medium">
            {message}
          </p>
          <button
            type="button"
            onClick={onRemove}
            aria-label={t('promoRemove', { code })}
            className="grid size-11 shrink-0 press place-items-center rounded-chip border-2 border-ink bg-white text-xl leading-none shadow-hard-sm [--press-x:3px] [--press-y:3px]"
          >
            ×
          </button>
        </div>
      )}
      <p className="text-sm text-muted">
        {replaced && code ? t('promoReplaced', { code, old: replaced }) : t('promoHint')}
      </p>
    </div>
  );
}
