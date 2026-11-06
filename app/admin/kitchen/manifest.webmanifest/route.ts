import { colors } from '@/tailwind.config';

/** Kitchen PWA manifest (installable on its own, scoped to /admin/kitchen). */
export function GET() {
  return Response.json(
    {
      name: 'Barraf Paani Kitchen',
      short_name: 'Kitchen',
      start_url: '/admin/kitchen',
      scope: '/admin/kitchen',
      display: 'fullscreen',
      orientation: 'landscape',
      background_color: colors.ink,
      theme_color: colors.ink,
      icons: [
        { src: '/icon/192', sizes: '192x192', type: 'image/png' },
        { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
}
