import Link from 'next/link';
import type { ReactNode } from 'react';
import { buttonClasses } from '@/components/ui/Button';
import { BoltPair } from '@/components/ui/motifs';

/** A fries bucket knocked over, fries everywhere. Ink outlines, brand fills. */
export function DroppedBucket({ label, className }: { label: string; className?: string }) {
  const fries = [
    [40, 150, -30],
    [70, 168, 12],
    [104, 160, -64],
    [132, 172, 28],
    [168, 166, -12],
    [196, 174, 58],
    [226, 168, -40],
    [258, 176, 18],
  ];
  return (
    <svg viewBox="0 0 320 200" role="img" aria-label={label} className={className}>
      <path d="M8 186h304" stroke="var(--color-ink)" strokeWidth="4" strokeLinecap="round" />
      {/* Bucket on its side, mouth to the left. */}
      <g transform="rotate(-96 230 120)">
        <path
          d="M188 60h84l-12 112h-60Z"
          fill="var(--color-white)"
          stroke="var(--color-ink)"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <path
          d="M204 62l6 108M230 62v108M256 62l-6 108"
          stroke="var(--color-orange)"
          strokeWidth="9"
        />
        <path
          d="M188 60h84l-12 112h-60Z"
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <rect
          x="182"
          y="48"
          width="96"
          height="18"
          rx="5"
          fill="var(--color-blue)"
          stroke="var(--color-ink)"
          strokeWidth="5"
        />
      </g>
      {fries.map(([x, y, r]) => (
        <rect
          key={`${x}-${y}`}
          x={x! - 6}
          y={y! - 26}
          width="12"
          height="44"
          rx="3"
          transform={`rotate(${r} ${x} ${y})`}
          fill="var(--color-yellow)"
          stroke="var(--color-ink)"
          strokeWidth="3.5"
        />
      ))}
    </svg>
  );
}

/** Shared frame for 404 / error / maintenance: grid paper, big stroked headline, actions. */
export function SystemScreen({
  big,
  title,
  body,
  art,
  actions,
  extra,
}: {
  big?: string;
  title: ReactNode;
  body: ReactNode;
  art?: ReactNode;
  actions: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div className="grid-paper">
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 py-14 text-center md:py-20">
        {big && (
          <p
            aria-hidden="true"
            dir="ltr"
            className="font-display text-[clamp(6rem,30vw,13rem)] leading-none text-orange headline"
          >
            {big}
          </p>
        )}
        {art}
        <div className="flex items-center gap-3">
          <BoltPair side="start" />
          <h1 className="font-display text-3xl md:text-5xl">{title}</h1>
          <BoltPair side="end" />
        </div>
        <p className="max-w-xl text-lg text-muted">{body}</p>
        <div className="flex flex-wrap justify-center gap-3">{actions}</div>
        {extra}
      </div>
    </div>
  );
}

export function NotFoundScreen({
  t,
}: {
  t: { title: string; body: string; menu: string; home: string; art: string };
}) {
  return (
    <SystemScreen
      big="404"
      title={t.title}
      body={t.body}
      art={<DroppedBucket label={t.art} className="-mt-6 w-full max-w-sm" />}
      actions={
        <>
          <Link href="/menu" className={buttonClasses({ size: 'lg' })}>
            {t.menu}
          </Link>
          <Link href="/" className={buttonClasses({ variant: 'ghost', size: 'lg' })}>
            {t.home}
          </Link>
        </>
      }
    />
  );
}
