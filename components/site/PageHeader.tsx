import type { ReactNode } from 'react';
import { StickerHeading } from '@/components/ui/StickerHeading';

/**
 * Page header on Rings (blue concentric bands) with the page title as a big tilted sticker.
 * `sub` is large white display text (≥ 24px on blue, per the contrast rules). `actions` sit below.
 */
export function PageHeader({
  title,
  sub,
  actions,
  tilt = -2,
}: {
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
  tilt?: number;
}) {
  return (
    <header className="overflow-hidden border-b-3 border-ink rings">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-5 px-4 py-10 text-center md:py-14">
        <StickerHeading as="h1" size="lg" tilt={tilt}>
          {title}
        </StickerHeading>
        {sub && <p className="max-w-2xl font-display text-2xl text-white md:text-3xl">{sub}</p>}
        {actions && <div className="flex flex-wrap justify-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}
