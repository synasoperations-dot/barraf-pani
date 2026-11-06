import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Unit + component tests. Component files opt into jsdom with `// @vitest-environment jsdom`.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('.', import.meta.url)) } },
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['{lib,features,mocks,stores,components}/**/*.test.{ts,tsx}'],
    environment: 'node',
    // MSW's sse() handlers need EventSource, which Node keeps behind a flag.
    execArgv: ['--experimental-eventsource'],
    // The mock suite fast-forwards timers; a slow CI box still finishes well inside this.
    testTimeout: 20_000,
  },
});
