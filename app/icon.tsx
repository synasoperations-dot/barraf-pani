import { ImageResponse } from 'next/og';
import { BrandBadge } from '@/lib/seo/brandArt';

/** App icons at /icon/192 and /icon/512 (favicon + PWA manifest + JSON-LD logo). */
export function generateImageMetadata() {
  return [192, 512].map((n) => ({
    id: String(n),
    size: { width: n, height: n },
    contentType: 'image/png',
  }));
}

export default async function Icon({ id }: { id: Promise<string | number> }) {
  const n = Number(await id);
  // Inset so the hard shadow fits inside the square (and maskable safe zone).
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <BrandBadge size={Math.round(n * 0.86)} />
    </div>,
    { width: n, height: n },
  );
}
