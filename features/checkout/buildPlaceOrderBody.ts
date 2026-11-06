/**
 * The checkout form → POST /api/orders body. Intent only (ARCHITECTURE §0.1): ids, quantities,
 * codes and the address pin. Never prices, totals, fees or statuses: the server prices the order.
 * Pure, so it is unit tested (./buildPlaceOrderBody.test.ts).
 */
import type {
  CartLine,
  Fulfilment,
  GeoPoint,
  PaymentMethod,
  PlaceOrderRequest,
} from '@/lib/contracts';

export type PlaceOrderBody = Omit<PlaceOrderRequest, 'turnstileToken'>;

export interface CheckoutDraft {
  /** Cart entries may carry a display snapshot (name, unitPrice…); only intent fields are sent. */
  lines: readonly CartLine[];
  fulfilment: Fulfilment;
  /** Saved address (logged in) … */
  addressId: string | null;
  /** … or a new address: pin + line1 + area + landmark (§10). */
  newAddress: {
    location: GeoPoint;
    line1: string;
    area: string;
    landmark: string;
  } | null;
  paymentMethod: PaymentMethod;
  promoCode: string | null;
  scheduledFor: string | null;
  note: string;
  name: string;
  phone: string;
  /** Unchecked by default (§2.4, §7). */
  whatsappOptIn?: boolean;
  /** Only after "Place again?" (DUPLICATE_ORDER_SUSPECTED). */
  confirmDuplicate?: boolean;
}

const orNull = (s: string | null | undefined) => s?.trim() || null;

export function buildPlaceOrderBody(d: CheckoutDraft): PlaceOrderBody {
  const delivery = d.fulfilment === 'delivery';
  const addressId = delivery ? d.addressId : null;
  const a = delivery && !addressId ? d.newAddress : null;
  return {
    lines: d.lines.map(({ itemId, variantId, modifierIds, qty, note }) => ({
      itemId,
      variantId,
      modifierIds: [...modifierIds],
      qty,
      note,
    })),
    fulfilment: d.fulfilment,
    addressId,
    newAddress: a && {
      label: '',
      line1: a.line1.trim(),
      area: a.area.trim(),
      landmark: orNull(a.landmark),
      location: a.location,
    },
    paymentMethod: d.paymentMethod,
    promoCode: orNull(d.promoCode)?.toUpperCase() ?? null,
    scheduledFor: d.scheduledFor,
    customerNote: orNull(d.note),
    tip: 0,
    customer: { name: d.name.trim(), phone: d.phone },
    whatsappOptIn: d.whatsappOptIn ?? false,
    confirmDuplicate: d.confirmDuplicate ?? false,
  };
}
