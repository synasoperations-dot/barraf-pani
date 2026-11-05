import clsx from 'clsx';
import type { ComponentPropsWithoutRef } from 'react';
import { Blob } from './motifs';

type DivProps = ComponentPropsWithoutRef<'div'>;

/** White card: 3px ink outline, 22px radius, 6px hard shadow. `interactive` adds the press effect. */
export function Card({ className, interactive, ...rest }: DivProps & { interactive?: boolean }) {
  return (
    <div
      className={clsx(
        'rounded-card border-3 border-ink bg-white shadow-hard-md',
        interactive && 'press cursor-pointer [--press-x:6px] [--press-y:6px]',
        className,
      )}
      {...rest}
    />
  );
}

/** Grid-paper menu board: 3px outline, 28px radius, 8px shadow. */
export function MenuBoard({ className, ...rest }: DivProps) {
  return (
    <div
      className={clsx(
        'rounded-panel border-3 border-ink grid-paper p-4 shadow-hard-lg md:p-6',
        className,
      )}
      {...rest}
    />
  );
}

type PanelTone = 'orange' | 'orange-deep' | 'blue';

const TONES: Record<PanelTone, string> = {
  orange: 'bg-orange',
  'orange-deep': 'bg-orange-deep',
  blue: 'rings',
};

/**
 * Orange or blue rounded panel (text inside: white at display sizes, ink below 18px).
 * `blobs` scatters decorative circles.
 */
export function Panel({
  tone = 'orange',
  blobs,
  className,
  children,
  ...rest
}: DivProps & { tone?: PanelTone; blobs?: boolean }) {
  return (
    <div
      className={clsx(
        'relative isolate overflow-hidden rounded-panel border-3 border-ink p-5 md:p-7',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {blobs && (
        <>
          <Blob
            size={140}
            tone={tone === 'blue' ? 'blue' : 'orange'}
            className="-end-10 -top-12 -z-10"
          />
          <Blob
            size={70}
            tone={tone === 'blue' ? 'blue' : 'orange'}
            className="start-8 -bottom-6 -z-10"
          />
        </>
      )}
      {children}
    </div>
  );
}
