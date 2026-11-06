'use client';

import { motion, MotionConfig } from 'framer-motion';
import type { VariantSize } from '@/lib/contracts';

const SCALE: Record<VariantSize, number> = { S: 0.55, M: 0.7, L: 0.85, XL: 1 };
// [cx, cy, rx, ry] cheese spots on the sauce.
const SPOTS = [
  [72, 62, 14, 9],
  [122, 56, 11, 8],
  [146, 102, 13, 9],
  [100, 98, 10, 7],
  [60, 118, 12, 8],
  [112, 142, 14, 9],
  [78, 152, 9, 6],
  [150, 140, 9, 7],
] as const;

/** Pizza illustration that springs between sizes. Loaded only on pizzas (next/dynamic). */
export default function PizzaArt({ size }: { size: VariantSize }) {
  return (
    <MotionConfig reducedMotion="user">
      <div
        aria-hidden="true"
        className="relative grid aspect-square w-full place-items-center rounded-card border-3 border-ink grid-paper"
      >
        <motion.svg
          viewBox="0 0 200 200"
          className="w-[88%] overflow-visible"
          initial={false}
          animate={{ scale: SCALE[size] }}
          transition={{ type: 'spring', stiffness: 320, damping: 14 }}
        >
          <circle
            cx="100"
            cy="100"
            r="94"
            fill="var(--color-orange-deep)"
            stroke="var(--color-ink)"
            strokeWidth="5"
          />
          <circle
            cx="100"
            cy="100"
            r="78"
            fill="var(--color-orange)"
            stroke="var(--color-ink)"
            strokeWidth="3"
          />
          {SPOTS.map(([cx, cy, rx, ry], i) => (
            <ellipse
              key={i}
              cx={cx}
              cy={cy}
              rx={rx}
              ry={ry}
              transform={`rotate(${i * 37} ${cx} ${cy})`}
              fill="var(--color-yellow)"
              stroke="var(--color-ink)"
              strokeWidth="3"
            />
          ))}
        </motion.svg>
        <span className="absolute end-2 bottom-2 rounded-chip border-2 border-ink bg-white px-2 pt-0.5 font-price text-2xl leading-6">
          {size}
        </span>
      </div>
    </MotionConfig>
  );
}
