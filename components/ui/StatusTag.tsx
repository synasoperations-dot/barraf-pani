'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import type { OrderSource, OrderStatus } from '@/lib/contracts';

/** 24×24 stroke icons (ink, 2.4px). Every status/source has its own glyph: never colour alone. */
const ICON: Record<string, string> = {
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z',
  bell: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Zm4 4h4',
  check: 'M5 12.5 10 17 19 7',
  flame: 'M12 21c4 0 6-2.7 6-6 0-4-3-6-4-10-2 2-3 4-3 6-1-1-2-2-2-4-2 2-3 4.5-3 8 0 3.3 2 6 6 6Z',
  bag: 'M5 8h14l-1 12H6L5 8Zm4 0V6a3 3 0 0 1 6 0v2',
  scooter:
    'M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM9 17h6l2-7h-4M13 6h3l1 4',
  double: 'M3 12.5 7 16.5 15 7M10 15l1.5 1.5L21 7',
  cross: 'M6 6l12 12M18 6 6 18',
  stop: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM5.6 5.6l12.8 12.8',
  alert: 'M12 8v5m0 3.5v.5M12 3 2 20h20L12 3Z',
  hourglass: 'M7 3h10M7 21h10M8 3c0 5 8 5 8 9s-8 4-8 9M16 3c0 5-8 5-8 9s8 4 8 9',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm-9-9h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
  chat: 'M4 19.5 5.5 15A8 8 0 1 1 9 18.5L4 19.5Z',
  phone:
    'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  person: 'M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 10a7 7 0 0 1 14 0',
};

function Glyph({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-4 shrink-0">
      <path
        d={ICON[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Light → dark roughly follows the lifecycle; terminal states are greyed or ink. */
const STATUS: Record<OrderStatus, { icon: string; cls: string }> = {
  pending_payment: { icon: 'clock', cls: 'bg-white text-ink border-dashed' },
  placed: { icon: 'bell', cls: 'bg-yellow text-ink' },
  accepted: { icon: 'check', cls: 'bg-blue-light text-ink' },
  preparing: { icon: 'flame', cls: 'bg-orange text-ink' },
  ready: { icon: 'bag', cls: 'bg-blue text-ink' },
  out_for_delivery: { icon: 'scooter', cls: 'bg-blue-deep text-white' },
  delivered: { icon: 'double', cls: 'bg-ink text-white' },
  picked_up: { icon: 'double', cls: 'bg-ink text-white' },
  cancelled: { icon: 'cross', cls: 'bg-paper text-muted' },
  rejected: { icon: 'stop', cls: 'bg-paper text-ink' },
  payment_failed: { icon: 'alert', cls: 'bg-white text-ink border-orange-deep' },
  expired: { icon: 'hourglass', cls: 'bg-grid-line text-muted' },
};

const base =
  'inline-flex items-center gap-1.5 rounded-full border-2 border-ink px-2.5 py-0.5 text-sm font-bold leading-6 whitespace-nowrap';

/** One tag per order_status: icon + label + lightness, never colour alone. */
export function StatusTag({ status, className }: { status: OrderStatus; className?: string }) {
  const t = useTranslations('status');
  const s = STATUS[status];
  return (
    <span className={clsx(base, s.cls, className)}>
      <Glyph name={s.icon} />
      {t(status)}
    </span>
  );
}

const SOURCE: Record<OrderSource, { icon: string; cls: string }> = {
  website: { icon: 'globe', cls: 'bg-white text-ink' },
  whatsapp: { icon: 'chat', cls: 'bg-whatsapp text-ink' },
  phone: { icon: 'phone', cls: 'bg-yellow text-ink' },
  walk_in: { icon: 'person', cls: 'bg-paper text-ink' },
  foodpanda: { icon: 'bag', cls: 'bg-paper text-ink border-dashed' },
};

/** Website / WhatsApp / Phone label shown everywhere staff see an order (ADDITION §A1). */
export function SourceTag({ source, className }: { source: OrderSource; className?: string }) {
  const t = useTranslations('source');
  const s = SOURCE[source];
  return (
    <span className={clsx(base, s.cls, className)}>
      <Glyph name={s.icon} />
      {t(source)}
    </span>
  );
}
