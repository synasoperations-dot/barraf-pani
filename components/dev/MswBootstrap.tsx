'use client';

import dynamic from 'next/dynamic';
import { useState, type ReactNode } from 'react';

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';

// ssr:false keeps msw/browser out of the server bundle; with mocks off it is never requested.
const MockRuntime = USE_MOCKS ? dynamic(() => import('@/mocks/MockRuntime'), { ssr: false }) : null;

/**
 * The only file allowed to import /mocks (enforced by ESLint). In mock mode, children render
 * once the service worker is intercepting, so no request escapes to the real network.
 */
export function MswBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(!USE_MOCKS);
  return (
    <>
      {ready ? children : null}
      {MockRuntime && <MockRuntime onReady={() => setReady(true)} />}
    </>
  );
}
