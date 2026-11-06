import type { ReactNode } from 'react';
import { StickerHeading } from '@/components/ui/StickerHeading';

/* Layout helpers for /dev/ui (StyleGuide.tsx and sections/*). */

export function Section({
  id,
  title,
  note,
  children,
}: {
  id: string;
  title: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-h`}
      className="scroll-mt-6 border-t-3 border-ink py-12"
    >
      <div className="mb-8 flex flex-col items-start gap-2">
        <StickerHeading id={`${id}-h`} align="start" size="sm" tilt={-1.5}>
          {title}
        </StickerHeading>
        {note && <p className="max-w-2xl text-muted">{note}</p>}
      </div>
      {children}
    </section>
  );
}

export const Label = ({ children }: { children: ReactNode }) => (
  <p className="mb-2 font-mono text-xs font-bold tracking-wide text-muted uppercase">{children}</p>
);
