import { ImageResponse } from 'next/og';
import { BrandBadge, RingsBackdrop } from '@/lib/seo/brandArt';
import { SITE } from '@/lib/site';
import { colors } from '@/tailwind.config';

export const alt = `${SITE.name}: fast food in Paradise City, Jhang`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** Default Open Graph image for every page: blue rings, the badge, the headline. */
export default function OpengraphImage() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative' }}>
      <RingsBackdrop width={size.width} height={size.height} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 56,
          padding: '0 80px',
        }}
      >
        <BrandBadge size={360} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              background: colors.white,
              color: colors.ink,
              border: `6px solid ${colors.ink}`,
              borderRadius: 18,
              boxShadow: `0 10px 0 ${colors.ink}`,
              padding: '10px 28px',
              fontSize: 64,
              fontWeight: 900,
              transform: 'rotate(-2deg)',
            }}
          >
            Made fresh. Served furious.
          </div>
          <div style={{ display: 'flex', color: colors.white, fontSize: 44, fontWeight: 700 }}>
            Fries · Burgers · Wings · Pizza
          </div>
          <div style={{ display: 'flex', color: colors.yellow, fontSize: 40, fontWeight: 700 }}>
            Paradise City, Jhang · Delivery & pickup
          </div>
        </div>
      </div>
    </div>,
    size,
  );
}
