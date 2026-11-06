/**
 * Checkout session: the idempotency-key lifecycle (ARCHITECTURE §2.4, §4.1, §6).
 *
 * - The key is created when the checkout screen mounts (the hook creates the session in a
 *   useState initializer), NOT when "Place order" is tapped.
 * - Every submit and every retry (network error, IN_PROGRESS, fixing a field, "place again?")
 *   reuses the same key. The server replays a finished order instead of creating a second one.
 * - Only IDEMPOTENCY_CONFLICT (same key, different body: the cart changed mid-submit) ends the
 *   session, and only after the customer confirms does a new key start a new session.
 * - A second submit while one is in flight returns the in-flight promise (double tap → 1 request).
 */
import { isApiError, newIdempotencyKey } from '@/lib/api';

export interface CheckoutSession {
  readonly key: string;
  /** True after IDEMPOTENCY_CONFLICT until the customer confirms a new session. */
  readonly conflicted: boolean;
  readonly pending: boolean;
  submit<T>(send: (key: string) => Promise<T>): Promise<T>;
  /** After the customer confirms. Returns true if a new key was issued (no-op unless conflicted). */
  confirmNewSession(): boolean;
}

export class SessionConflictError extends Error {
  constructor() {
    super('Checkout session ended after IDEMPOTENCY_CONFLICT; confirm a new session first.');
    this.name = 'SessionConflictError';
  }
}

export function createCheckoutSession(newKey: () => string = newIdempotencyKey): CheckoutSession {
  let key = newKey();
  let conflicted = false;
  let inFlight: Promise<unknown> | null = null;

  return {
    get key() {
      return key;
    },
    get conflicted() {
      return conflicted;
    },
    get pending() {
      return inFlight !== null;
    },
    submit<T>(send: (key: string) => Promise<T>): Promise<T> {
      if (inFlight) return inFlight as Promise<T>;
      if (conflicted) return Promise.reject(new SessionConflictError());
      const p = send(key)
        .catch((e: unknown) => {
          if (isApiError(e) && e.code === 'IDEMPOTENCY_CONFLICT') conflicted = true;
          throw e;
        })
        .finally(() => {
          inFlight = null;
        });
      inFlight = p;
      return p;
    },
    confirmNewSession() {
      if (!conflicted) return false;
      key = newKey();
      conflicted = false;
      return true;
    },
  };
}
