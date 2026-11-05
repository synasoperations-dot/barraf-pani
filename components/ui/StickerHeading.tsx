import clsx from 'clsx';
import type { ReactNode } from 'react';
import { BoltPair, Halftone } from './motifs';

type Size = 'sm' | 'md' | 'lg';

interface StickerHeadingProps {
  children: ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  /** Degrees. Keep within −2…+4. */
  tilt?: number;
  align?: 'start' | 'center';
  size?: Size;
  bolts?: boolean;
  halftone?: boolean;
  className?: string;
  id?: string;
}

const SIZES: Record<Size, { text: string; pad: string; bolt: number }> = {
  sm: { text: 'text-xl md:text-2xl', pad: 'px-3 py-0.5', bolt: 0.7 },
  md: { text: 'text-3xl md:text-4xl', pad: 'px-5 py-1', bolt: 1 },
  lg: { text: 'text-4xl md:text-6xl', pad: 'px-6 py-1.5', bolt: 1.35 },
};

/** White sticker label, ink outline, straight-down shadow, Poppins 900, tilted, bolts either side. */
export function StickerHeading({
  children,
  as: Tag = 'h2',
  tilt = -2,
  align = 'center',
  size = 'md',
  bolts = true,
  halftone = false,
  className,
  id,
}: StickerHeadingProps) {
  const s = SIZES[size];
  return (
    <div
      className={clsx(
        'flex flex-col gap-3',
        align === 'center' ? 'items-center text-center' : 'items-start',
        className,
      )}
    >
      <div className="flex items-center gap-2 md:gap-3">
        {bolts && <BoltPair side="start" scale={s.bolt} />}
        <Tag
          id={id}
          className={clsx(
            'inline-block rounded-sticker border-3 border-ink bg-white font-sticker leading-tight font-black text-ink shadow-sticker',
            s.text,
            s.pad,
          )}
          style={{ transform: `rotate(${tilt}deg)` }}
        >
          {children}
        </Tag>
        {bolts && <BoltPair side="end" scale={s.bolt} />}
      </div>
      {halftone && <Halftone className="w-40 max-w-full" />}
    </div>
  );
}
