/**
 * The single gateway to the backend (§2.2). Hooks call these functions; nothing else knows
 * URLs, headers or error codes. Endpoint list: docs/API_CONTRACT.md.
 */
import { z } from 'zod';
import * as C from '@/lib/contracts';
import { request, type ServerCache } from './client';

export { ApiError, isApiError, newIdempotencyKey, setTurnstileProvider } from './client';
export type { ServerCache } from './client';

const Ok = z.object({ ok: z.literal(true) });
const enc = encodeURIComponent;
type NoTurnstile<T> = Omit<T, 'turnstileToken'>;

export const api = {
  /* ---------- Public reads ---------- */
  // `cache` is for Server Component reads (features/*/server.ts); the browser omits it.
  menu: (cache?: ServerCache) => request('GET', '/api/menu', { schema: C.Menu, cache }),
  storeStatus: (cache?: ServerCache) =>
    request('GET', '/api/store/status', { schema: C.StoreStatus, cache }),
  /** ADDITION */
  dealsEvents: (cache?: ServerCache) =>
    request('GET', '/api/deals-events', { schema: C.DealsEvents, cache }),

  /* ---------- Quotes ---------- */
  deliveryQuote: (body: C.DeliveryQuoteRequest) =>
    request('POST', '/api/delivery/quote', { schema: C.DeliveryQuote, body }),
  cartQuote: (body: C.QuoteRequest, signal?: AbortSignal) =>
    request('POST', '/api/cart/quote', { schema: C.Quote, body, signal }),

  /* ---------- Customer auth (phone OTP) ---------- */
  requestOtp: (body: NoTurnstile<C.OtpRequest>) =>
    request('POST', '/api/auth/otp/request', {
      schema: C.OtpRequestResponse,
      body,
      turnstile: true,
    }),
  verifyOtp: (body: C.OtpVerify) =>
    request('POST', '/api/auth/otp/verify', { schema: C.OtpVerifyResponse, body }),
  logout: () => request('POST', '/api/auth/logout', { schema: Ok }),
  me: () => request('GET', '/api/me', { schema: C.Customer }),
  updateMe: (body: C.UpdateCustomerRequest) =>
    request('PATCH', '/api/me', { schema: C.Customer, body }),
  addresses: () => request('GET', '/api/me/addresses', { schema: z.array(C.Address) }),
  addAddress: (body: C.AddressInput) =>
    request('POST', '/api/me/addresses', { schema: C.Address, body }),
  /** ADDITION: edit an address or make it the default (only one default). */
  updateAddress: (id: string, body: C.AddressPatch) =>
    request('PATCH', `/api/me/addresses/${enc(id)}`, { schema: C.Address, body }),
  deleteAddress: (id: string) => request('DELETE', `/api/me/addresses/${enc(id)}`, { schema: Ok }),

  /* ---------- Contact form (ADDITION) ---------- */
  contact: (body: NoTurnstile<C.ContactRequest>) =>
    request('POST', '/api/contact', { schema: C.ContactResponse, body, turnstile: true }),

  /* ---------- Orders ---------- */
  placeOrder: (body: NoTurnstile<C.PlaceOrderRequest>, idempotencyKey: string) =>
    request('POST', '/api/orders', {
      schema: C.PlaceOrderResponse,
      body,
      idempotencyKey,
      turnstile: true,
    }),
  trackOrder: (token: string, signal?: AbortSignal) =>
    request('GET', `/api/orders/track/${enc(token)}`, { schema: C.Order, signal }),
  cancelOrder: (token: string, body: C.CancelOrderRequest) =>
    request('POST', `/api/orders/${enc(token)}/cancel`, { schema: C.Order, body }),
  /** ADDITION: one review per order, after delivered / picked_up. */
  reviewOrder: (token: string, body: C.ReviewRequest) =>
    request('POST', `/api/orders/${enc(token)}/review`, { schema: C.Order, body }),
  /** Newest first, paginated (ADDITION: cursor + limit). */
  myOrders: (cursor?: string | null, limit = 10) =>
    request('GET', '/api/orders/mine', {
      schema: C.OrdersPage,
      query: { cursor: cursor ?? undefined, limit: String(limit) },
    }),

  /* ---------- Payments ---------- */
  initiatePayment: (
    provider: C.OnlineProvider,
    body: C.PaymentInitiateRequest,
    idempotencyKey: string,
  ) =>
    request('POST', `/api/payments/${provider}/initiate`, {
      schema: C.PaymentInitiation,
      body,
      idempotencyKey,
    }),

  /* ---------- Bookings (ADDITION) ---------- */
  createBooking: (body: NoTurnstile<C.BookingRequest>, idempotencyKey: string) =>
    request('POST', '/api/bookings', { schema: C.Booking, body, idempotencyKey, turnstile: true }),
  booking: (token: string) => request('GET', `/api/bookings/${enc(token)}`, { schema: C.Booking }),

  /* ---------- Rider PWA ---------- */
  rider: {
    assignments: () =>
      request('GET', '/api/rider/assignments', { schema: z.array(C.RiderAssignment) }),
    pickedUp: (orderId: string, idempotencyKey: string) =>
      request('POST', `/api/rider/assignments/${enc(orderId)}/picked-up`, {
        schema: C.RiderAssignment,
        body: {},
        idempotencyKey,
      }),
    delivered: (orderId: string, body: C.DeliveredRequest, idempotencyKey: string) =>
      request('POST', `/api/rider/assignments/${enc(orderId)}/delivered`, {
        schema: C.RiderAssignment,
        body,
        idempotencyKey,
      }),
  },

  /* ---------- Admin / kitchen ---------- */
  admin: {
    login: (body: C.StaffLoginRequest) =>
      request('POST', '/api/admin/auth/login', { schema: C.StaffLoginResponse, body }),
    enrol2fa: () =>
      request('POST', '/api/admin/auth/2fa/enrol', { schema: C.TwoFactorEnrolResponse, body: {} }),
    verify2fa: (body: C.TwoFactorVerifyRequest) =>
      request('POST', '/api/admin/auth/2fa/verify', { schema: C.Staff, body }),
    logout: () => request('POST', '/api/admin/auth/logout', { schema: Ok }),
    me: () => request('GET', '/api/admin/me', { schema: C.Staff }),

    orders: (query: C.AdminOrderQuery = {}) =>
      request('GET', '/api/admin/orders', { schema: z.array(C.AdminOrder), query }),
    order: (id: string) => request('GET', `/api/admin/orders/${enc(id)}`, { schema: C.AdminOrder }),
    transition: (id: string, body: C.TransitionRequest, idempotencyKey: string) =>
      request('POST', `/api/admin/orders/${enc(id)}/transition`, {
        schema: C.AdminOrder,
        body,
        idempotencyKey,
      }),
    assignRider: (id: string, body: C.AssignRiderRequest) =>
      request('POST', `/api/admin/orders/${enc(id)}/assign-rider`, { schema: C.AdminOrder, body }),
    /** ADDITION: WhatsApp / phone / walk-in / Foodpanda orders entered by staff. */
    manualOrder: (body: C.ManualOrderRequest, idempotencyKey: string) =>
      request('POST', '/api/admin/orders/manual', {
        schema: C.ManualOrderResponse,
        body,
        idempotencyKey,
      }),

    menu: () => request('GET', '/api/admin/menu', { schema: C.Menu }),
    createItem: (body: C.ItemInput) =>
      request('POST', '/api/admin/menu/items', { schema: C.Item, body }),
    updateItem: (id: string, body: C.ItemPatch) =>
      request('PATCH', `/api/admin/menu/items/${enc(id)}`, { schema: C.Item, body }),
    deactivateItem: (id: string) =>
      request('DELETE', `/api/admin/menu/items/${enc(id)}`, { schema: C.Item }),
    setSoldOut: (id: string, body: C.SoldOutRequest) =>
      request('POST', `/api/admin/menu/items/${enc(id)}/sold-out`, { schema: C.Item, body }),
    createCategory: (body: C.CategoryInput) =>
      request('POST', '/api/admin/menu/categories', { schema: C.Category, body }),
    updateCategory: (id: string, body: C.CategoryPatch) =>
      request('PATCH', `/api/admin/menu/categories/${enc(id)}`, { schema: C.Category, body }),
    // ponytail: JSON data-URL upload keeps one transport; switch to multipart with the backend.
    upload: (body: { fileName: string; dataUrl: string }) =>
      request('POST', '/api/admin/uploads', { schema: C.UploadResponse, body }),

    settings: () => request('GET', '/api/admin/settings', { schema: C.StoreSettings }),
    updateSettings: (body: C.StoreSettingsPatch) =>
      request('PATCH', '/api/admin/settings', { schema: C.StoreSettings, body }),
    pause: (body: C.PauseRequest) =>
      request('POST', '/api/admin/settings/pause', { schema: C.StoreSettings, body }),
    hours: () => request('GET', '/api/admin/hours', { schema: z.array(C.OpeningHours) }),
    setHours: (body: C.HoursRequest) =>
      request('PUT', '/api/admin/hours', { schema: z.array(C.OpeningHours), body }),
    holidays: () => request('GET', '/api/admin/holidays', { schema: z.array(C.Holiday) }),
    addHoliday: (body: C.Holiday) =>
      request('POST', '/api/admin/holidays', { schema: z.array(C.Holiday), body }),
    removeHoliday: (date: string) =>
      request('DELETE', `/api/admin/holidays/${enc(date)}`, { schema: z.array(C.Holiday) }),

    zones: () => request('GET', '/api/admin/zones', { schema: z.array(C.DeliveryZone) }),
    createZone: (body: C.ZoneInput) =>
      request('POST', '/api/admin/zones', { schema: C.DeliveryZone, body }),
    updateZone: (id: string, body: Partial<C.ZoneInput>) =>
      request('PATCH', `/api/admin/zones/${enc(id)}`, { schema: C.DeliveryZone, body }),
    deactivateZone: (id: string) =>
      request('DELETE', `/api/admin/zones/${enc(id)}`, { schema: C.DeliveryZone }),

    promos: () => request('GET', '/api/admin/promos', { schema: z.array(C.Promo) }),
    createPromo: (body: C.PromoInput) =>
      request('POST', '/api/admin/promos', { schema: C.Promo, body }),
    updatePromo: (id: string, body: Partial<C.PromoInput>) =>
      request('PATCH', `/api/admin/promos/${enc(id)}`, { schema: C.Promo, body }),

    customers: (q?: string) =>
      request('GET', '/api/admin/customers', { schema: z.array(C.AdminCustomer), query: { q } }),
    blockCustomer: (id: string, body: C.BlockRequest) =>
      request('POST', `/api/admin/customers/${enc(id)}/block`, { schema: C.AdminCustomer, body }),
    unblockCustomer: (id: string) =>
      request('POST', `/api/admin/customers/${enc(id)}/unblock`, { schema: C.AdminCustomer }),
    anonymizeCustomer: (id: string) =>
      request('POST', `/api/admin/customers/${enc(id)}/anonymize`, { schema: C.AdminCustomer }),

    refunds: () => request('GET', '/api/admin/refunds', { schema: z.array(C.Refund) }),
    requestRefund: (body: C.RefundRequest, idempotencyKey: string) =>
      request('POST', '/api/admin/refunds', { schema: C.Refund, body, idempotencyKey }),
    refundAction: (id: string, action: 'approve' | 'reject' | 'mark-processed') =>
      request('POST', `/api/admin/refunds/${enc(id)}/${action}`, { schema: C.Refund }),

    riders: () => request('GET', '/api/admin/riders', { schema: z.array(C.Staff) }),
    settlement: () =>
      request('GET', '/api/admin/riders/settlement', { schema: z.array(C.RiderSettlement) }),
    settleRider: (riderId: string) =>
      request('POST', `/api/admin/riders/${enc(riderId)}/settle`, { schema: C.RiderSettlement }),

    reviews: () => request('GET', '/api/admin/reviews', { schema: z.array(C.Review) }),
    moderateReview: (id: string, body: C.ReviewPatch) =>
      request('PATCH', `/api/admin/reviews/${enc(id)}`, { schema: C.Review, body }),

    salesReport: (from: string, to: string) =>
      request('GET', '/api/admin/reports/sales', { schema: C.SalesReport, query: { from, to } }),

    outbox: (status: C.OutboxStatus[] = ['failed', 'dead']) =>
      request('GET', '/api/admin/outbox', { schema: z.array(C.OutboxItem), query: { status } }),
    retryOutbox: (id: string) =>
      request('POST', `/api/admin/outbox/${enc(id)}/retry`, { schema: C.OutboxItem }),

    /* ADDITIONS */
    bookings: (status?: C.BookingStatus[]) =>
      request('GET', '/api/admin/bookings', { schema: z.array(C.Booking), query: { status } }),
    updateBooking: (token: string, body: C.BookingAction) =>
      request('PATCH', `/api/admin/bookings/${enc(token)}`, { schema: C.Booking, body }),
    deals: () => request('GET', '/api/admin/deals', { schema: z.array(C.Deal) }),
    createDeal: (body: C.DealInput) =>
      request('POST', '/api/admin/deals', { schema: C.Deal, body }),
    updateDeal: (id: string, body: Partial<C.DealInput>) =>
      request('PATCH', `/api/admin/deals/${enc(id)}`, { schema: C.Deal, body }),
    deleteDeal: (id: string) => request('DELETE', `/api/admin/deals/${enc(id)}`, { schema: Ok }),
    events: () => request('GET', '/api/admin/events', { schema: z.array(C.Event) }),
    createEvent: (body: C.EventInput) =>
      request('POST', '/api/admin/events', { schema: C.Event, body }),
    updateEvent: (id: string, body: Partial<C.EventInput>) =>
      request('PATCH', `/api/admin/events/${enc(id)}`, { schema: C.Event, body }),
    deleteEvent: (id: string) => request('DELETE', `/api/admin/events/${enc(id)}`, { schema: Ok }),
  },
};

/** Realtime stream URLs live here too so lib/realtime never hard-codes paths. */
export const streamUrls = {
  order: (token: string) => `/api/realtime/orders/${enc(token)}`,
  booking: (token: string) => `/api/realtime/bookings/${enc(token)}`,
  kitchen: () => '/api/realtime/kitchen',
  menu: () => '/api/realtime/menu',
};
