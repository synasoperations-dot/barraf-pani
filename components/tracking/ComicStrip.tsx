'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { Stamp } from '@/components/ui/Stamp';
import { panelStates, stepFor, type PanelState } from '@/features/tracking/panels';
import type { Order } from '@/lib/contracts';
import { ArtKeyframes, BagArt, CounterArt, FlameArt, PlateArt, ReceiptArt, RideArt } from './art';

type StripOrder = Pick<Order, 'status' | 'fulfilment' | 'rider'>;

/**
 * The tracking comic strip: four panels from the §4.2 state machine (via toCustomerStage).
 * Future panels are greyed, the active one lifts, done panels get a "Done" stamp.
 */
export function ComicStrip({ order }: { order: StripOrder }) {
  const t = useTranslations('tracking');
  const step = stepFor(order) ?? 0;
  const states = panelStates(step);
  const { status } = order;
  const pickup = order.fulfilment === 'pickup';
  const active = (i: number) => states[i] === 'active';

  const panels: { title: string; bubble: string; art: ReactNode; halftone?: boolean }[] = [
    {
      title: t('panels.received'),
      bubble:
        states[0] === 'done'
          ? t('bubble.receivedDone')
          : status === 'accepted'
            ? t('bubble.accepted')
            : t('bubble.waiting'),
      art: (
        <span className="relative">
          <ReceiptArt bob={active(0) && status === 'placed'} />
          {active(0) && status === 'accepted' && (
            <Stamp tone="orange" animate size="sm" className="absolute -end-10 top-6">
              {t('bubble.acceptedStamp')}
            </Stamp>
          )}
        </span>
      ),
    },
    {
      title: t('panels.cooking'),
      bubble:
        states[1] === 'done'
          ? t('bubble.cookingDone')
          : states[1] === 'future'
            ? t('bubble.cookingNext')
            : status === 'ready'
              ? t('bubble.packed')
              : t('bubble.cooking'),
      art: status === 'ready' && !pickup ? <BagArt /> : <FlameArt wiggle={active(1)} />,
      halftone: true,
    },
    pickup
      ? {
          title: t('panels.counter'),
          bubble:
            states[2] === 'done'
              ? t('bubble.rideDone')
              : states[2] === 'future'
                ? t('bubble.counterNext')
                : t('bubble.counter'),
          art: <CounterArt />,
        }
      : {
          title: t('panels.onTheWay'),
          bubble:
            states[2] === 'done'
              ? t('bubble.rideDone')
              : states[2] === 'future'
                ? t('bubble.rideNext')
                : order.rider
                  ? t('bubble.riding', { name: order.rider.name })
                  : t('bubble.ridingNoName'),
          art: <RideArt moving={active(2)} />,
        },
    {
      title: status === 'picked_up' ? t('panels.pickedUp') : t('panels.delivered'),
      bubble: states[3] === 'future' ? t('bubble.finishNext') : t('bubble.delivered'),
      art: <PlateArt />,
      halftone: true,
    },
  ];

  return (
    <>
      <ArtKeyframes />
      <ol aria-label={t('strip.label')} className="grid gap-5 md:grid-cols-2 md:gap-6">
        {panels.map((p, i) => (
          <Panel key={i} n={i + 1} state={states[i]!} {...p} />
        ))}
      </ol>
    </>
  );
}

function Panel({
  n,
  state,
  title,
  bubble,
  art,
  halftone,
}: {
  n: number;
  state: PanelState;
  title: string;
  bubble: string;
  art: ReactNode;
  halftone?: boolean;
}) {
  const t = useTranslations('tracking.strip');
  return (
    <li
      aria-current={state === 'active' ? 'step' : undefined}
      className={clsx(
        'relative isolate flex min-h-60 flex-col overflow-hidden rounded-card border-4 border-ink bg-white transition-[translate,box-shadow] duration-300',
        state === 'future' && 'opacity-45 grayscale',
        state === 'active' ? '-translate-y-1 shadow-hard-lg' : 'shadow-hard-sm',
      )}
    >
      {/* Panel number + caption box, like a comic page. */}
      <div className="flex items-stretch border-b-3 border-ink">
        <span className="grid w-11 shrink-0 place-items-center border-e-3 border-ink bg-yellow font-price text-3xl leading-none">
          {n}
        </span>
        <h2 className="flex-1 px-3 py-2 font-sticker text-lg leading-tight font-black uppercase">
          {title}
        </h2>
      </div>
      <span className="sr-only">
        {t('step', { n })},{' '}
        {t(state === 'done' ? 'done' : state === 'active' ? 'current' : 'upcoming')}
      </span>

      <div className="relative flex flex-1 items-center justify-center px-4 pt-4 pb-2">
        {halftone && (
          <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-25">
            <div className="size-full halftone" />
          </div>
        )}
        {art}
      </div>

      {/* Speech bubble caption with a tail pointing at the art. */}
      <p className="relative mx-4 mb-4 rounded-sticker border-3 border-ink bg-white px-3 py-2 text-center font-bold">
        <span
          aria-hidden="true"
          className="absolute start-8 -top-2.5 size-4 rotate-45 border-s-3 border-t-3 border-ink bg-white"
        />
        <span className="relative">{bubble}</span>
      </p>

      {state === 'done' && (
        <span aria-hidden="true" className="absolute end-3 top-14">
          <Stamp tone="ink" size="sm" tilt={-10}>
            {t('done')}
          </Stamp>
        </span>
      )}
    </li>
  );
}
