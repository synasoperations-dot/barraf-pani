import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/site';
import { colors } from '@/tailwind.config';

/** Customer PWA (the install prompt appears from the second visit, components/site/InstallPrompt). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} · Jhang`,
    short_name: SITE.name,
    description:
      'Fries, burgers, wings, wraps and pizza in Paradise City, Jhang. Order for delivery or pickup.',
    start_url: '/?source=pwa',
    scope: '/',
    display: 'standalone',
    background_color: colors.paper,
    theme_color: colors.blue,
    lang: 'en',
    dir: 'auto',
    categories: ['food', 'shopping'],
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Menu', url: '/menu' },
      { name: 'Track an order', url: '/track' },
    ],
  };
}
