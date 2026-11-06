/** Feature flags (ARCHITECTURE §5.2, §13). */

/** Combos/meals at combo prices. Off in v1 (§13.1); Deals add normal items at normal prices. */
export const FEATURE_COMBOS = false;

/**
 * JazzCash / Easypaisa at checkout. COD only at launch (§13.5). The online-payment UI is still
 * built and testable against the mocks with NEXT_PUBLIC_ALLOW_ONLINE_PAYMENTS=true.
 */
export const ALLOW_ONLINE_PAYMENTS = process.env.NEXT_PUBLIC_ALLOW_ONLINE_PAYMENTS === 'true';

/** MSW intercepts /api/* in the browser (dev only). */
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';
