'use client';

import { useEffect } from 'react';

/** Client-only (loaded with ssr:false): starts the service worker. Switch scenarios with ?scenario=. */
export default function MockRuntime({ onReady }: { onReady: () => void }) {
  useEffect(() => {
    let cancelled = false;
    import('./browser')
      .then(({ startMocks }) => startMocks())
      .catch((e: unknown) => console.error('[msw] failed to start', e))
      .finally(() => {
        if (!cancelled) onReady();
      });
    return () => {
      cancelled = true;
    };
    // Start once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
