import clsx from 'clsx';
import type { ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';
import { Bolt, Rings } from '@/components/ui/motifs';

/**
 * The /pay/* sticker screen: blue rings, logo flanked by bolts, a white sticker card.
 * `busy` makes the bolts hop (CSS; collapsed under reduced motion) and marks the card aria-busy.
 */
export function PayScreen({
  title,
  body,
  busy,
  stamp,
  children,
}: {
  title: ReactNode;
  body?: ReactNode;
  busy?: boolean;
  /** A rubber stamp on the card corner (failed / expired). */
  stamp?: ReactNode;
  children?: ReactNode;
}) {
  const bolt = (delay: string, flip?: boolean) => (
    <span
      aria-hidden="true"
      className={clsx(busy && 'animate-bounce', flip && '-scale-x-100')}
      style={{ animationDelay: delay }}
    >
      <Bolt size={34} style={{ transform: 'rotate(-14deg)' }} />
    </span>
  );
  return (
    <Rings className="px-4 py-12 md:py-20">
      <div
        aria-busy={busy || undefined}
        className="mx-auto flex max-w-lg flex-col items-center gap-6 text-center"
      >
        <div className="flex items-end gap-3">
          {bolt('0ms')}
          {bolt('150ms')}
          <Logo size={88} />
          {bolt('300ms', true)}
          {bolt('450ms', true)}
        </div>
        <div
          role="status"
          className="relative w-full rounded-card border-3 border-ink bg-white px-5 py-6 shadow-hard-lg md:px-8"
        >
          {stamp && <div className="absolute -end-3 -top-5">{stamp}</div>}
          <h1 className="font-display text-3xl leading-tight md:text-4xl">{title}</h1>
          {body && <p className="mt-3 text-muted">{body}</p>}
        </div>
        {children && (
          <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
            {children}
          </div>
        )}
      </div>
    </Rings>
  );
}
