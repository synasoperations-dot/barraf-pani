import { setupWorker } from 'msw/browser';
import { tick } from './db';
import { adminHandlers } from './handlers/admin';
import { customerHandlers } from './handlers/customer';

export async function startMocks() {
  const worker = setupWorker(...customerHandlers, ...adminHandlers);
  await worker.start({ onUnhandledFrame: 'bypass', quiet: true });
  // Drive the order timers even when nothing is polling (SSE pushes come from here).
  setInterval(tick, 1000);
  return worker;
}
