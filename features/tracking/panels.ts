import { toCustomerStage, type Order } from '@/lib/contracts';

/** Which screen the tracking page shows for an order (§4.2 + §9). */
export type TrackScreen =
  | 'strip'
  | 'scheduled'
  | 'pending_payment'
  | 'payment_failed'
  | 'expired'
  | 'rejected'
  | 'auto_rejected'
  | 'cancelled';

type OrderLike = Pick<Order, 'status' | 'fulfilment' | 'releasesAt' | 'events'>;

/** The note on the latest event that moved the order into its current status. */
export const lastNote = (o: Pick<Order, 'status' | 'events'>) =>
  o.events.findLast((e) => e.status === o.status)?.note ?? null;

export function screenFor(o: OrderLike): TrackScreen {
  switch (o.status) {
    case 'pending_payment':
    case 'payment_failed':
    case 'expired':
    case 'cancelled':
      return o.status;
    case 'rejected':
      // §9 auto-reject job writes "Auto-rejected: …" as the event note.
      return /auto[- ]?reject/i.test(lastNote(o) ?? '') ? 'auto_rejected' : 'rejected';
    case 'placed':
      // releasesAt is set only while a pre-order waits for its kitchen release time.
      return o.releasesAt ? 'scheduled' : 'strip';
    default:
      return 'strip';
  }
}

/** Four comic panels: 0 received, 1 cooking, 2 on the way / counter, 3 delivered. */
export type PanelState = 'done' | 'active' | 'future';

const STEP = {
  received: 0,
  preparing: 1,
  out_for_delivery: 2,
  ready_for_pickup: 2,
  delivered: 3,
  cancelled: null,
} as const;

/** Active panel index (null for statuses that don't use the strip). */
export function stepFor(o: Pick<Order, 'status' | 'fulfilment'>): number | null {
  const stage = toCustomerStage(o.status, o.fulfilment);
  return stage ? STEP[stage] : null;
}

/** The last panel is the finish line: once there, it is active (lifted), never "future". */
export const panelStates = (step: number): PanelState[] =>
  [0, 1, 2, 3].map((i) => (i < step ? 'done' : i === step ? 'active' : 'future'));
