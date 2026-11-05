'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { MswBootstrap } from '@/components/dev/MswBootstrap';
import { Toaster } from '@/components/ui/Toast';
import { isApiError } from '@/lib/api';
import { useCart } from '@/stores/cart';

export function Providers({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            // Business errors (4xx) won't fix themselves; retry only network/5xx.
            retry: (count, e) => count < 2 && (!isApiError(e) || e.status === 0 || e.status >= 500),
          },
        },
      }),
  );

  // Cart persists to localStorage; hydrate after mount so SSR and first render match.
  useEffect(() => {
    void useCart.persist.rehydrate();
  }, []);

  return (
    <QueryClientProvider client={client}>
      <MswBootstrap>{children}</MswBootstrap>
      <Toaster />
    </QueryClientProvider>
  );
}
