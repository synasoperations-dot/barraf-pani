/**
 * Mock API bridge (no backend yet). In mock mode the browser's /api calls are answered by the
 * MSW service worker before they reach Next, but Server Component reads (menu, store status,
 * deals, tracking) really hit this origin, and Next's fetch isn't intercepted by msw/node, so
 * they're answered here by the same mock handlers.
 *
 * `MOCK_API=server` (with browser mocks off) also serves the browser's /api calls from here: a
 * production build that server-renders real content without a backend (Lighthouse, previews).
 * Otherwise this is a plain 404; the backend phase replaces it with real route handlers
 * (docs/BACKEND_HANDOFF.md).
 */
import { getResponse } from 'msw';

export const dynamic = 'force-dynamic';

const notFound = () => Response.json({ code: 'NOT_FOUND', message: 'Not found' }, { status: 404 });

async function handle(req: Request) {
  if (process.env.NEXT_PUBLIC_USE_MOCKS !== 'true' && process.env.MOCK_API !== 'server')
    return notFound();
  // No SSE here: 204 tells EventSource to stop, and lib/realtime falls back to polling.
  if (new URL(req.url).pathname.startsWith('/api/realtime/'))
    return new Response(null, { status: 204 });
  const { customerHttpHandlers } = await import('@/mocks/handlers/customer');
  return (await getResponse(customerHttpHandlers, req)) ?? notFound();
}

export { handle as GET, handle as POST, handle as PUT, handle as PATCH, handle as DELETE };
