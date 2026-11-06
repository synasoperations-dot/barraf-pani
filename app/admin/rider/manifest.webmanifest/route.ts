import { colors } from '@/tailwind.config';

/** Rider PWA manifest (installable on its own, scoped to /admin/rider). */
export function GET() {
  return Response.json(
    {
      name: 'Barraf Paani Rider',
      short_name: 'Rider',
      start_url: '/admin/rider',
      scope: '/admin/rider',
      display: 'standalone',
      orientation: 'portrait',
      background_color: colors.paper,
      theme_color: colors.paper,
      icons: [
        { src: '/icon/192', sizes: '192x192', type: 'image/png' },
        { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
}
