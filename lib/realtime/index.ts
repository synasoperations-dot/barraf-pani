/**
 * Realtime subscriptions with a polling fallback (ARCHITECTURE §2.3).
 *
 * Transport today: Server-Sent Events from /api/realtime/* (served by MSW in mock mode).
 * TODO(backend phase): swap `openStream` for a Supabase broadcast channel per tracking token
 * / staff subscription. The public functions below are the stable interface.
 */
import type { z } from 'zod';
import { api, streamUrls } from '@/lib/api';
import {
  Booking,
  KitchenEvent,
  OrderRealtimeEvent,
  SoldOutEvent,
  type AdminOrder,
} from '@/lib/contracts';

export type Unsubscribe = () => void;
/** `live` = pushed over the stream; `polling` = the stream dropped and we poll every 12 s. */
export type ConnectionStatus = 'live' | 'polling';

const POLL_MS = 12_000; // within the 10–15 s window

interface Source<T> {
  url: string;
  schema: z.ZodType<T>;
  /** Fallback: fetch current state and return events to emit (already de-duplicated). */
  poll: () => Promise<T[]>;
}

function subscribe<T>(
  { url, schema, poll }: Source<T>,
  onEvent: (e: T) => void,
  onStatus?: (s: ConnectionStatus) => void,
): Unsubscribe {
  let closed = false;
  let timer: ReturnType<typeof setInterval> | undefined;
  let es: EventSource | undefined;

  const runPoll = () =>
    poll()
      .then((events) => !closed && events.forEach(onEvent))
      .catch(() => {}); // next tick retries

  const startPolling = () => {
    if (timer || closed) return;
    onStatus?.('polling');
    runPoll();
    timer = setInterval(runPoll, POLL_MS);
  };

  if (typeof EventSource === 'undefined') startPolling();
  else {
    es = new EventSource(url);
    es.onopen = () => onStatus?.('live');
    es.onmessage = (msg) => {
      const parsed = schema.safeParse(JSON.parse(msg.data as string));
      if (parsed.success) onEvent(parsed.data);
    };
    es.onerror = () => {
      es?.close();
      startPolling();
    };
  }

  // Catch up after the phone wakes or the tab returns.
  const onVisible = () => document.visibilityState === 'visible' && runPoll();
  document.addEventListener('visibilitychange', onVisible);

  return () => {
    closed = true;
    es?.close();
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisible);
  };
}

/** Customer tracking: status + ETA for one order. */
export function subscribeToOrder(
  token: string,
  onEvent: (e: OrderRealtimeEvent) => void,
  onStatus?: (s: ConnectionStatus) => void,
): Unsubscribe {
  let last = '';
  return subscribe(
    {
      url: streamUrls.order(token),
      schema: OrderRealtimeEvent,
      poll: async () => {
        const o = await api.trackOrder(token);
        const event: OrderRealtimeEvent = {
          publicToken: token,
          status: o.status,
          paymentStatus: o.paymentStatus,
          estimatedReadyAt: o.estimatedReadyAt,
          estimatedDeliveryAt: o.estimatedDeliveryAt,
          at: new Date().toISOString(),
        };
        const key = `${event.status}|${event.paymentStatus}|${event.estimatedReadyAt}|${event.estimatedDeliveryAt}`;
        if (key === last) return [];
        last = key;
        return [event];
      },
    },
    onEvent,
    onStatus,
  );
}

/** Booking status page: pushes the booking whenever staff confirm / decline it. */
export function subscribeToBooking(token: string, onEvent: (b: Booking) => void): Unsubscribe {
  let last = '';
  return subscribe(
    {
      url: streamUrls.booking(token),
      schema: Booking,
      poll: async () => {
        const b = await api.booking(token);
        if (b.status === last) return [];
        last = b.status;
        return [b];
      },
    },
    onEvent,
  );
}

/** Staff kitchen board: new and changed active orders. */
export function subscribeToKitchen(onEvent: (e: KitchenEvent) => void): Unsubscribe {
  const seen = new Map<string, number>();
  return subscribe(
    {
      url: streamUrls.kitchen(),
      schema: KitchenEvent,
      poll: async () => {
        const orders: AdminOrder[] = await api.admin.orders({
          status: ['placed', 'accepted', 'preparing', 'ready', 'out_for_delivery'],
        });
        const events: KitchenEvent[] = [];
        for (const order of orders) {
          const prev = seen.get(order.id);
          if (prev === order.version) continue;
          events.push({ type: prev === undefined ? 'order.created' : 'order.updated', order });
          seen.set(order.id, order.version);
        }
        return events;
      },
    },
    onEvent,
  );
}

/** Live sold-out toggles for the menu. */
export function subscribeToMenu(onEvent: (e: SoldOutEvent) => void): Unsubscribe {
  const seen = new Map<string, boolean>();
  return subscribe(
    {
      url: streamUrls.menu(),
      schema: SoldOutEvent,
      poll: async () => {
        const menu = await api.menu();
        const events: SoldOutEvent[] = [];
        for (const item of menu.items) {
          const prev = seen.get(item.id);
          if (prev !== undefined && prev !== item.isSoldOut)
            events.push({
              itemId: item.id,
              isSoldOut: item.isSoldOut,
              soldOutUntil: item.soldOutUntil,
            });
          seen.set(item.id, item.isSoldOut);
        }
        return events;
      },
    },
    onEvent,
  );
}
