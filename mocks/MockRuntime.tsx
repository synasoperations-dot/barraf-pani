'use client';

import { useEffect, useState } from 'react';
import ScenarioPanel from './ScenarioPanel';

/** Client-only (loaded with ssr:false): starts the service worker, then shows the dev panel. */
export default function MockRuntime({ onReady }: { onReady: () => void }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('./browser')
      .then(({ startMocks }) => startMocks())
      .catch((e: unknown) => console.error('[msw] failed to start', e))
      .finally(() => {
        if (cancelled) return;
        setReady(true);
        onReady();
      });
    return () => {
      cancelled = true;
    };
    // Start once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ready ? <ScenarioPanel /> : null;
}
