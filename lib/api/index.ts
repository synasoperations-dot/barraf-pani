/**
 * The single gateway to the backend (ARCHITECTURE §2.2). Components and hooks call these
 * functions; nothing else knows URLs, headers or error codes. Endpoints: docs/API_CONTRACT.md.
 */
import { z } from 'zod';
import * as C from '@/lib/contracts';
import { request } from './client';

export { ApiError, isApiError, newIdempotencyKey } from './client';

const Ok = z.object({ ok: z.literal(true) });
const enc = encodeURIComponent;

export const api = {
  /* ---------- Public reads ---------- */
  menu: () => request('GET', '/api/menu', { schema: C.Menu }),
  store: () => request('GET', '/api/store', { schema: C.StoreInfo }),
  storeStatus: () => request('GET', '/api/store/status', { schema: C.StoreStatus }),
  zones: () => request('GET', '/api/delivery/zones', { schema: z.array(C.DeliveryZone) }),
  promos: () => request('GET', '/api/promos', { schema: z.array(C.Promo) }),

  /* ---------- Quotes ---------- */
  deliveryQuote: (body: C.DeliveryQuoteRequest) =>
    request('POST', '/api/delivery/quote', { schema: C.DeliveryQuote, body }),
  cartQuote: (body: C.QuoteRequest, signal?: AbortSignal) =>
    request('POST', '/api/cart/quote', { schema: C.Quote, body, signal }),

  /* ---------- Auth (customer, phone OTP) ---------- */
  requestOtp: (body: C.OtpRequest) =>
    request('POST', '/api/auth/otp/request', { schema: C.OtpRequestResponse, body }),
  verifyOtp: (body: C.OtpVerify) =>
    request('POST', '/api/auth/otp/verify', { schema: C.OtpVerifyResponse, body }),
  logout: () => request('POST', '/api/auth/logout', { schema: Ok }),
  me: () => request('GET', '/api/me', { schema: C.Customer }),
  updateMe: (body: C.UpdateCustomerRequest) =>
    request('PATCH', '/api/me', { schema: C.Customer, body }),
  addresses: () => request('GET', '/api/me/addresses', { schema: z.array(C.Address) }),
  addAddress: (body: C.AddressInput) =>
    request('POST', '/api/me/addresses', { schema: C.Address, body }),
  deleteAddress: (id: string) => request('DELETE', `/api/me/addresses/${enc(id)}`, { schema: Ok }),

  /* ---------- Orders ---------- */
  placeOrder: (body: C.PlaceOrderRequest, idempotencyKey: string) =>
    request('POST', '/api/orders', { schema: C.PlaceOrderResponse, body, idempotencyKey }),
  trackOrder: (token: string, signal?: AbortSignal) =>
    request('GET', `/api/orders/track/${enc(token)}`, { schema: C.Order, signal }),
  cancelOrder: (token: string, body: C.CancelOrderRequest) =>
    request('POST', `/api/orders/${enc(token)}/cancel`, { schema: C.Order, body }),
  myOrders: () => request('GET', '/api/orders/mine', { schema: z.array(C.Order) }),

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

  /* ---------- Admin ---------- */
  admin: {
    login: (body: C.AdminLoginRequest) =>
      request('POST', '/api/admin/auth/login', { schema: C.AdminLoginResponse, body }),
    verify2fa: (body: C.Admin2faRequest) =>
      request('POST', '/api/admin/auth/2fa', { schema: C.AdminUser, body }),
    logout: () => request('POST', '/api/admin/auth/logout', { schema: Ok }),
    me: () => request('GET', '/api/admin/me', { schema: C.AdminUser }),

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
    // ponytail: JSON data-URL upload keeps one transport; switch to multipart when the backend lands.
    upload: (body: { fileName: string; dataUrl: string }) =>
      request('POST', '/api/admin/uploads', { schema: C.UploadResponse, body }),

    settings: () => request('GET', '/api/admin/store', { schema: C.StoreSettings }),
    updateSettings: (body: C.StoreSettingsPatch) =>
      request('PATCH', '/api/admin/store', { schema: C.StoreSettings, body }),
    pause: (body: C.PauseRequest) =>
      request('POST', '/api/admin/store/pause', { schema: C.StoreSettings, body }),

    zones: () => request('GET', '/api/admin/zones', { schema: z.array(C.DeliveryZone) }),
    createZone: (body: C.ZoneInput) =>
      request('POST', '/api/admin/zones', { schema: C.DeliveryZone, body }),
    updateZone: (id: string, body: Partial<C.ZoneInput>) =>
      request('PATCH', `/api/admin/zones/${enc(id)}`, { schema: C.DeliveryZone, body }),
    deactivateZone: (id: string) =>
      request('DELETE', `/api/admin/zones/${enc(id)}`, { schema: C.DeliveryZone }),

    promos: () => request('GET', '/api/admin/promos', { schema: z.array(C.AdminPromo) }),
    createPromo: (body: C.PromoInput) =>
      request('POST', '/api/admin/promos', { schema: C.AdminPromo, body }),
    updatePromo: (id: string, body: Partial<C.PromoInput>) =>
      request('PATCH', `/api/admin/promos/${enc(id)}`, { schema: C.AdminPromo, body }),

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

    riders: () => request('GET', '/api/admin/riders', { schema: z.array(C.Rider) }),
    settlement: () =>
      request('GET', '/api/admin/riders/settlement', { schema: z.array(C.RiderSettlement) }),
    settleRider: (riderId: string) =>
      request('POST', `/api/admin/riders/${enc(riderId)}/settle`, { schema: C.RiderSettlement }),

    salesReport: (from: string, to: string) =>
      request('GET', '/api/admin/reports/sales', { schema: C.SalesReport, query: { from, to } }),
    failedNotifications: () =>
      request('GET', '/api/admin/notifications/failed', { schema: z.array(C.FailedNotification) }),
    retryNotification: (id: string) =>
      request('POST', `/api/admin/notifications/${enc(id)}/retry`, {
        schema: C.FailedNotification,
      }),
  },
};

/** Realtime stream URLs live here too so lib/realtime never hard-codes paths. */
export const streamUrls = {
  order: (token: string) => `/api/realtime/orders/${enc(token)}`,
  kitchen: () => '/api/realtime/kitchen',
  menu: () => '/api/realtime/menu',
};
