import { setupServer } from 'msw/node';
import { customerHttpHandlers } from './handlers/customer';

/**
 * Server-side mocks for Server Component reads (menu, store status, deals, tracking) in dev.
 * Note: server state is separate from the browser's (which lives in localStorage), so the
 * browser re-fetches on mount and its answer wins (scenarios, sold-out, orders placed here).
 */
export const server = setupServer(...customerHttpHandlers);
