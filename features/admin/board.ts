/**
 * Pure orders-board logic (unit tested): which column an order sits in, the §9 alert timings,
 * and the kitchen "all day" summary. Components only render what these return.
 */
import type { AdminOrder, OrderStatus, StoreSettings } from '@/lib/contracts';

type Timings = Pick<
  StoreSettings,
  'autoRejectMinutes' | 'managerAlertMinutes' | 'preorderReleaseMinutes'
>;

/** A pre-order the kitchen hasn't been given yet (released = scheduled time − 60 min, §9). */
export function releaseAt(o: AdminOrder, s: Timings): number | null {
  if (!o.scheduledFor) return null;
  return new Date(o.scheduledFor).getTime() - s.preorderReleaseMinutes * 60_000;
}

export const isUnreleased = (o: AdminOrder, s: Timings, now: number) => {
  const at = releaseAt(o, s);
  return at !== null && !o.releasedAt && now < at;
};

/** The 8-minute accept window starts at release for pre-orders, at creation otherwise (§9). */
export function acceptWindow(o: AdminOrder, s: Timings) {
  const start = new Date(o.releasedAt ?? o.createdAt).getTime();
  return {
    alertAt: start + s.managerAlertMinutes * 60_000,
    rejectAt: start + s.autoRejectMinutes * 60_000,
  };
}

/** `placed` and past the manager-alert mark: the card turns orange with "Manager alerted". */
export const isAlerting = (o: AdminOrder, s: Timings, now: number) =>
  o.status === 'placed' && now >= acceptWindow(o, s).alertAt;

export type BoardColumn = 'new' | 'accepted' | 'preparing' | 'ready' | 'out_for_delivery' | 'done';
export type BoardTab = 'board' | 'awaiting_payment' | 'scheduled' | 'closed';

export const BOARD_COLUMNS: BoardColumn[] = [
  'new',
  'accepted',
  'preparing',
  'ready',
  'out_for_delivery',
  'done',
];

const COLUMN_OF: Partial<Record<OrderStatus, BoardColumn>> = {
  placed: 'new',
  accepted: 'accepted',
  preparing: 'preparing',
  ready: 'ready',
  out_for_delivery: 'out_for_delivery',
  delivered: 'done',
  picked_up: 'done',
};

const CLOSED: OrderStatus[] = ['cancelled', 'rejected', 'payment_failed', 'expired'];

/** Where an order lives on the board: a tab, and a column when it's on the main board. */
export function placeOrder(
  o: AdminOrder,
  s: Timings,
  now: number,
): { tab: BoardTab; column: BoardColumn | null } {
  if (o.status === 'pending_payment') return { tab: 'awaiting_payment', column: null };
  if (CLOSED.includes(o.status)) return { tab: 'closed', column: null };
  if (o.status === 'placed' && isUnreleased(o, s, now)) return { tab: 'scheduled', column: null };
  return { tab: 'board', column: COLUMN_OF[o.status] ?? null };
}

/** Oldest first inside a column, so the most urgent order is on top. */
export function groupBoard(orders: AdminOrder[], s: Timings, now: number) {
  const columns = Object.fromEntries(BOARD_COLUMNS.map((c) => [c, [] as AdminOrder[]])) as Record<
    BoardColumn,
    AdminOrder[]
  >;
  const tabs: Record<Exclude<BoardTab, 'board'>, AdminOrder[]> = {
    awaiting_payment: [],
    scheduled: [],
    closed: [],
  };
  const byAge = [...orders].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  for (const o of byAge) {
    const { tab, column } = placeOrder(o, s, now);
    if (tab !== 'board') tabs[tab].push(o);
    else if (column) columns[column].push(o);
  }
  columns.done.reverse(); // newest finished first
  tabs.closed.reverse();
  tabs.scheduled.sort((a, b) => (releaseAt(a, s) ?? 0) - (releaseAt(b, s) ?? 0));
  return { columns, tabs };
}

/**
 * Orders that should ring: released `placed` orders nobody accepted yet, minus ones this device
 * created itself (manual entry is already "accept-ready", §1b).
 */
export const ringing = (orders: AdminOrder[], s: Timings, now: number, mine: ReadonlySet<string>) =>
  orders.filter((o) => o.status === 'placed' && !isUnreleased(o, s, now) && !mine.has(o.id));

/** Kitchen "All day": item × qty across every active ticket, biggest first. */
export function allDay(orders: AdminOrder[]) {
  const active: OrderStatus[] = ['placed', 'accepted', 'preparing'];
  const counts = new Map<string, { name: AdminOrder['lines'][number]['name']; qty: number }>();
  for (const o of orders.filter((x) => active.includes(x.status)))
    for (const l of o.lines) {
      const key = `${l.itemId}|${l.variantName}`;
      const cur = counts.get(key) ?? { name: l.name, qty: 0 };
      counts.set(key, { ...cur, qty: cur.qty + l.qty });
    }
  return [...counts.entries()]
    .map(([key, v]) => ({ key, variantName: key.split('|')[1]!, ...v }))
    .sort((a, b) => b.qty - a.qty);
}

/** Today's date in Asia/Karachi, "YYYY-MM-DD" (UTC+5, no DST). */
export const localDate = (now = Date.now()) =>
  new Date(now + 5 * 3_600_000).toISOString().slice(0, 10);

/** Start of today in Asia/Karachi, as ISO (the board's default date filter). */
export function startOfLocalDay(now = Date.now(), daysAgo = 0) {
  const PKT = 5 * 3_600_000;
  const day = 86_400_000;
  return new Date(Math.floor((now + PKT) / day) * day - PKT - daysAgo * day).toISOString();
}
