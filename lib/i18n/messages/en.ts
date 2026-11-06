import home from './en/home';
import menuPage from './en/menu';
import item from './en/item';
import cartFlow from './en/cart';
import checkout from './en/checkout';
import payment from './en/payment';
import receipt from './en/receipt';
import tracking from './en/tracking';
import account from './en/account';
import deals from './en/deals';
import contact from './en/contact';
import about from './en/about';
import faq from './en/faq';
import legal from './en/legal';
import system from './en/system';
import admin from './en/admin';

/** English copy. Voice: short, punchy, confident. Errors are friendly, never blamey. */
const en = {
  meta: {
    title: 'Barraf Paani · Fast Food in Paradise City, Jhang',
    /** `%s` = the page title. */
    template: '%s · Barraf Paani, Jhang',
    description:
      'Fries, burgers, wings, wraps and pizza in Paradise City, Jhang. Order for delivery or pickup.',
  },
  brand: {
    name: 'Barraf Paani',
    tagline: 'Made fresh. Served furious.',
    craving: "What's the craving?",
  },
  a11y: {
    skipToContent: 'Skip to content',
    primaryNav: 'Main',
    logo: 'Barraf Paani home',
  },
  nav: {
    menu: 'Menu',
    deals: 'Deals & Events',
    about: 'About',
    visit: 'Visit',
    orderNow: 'Order now',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
  },
  lang: {
    label: 'Language',
    switchTo: 'اردو',
    current: 'EN',
  },
  fulfilment: {
    label: 'How do you want it?',
    delivery: 'Delivery',
    pickup: 'Pickup',
  },
  cart: {
    title: 'Your order',
    open: 'Open cart, {count, plural, =0 {empty} one {# item} other {# items}}',
    items: '{count, plural, one {# item} other {# items}}',
    viewCart: 'View cart',
    checkout: 'Checkout',
    emptyTitle: 'Nothing here yet',
    emptyBody: 'Your cart is hungry. Pick something loud from the menu.',
    browseMenu: 'Browse the menu',
    subtotal: 'Subtotal',
    estimateNote: 'Estimate. Final total is confirmed at checkout.',
    remove: 'Remove {name}',
    added: '{name} added',
    addedToast: 'Added · {name}',
    undo: 'Undo',
  },
  qty: {
    label: 'Quantity',
    decrease: 'Decrease quantity',
    increase: 'Increase quantity',
  },
  price: {
    rs: 'Rs {amount}',
    from: 'From Rs {amount}',
  },
  variant: {
    regular: 'Regular',
    large: 'Large',
    single: 'Single',
    double: 'Double',
    optionA: 'Option A',
    optionB: 'Option B',
    classic: 'Classic',
    cheese: 'Cheese',
  },
  store: {
    closed: "We're closed right now.",
    closedUntil: "We're closed. Back at {time}.",
    openingSoon: 'Opening soon. Doors at {time}.',
    paused: 'Orders are paused for a bit.',
    pausedReason: 'Orders are paused: {reason}',
    holiday: 'Closed today for a holiday.',
    holidayNote: 'Closed today: {note}.',
    preorderHint: 'You can still schedule an order.',
  },
  stage: {
    received: 'Order placed!',
    preparing: 'Cooking it furious',
    out_for_delivery: 'On the way',
    ready_for_pickup: 'Ready for pickup',
    delivered: 'Delivered. Enjoy!',
    cancelled: 'Order cancelled',
  },
  footer: {
    tagline: 'Made fresh. Served furious.',
    findUs: 'Find us',
    follow: 'Follow',
    legal: 'Legal',
    privacy: 'Privacy',
    terms: 'Terms',
    refunds: 'Refund policy',
    rights: '© {year} Barraf Paani. All rights reserved.',
    call: 'Call',
    whatsapp: 'WhatsApp',
    instagram: 'Instagram',
    facebook: 'Facebook',
    tiktok: 'TikTok',
    explore: 'Explore',
    language: 'Language',
    findOnGoogle: 'Find us on Google',
    reviewOnGoogle: 'Review us on Google',
    links: {
      menu: 'Menu',
      deals: 'Deals & Events',
      about: 'About the spot',
      contact: 'Visit & contact',
      faq: 'FAQ',
      track: 'Track an order',
      account: 'Your account',
    },
  },
  common: {
    close: 'Close',
    retry: 'Try again',
    loading: 'Loading…',
    back: 'Back',
    done: 'Done',
    add: 'Add',
    optional: 'Optional',
    soldOut: 'Sold out',
    new: 'New',
  },
  states: {
    errorTitle: 'Well, that went sideways',
    errorBody: "Something didn't load. It's not you. Give it another go.",
    offlineTitle: "You're offline",
    offlineBody: "Check your connection and we'll pick up where you left off.",
    emptyTitle: 'Nothing to see here',
  },
  // Per-screen namespaces live in ./en/*.ts (one file per area, so screens never collide).
  home,
  menuPage,
  item,
  cartFlow,
  checkout,
  payment,
  receipt,
  tracking,
  account,
  deals,
  contact,
  about,
  faq,
  legal,
  system,
  admin,
  status: {
    pending_payment: 'Awaiting payment',
    placed: 'New',
    accepted: 'Accepted',
    preparing: 'Preparing',
    ready: 'Ready',
    out_for_delivery: 'On the way',
    delivered: 'Delivered',
    picked_up: 'Picked up',
    cancelled: 'Cancelled',
    rejected: 'Rejected',
    payment_failed: 'Payment failed',
    expired: 'Expired',
  },
  source: {
    website: 'Website',
    whatsapp: 'WhatsApp',
    phone: 'Phone',
    walk_in: 'Walk-in',
    foodpanda: 'Foodpanda',
  },
  phone: {
    label: 'Phone number',
    placeholder: '03XX XXXXXXX',
    hint: "We'll text you order updates. Pakistani mobiles only.",
    invalid: "That doesn't look like a Pakistani mobile. Try 03XX XXXXXXX.",
  },
  otp: {
    label: 'Enter the 6-digit code',
    digit: 'Digit {n} of 6',
  },
  countdown: {
    left: '{time} left',
    expired: "Time's up",
  },
  map: {
    title: 'Drop your pin',
    hint: 'Pin your door so the rider finds you first time.',
    useLocation: 'Use my location',
    locating: 'Finding you…',
    denied: "We couldn't get your location. Type it in instead.",
    lat: 'Latitude',
    lng: 'Longitude',
    picked: 'Pinned at {lat}, {lng}',
    placeholder: 'Map coming soon',
  },
  errors: {
    STORE_CLOSED: "We're closed right now. Schedule it for later?",
    STORE_CLOSED_until: "We're closed right now. Back {time}. Schedule it for later?",
    ITEM_SOLD_OUT: 'Something in your cart just sold out. We highlighted it.',
    OUTSIDE_ZONE: "That spot's outside our delivery area. Pickup works though!",
    BELOW_MIN_ORDER: 'Add Rs {shortBy} more. Minimum order is Rs {minOrder}.',
    ADDRESS_NOT_FOUND: "We couldn't find that address. Pick it again?",
    COD_NOT_ALLOWED: "Cash on delivery isn't available for this order. Try another way to pay.",
    COD_NOT_ALLOWED_blocked:
      "Cash on delivery isn't available on this number. Call us and we'll sort it out.",
    COD_NOT_ALLOWED_over_cap:
      "That's a big order! Cash on delivery has a limit. Pay online or pick it up instead.",
    COD_NOT_ALLOWED_preorder_too_far:
      'Cash on delivery works for orders up to 2 hours ahead. Pay online or pick a sooner time.',
    PREORDER_INVALID: "That time doesn't work. Pick a slot in the next 7 days while we're open.",
    PROMO_INVALID: "That code didn't work.",
    PROMO_EXPIRED: 'That code has expired.',
    PROMO_LIMIT: 'That code has been used up.',
    PROMO_MIN_ORDER: 'That code needs an order of at least Rs {minOrder}.',
    TOO_LATE_TO_CANCEL: 'The kitchen already started. Call us at {phone} to change it.',
    RATE_LIMITED: 'Easy, tiger. Try again in a moment.',
    RATE_LIMITED_seconds: 'Easy, tiger. Try again in {seconds}s.',
    RATE_LIMITED_minutes:
      'Easy, tiger. Try again in {minutes, plural, one {# minute} other {# minutes}}.',
    IDEMPOTENCY_CONFLICT: 'Your order changed while sending. Review it and try again.',
    IN_PROGRESS: 'Still sending your order. Hang tight.',
    PAYMENT_PENDING: "We're still confirming your payment.",
    VALIDATION_FAILED: 'Something needs a second look.',
    UNAUTHENTICATED: 'Verify your phone number to continue.',
    UNAUTHENTICATED_otp: 'First cash order from this number? Verify it with a quick code.',
    FORBIDDEN: "You don't have access to that.",
    NOT_FOUND: "We couldn't find that.",
    OTP_INVALID: "That code isn't right. Check it and try again.",
    OTP_EXPIRED: 'That code expired. We can send a new one.',
    TURNSTILE_FAILED: "We couldn't confirm you're human. Try again.",
    DUPLICATE_ORDER_SUSPECTED:
      'You placed this same order a couple of minutes ago. Place it again?',
    VERSION_CONFLICT: 'Someone else just updated this. Refreshed.',
    INVALID_TRANSITION: "That step isn't possible right now.",
    EVENT_FULL: 'That event is full. Try another date or a table booking.',
    INTERNAL_ERROR: 'Something broke on our side. Give it another go.',
    NETWORK_ERROR: "Couldn't reach us. Check your connection and try again.",
  },
};

export default en;
export type Messages = typeof en;
