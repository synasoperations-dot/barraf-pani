import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonClasses } from '@/components/ui/Button';

const BUCKET = 'M30 50H130L116 138H44Z';

/** Empty fries bucket: orange/white stripes, ink outline, two lonely fries and some crumbs. */
export function EmptyBucket({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 170 150" aria-hidden="true" className={className}>
      <defs>
        <clipPath id="bp-bucket">
          <path d={BUCKET} />
        </clipPath>
      </defs>
      {/* Hard shadow */}
      <path d={BUCKET} transform="translate(6 6)" className="fill-ink" />
      {/* One fry still hanging on, behind the rim */}
      <rect
        x="72"
        y="22"
        width="9"
        height="32"
        rx="2"
        transform="rotate(-12 76 38)"
        className="fill-yellow stroke-ink"
        strokeWidth="3"
      />
      <path d={BUCKET} className="fill-white" />
      <g clipPath="url(#bp-bucket)" className="fill-orange">
        {[34, 58, 82, 106, 130].map((x) => (
          <rect key={x} x={x - 6} y="50" width="12" height="90" />
        ))}
      </g>
      <path d={BUCKET} fill="none" className="stroke-ink" strokeWidth="4" strokeLinejoin="round" />
      <rect
        x="22"
        y="42"
        width="116"
        height="14"
        rx="5"
        className="fill-white stroke-ink"
        strokeWidth="4"
      />
      {/* Ground, a fallen fry and crumbs */}
      <path d="M8 144H162" className="stroke-ink" strokeWidth="3" strokeLinecap="round" />
      <rect
        x="128"
        y="128"
        width="30"
        height="8"
        rx="2"
        transform="rotate(-8 143 132)"
        className="fill-yellow stroke-ink"
        strokeWidth="3"
      />
      {[
        [20, 138],
        [30, 140],
        [124, 140],
      ].map(([cx, cy]) => (
        <circle
          key={cx}
          cx={cx}
          cy={cy}
          r="2.5"
          className="fill-yellow stroke-ink"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

export function EmptyCart({ onNavigate }: { onNavigate?: () => void }) {
  const t = useTranslations('cartFlow');
  return (
    <div className="flex flex-col items-center gap-4 px-4 py-8 text-center">
      <EmptyBucket className="w-40" />
      <h2 className="font-display text-3xl">{t('emptyTitle')}</h2>
      <p className="max-w-xs text-muted">{t('emptyBody')}</p>
      <Link href="/menu" onClick={onNavigate} className={buttonClasses({ variant: 'secondary' })}>
        {t('browse')}
      </Link>
    </div>
  );
}
