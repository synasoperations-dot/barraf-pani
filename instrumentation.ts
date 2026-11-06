/** Starts MSW in the Node server when mocks are on (dev only; see mocks/node.ts). */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NEXT_PUBLIC_USE_MOCKS === 'true') {
    const { server } = await import('./mocks/node');
    server.listen({ onUnhandledFrame: 'bypass' });
  }
}
