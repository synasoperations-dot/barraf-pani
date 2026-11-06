import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';

/** Private pages carry the public token or personal data: never crawl them (also noindex'd). */
const PRIVATE = [
  '/track',
  '/order',
  '/booking',
  '/account',
  '/admin',
  '/pay',
  '/login',
  '/api/',
  '/dev/',
];

/** AI search / assistant crawlers, explicitly welcome on public pages (§6b). */
const AI_BOTS = [
  'GPTBot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'ClaudeBot',
  'Claude-SearchBot',
  'Google-Extended',
  'Applebot-Extended',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: PRIVATE },
      { userAgent: AI_BOTS, allow: ['/', '/llms.txt', '/llms-full.txt'], disallow: PRIVATE },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
