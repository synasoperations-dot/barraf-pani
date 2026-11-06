'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/form';
import { Bolt } from '@/components/ui/motifs';
import { Stamp } from '@/components/ui/Stamp';
import { Card } from '@/components/ui/surfaces';
import { toast } from '@/components/ui/Toast';
import { useMenu } from '@/features/menu/useMenu';
import { reorder } from '@/features/orders/reorder';
import { useReviewOrder } from '@/features/tracking/hooks';
import type { Order } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { SITE } from '@/lib/site';
import { useUi } from '@/stores/ui';

const WORD = { 1: 'meh', 3: 'solid', 5: 'furious' } as const;

/** 1–5 as sticker bolts. Native radios (arrow keys, screen readers) under the visuals. */
export function BoltRating({
  value,
  onChange,
  disabled,
}: {
  value: number | null;
  onChange: (n: number) => void;
  disabled?: boolean;
}) {
  const t = useTranslations('tracking.review');
  const name = useId();
  return (
    <fieldset disabled={disabled}>
      <legend className="mb-2 text-sm font-bold">{t('legend')}</legend>
      <div className="flex flex-wrap gap-1 sm:gap-2">
        {[1, 2, 3, 4, 5].map((n) => {
          const word = WORD[n as keyof typeof WORD];
          const lit = value !== null && n <= value;
          return (
            <label
              key={n}
              className={clsx(
                'flex min-h-11 w-14 cursor-pointer flex-col items-center gap-1 rounded-chip p-1 sm:w-16',
                'has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-blue-deep',
              )}
            >
              <input
                type="radio"
                name={name}
                value={n}
                checked={value === n}
                onChange={() => onChange(n)}
                className="sr-only"
                aria-label={`${t('bolts', { n })}${word ? `: ${t(word)}` : ''}`}
              />
              <Bolt
                size={44}
                className={clsx(
                  'transition-[filter,opacity,scale] duration-150',
                  lit ? 'scale-110' : 'opacity-35 grayscale',
                )}
              />
              <span aria-hidden="true" className="h-5 text-xs font-bold">
                {word && t(word)}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** After delivered / picked_up: one review per order, then Google (4–5) and Order again. */
export function ReviewPanel({ order }: { order: Order }) {
  const t = useTranslations('tracking.review');
  const tc = useTranslations('common');
  const message = useErrorMessage();
  const review = useReviewOrder(order.publicToken);
  const [rating, setRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [missing, setMissing] = useState(false);
  const done = order.review;

  return (
    <Card className="flex flex-col gap-5 p-5 md:p-7">
      {done ? (
        <div className="flex flex-col items-start gap-3">
          <Stamp tone="yellow" animate>
            {t('thanksTitle')}
          </Stamp>
          <p className="text-muted">{t('thanksBody')}</p>
          <BoltRating value={done.rating} onChange={() => {}} disabled />
          {done.rating >= 4 && <GoogleReview />}
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (rating === null) return setMissing(true);
            review.mutate({ rating, comment: comment.trim() || null });
          }}
        >
          <h2 className="font-display text-3xl">{t('title')}</h2>
          <BoltRating
            value={rating}
            onChange={(n) => {
              setRating(n);
              setMissing(false);
            }}
          />
          <TextArea
            label={t('comment')}
            optionalLabel={tc('optional')}
            maxLength={500}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          {(missing || review.error) && (
            <p role="alert" className="flex gap-2 font-bold">
              <span aria-hidden="true" className="text-orange-deep">
                !
              </span>
              {missing ? t('pick') : message(review.error)}
            </p>
          )}
          <div>
            <Button type="submit" loading={review.isPending}>
              {t('submit')}
            </Button>
          </div>
        </form>
      )}
      <OrderAgain order={order} />
    </Card>
  );
}

/** TODO_CONFIRM: SITE.googleReviewUrl is null until the client sends the GBP link; hidden till then. */
function GoogleReview() {
  const t = useTranslations('tracking.review');
  const url = SITE.googleReviewUrl;
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-12 -rotate-2 press items-center gap-2 rounded-sticker border-3 border-ink bg-white px-4 font-sticker font-black shadow-sticker"
    >
      <Bolt size={22} />
      {t('google')}
    </a>
  );
}

function OrderAgain({ order }: { order: Order }) {
  const t = useTranslations('tracking');
  const tc = useTranslations('cart');
  const { data: menu, isPending } = useMenu();
  const setCartOpen = useUi((s) => s.setCartOpen);
  return (
    <div className="border-t-3 border-dashed border-ink pt-4">
      <Button
        variant="secondary"
        loading={isPending}
        disabled={!menu}
        onClick={() => {
          if (!menu) return;
          const { added, skipped } = reorder(order, menu);
          if (!added) return void toast(t('reorder.none'));
          toast(
            skipped
              ? t('reorder.skipped', { added, skipped })
              : t('reorder.added', { count: added }),
            { action: { label: tc('viewCart'), onClick: () => setCartOpen(true) } },
          );
        }}
      >
        {t('orderAgain')}
      </Button>
    </div>
  );
}
