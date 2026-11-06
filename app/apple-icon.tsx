import { ImageResponse } from 'next/og';
import { BrandBadge } from '@/lib/seo/brandArt';
import { colors } from '@/tailwind.config';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** iOS home-screen icon (iOS ignores transparency, so a blue square behind the badge). */
export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: colors.blue,
      }}
    >
      <BrandBadge size={140} />
    </div>,
    size,
  );
}
