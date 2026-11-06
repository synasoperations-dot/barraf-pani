/**
 * Kitchen status changes made while offline. Each keeps the Idempotency-Key it was created with,
 * so replaying it after a flaky reconnect can never apply twice (§0.5). Pure + storage-injected
 * so it's unit tested.
 */
import type { OrderStatus, TransitionRequest } from '@/lib/contracts';

export interface QueuedMove {
  key: string; // Idempotency-Key, created at tap time
  orderId: string;
  orderNumber: string;
  to: OrderStatus;
  version: number;
  note: string | null;
  prepMinutes?: TransitionRequest['prepMinutes'];
  queuedAt: string;
}

type KV = Pick<Storage, 'getItem' | 'setItem'>;

export function moveQueue(storage: KV, storageKey = 'bp-kitchen-queue') {
  const read = (): QueuedMove[] => {
    try {
      return JSON.parse(storage.getItem(storageKey) ?? '[]') as QueuedMove[];
    } catch {
      return [];
    }
  };
  const write = (q: QueuedMove[]) => storage.setItem(storageKey, JSON.stringify(q));
  return {
    list: read,
    /** One pending move per order: a second tap on the same order replaces the first. */
    push(m: QueuedMove) {
      write([...read().filter((x) => x.orderId !== m.orderId), m]);
    },
    remove(key: string) {
      write(read().filter((x) => x.key !== key));
    },
  };
}

export type FlushOutcome = { move: QueuedMove; result: 'sent' | 'dropped'; error?: unknown };

/**
 * Replays in order. A network failure stops the flush (try again on the next `online`); any
 * other error (version conflict, invalid move) drops that move and is reported to the caller.
 */
export async function flushQueue(
  queue: ReturnType<typeof moveQueue>,
  send: (m: QueuedMove) => Promise<unknown>,
  isNetworkError: (e: unknown) => boolean,
): Promise<FlushOutcome[]> {
  const out: FlushOutcome[] = [];
  for (const move of queue.list()) {
    try {
      await send(move);
      queue.remove(move.key);
      out.push({ move, result: 'sent' });
    } catch (error) {
      if (isNetworkError(error)) break;
      queue.remove(move.key);
      out.push({ move, result: 'dropped', error });
    }
  }
  return out;
}
