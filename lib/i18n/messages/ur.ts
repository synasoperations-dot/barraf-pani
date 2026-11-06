import type { Messages } from './en';
import home from './ur/home';
import menuPage from './ur/menu';
import item from './ur/item';
import cartFlow from './ur/cart';
import checkout from './ur/checkout';
import payment from './ur/payment';
import receipt from './ur/receipt';
import tracking from './ur/tracking';
import account from './ur/account';
import deals from './ur/deals';
import contact from './ur/contact';
import about from './ur/about';
import faq from './ur/faq';
import legal from './ur/legal';
import system from './ur/system';
import admin from './ur/admin';

// REVIEW: machine-drafted Urdu so RTL layout can be tested. Every string needs native review
// for tone ("Made fresh. Served furious." voice) before launch. Keys must stay identical to en.ts.
const ur: Messages = {
  meta: {
    title: 'برف پانی · فاسٹ فوڈ، پیراڈائز سٹی، جھنگ', // REVIEW
    template: '%s · برف پانی، جھنگ', // REVIEW
    description:
      'فرائز، برگر، ونگز، ریپس اور پیزا، پیراڈائز سٹی، جھنگ۔ ڈیلیوری یا پک اپ کے لیے آرڈر کریں۔', // REVIEW
  },
  brand: {
    name: 'برف پانی', // REVIEW: confirm Urdu spelling of the brand
    tagline: 'تازہ بنا، جوش سے پیش', // REVIEW
    craving: 'آج کیا کھانے کا دل ہے؟', // REVIEW
  },
  a11y: {
    skipToContent: 'مواد پر جائیں', // REVIEW
    primaryNav: 'مرکزی', // REVIEW
    logo: 'برف پانی ہوم', // REVIEW
  },
  nav: {
    menu: 'مینو', // REVIEW
    deals: 'ڈیلز اور ایونٹس', // REVIEW
    about: 'ہمارے بارے میں', // REVIEW
    visit: 'تشریف لائیں', // REVIEW
    orderNow: 'ابھی آرڈر کریں', // REVIEW
    openMenu: 'مینو کھولیں', // REVIEW
    closeMenu: 'مینو بند کریں', // REVIEW
  },
  lang: {
    label: 'زبان', // REVIEW
    switchTo: 'EN',
    current: 'اردو',
  },
  fulfilment: {
    label: 'آپ کیسے لینا چاہیں گے؟', // REVIEW
    delivery: 'ڈیلیوری', // REVIEW
    pickup: 'پک اپ', // REVIEW
  },
  cart: {
    title: 'آپ کا آرڈر', // REVIEW
    open: 'کارٹ کھولیں، {count, plural, =0 {خالی} other {# آئٹمز}}', // REVIEW
    items: '{count, plural, one {# آئٹم} other {# آئٹمز}}', // REVIEW
    viewCart: 'کارٹ دیکھیں', // REVIEW
    checkout: 'چیک آؤٹ', // REVIEW
    emptyTitle: 'ابھی کچھ نہیں', // REVIEW
    emptyBody: 'آپ کی کارٹ بھوکی ہے۔ مینو سے کچھ زبردست چنیں۔', // REVIEW
    browseMenu: 'مینو دیکھیں', // REVIEW
    subtotal: 'ذیلی کل', // REVIEW
    estimateNote: 'اندازہ۔ حتمی رقم چیک آؤٹ پر طے ہوگی۔', // REVIEW
    remove: '{name} ہٹائیں', // REVIEW
    added: '{name} شامل ہو گیا', // REVIEW
    addedToast: 'شامل ہو گیا · {name}', // REVIEW
    undo: 'واپس', // REVIEW
  },
  qty: {
    label: 'تعداد', // REVIEW
    decrease: 'تعداد کم کریں', // REVIEW
    increase: 'تعداد بڑھائیں', // REVIEW
  },
  price: {
    rs: '⁦Rs {amount}⁩',
    from: '⁦Rs {amount}⁩ سے', // REVIEW
  },
  variant: {
    regular: 'ریگولر', // REVIEW
    large: 'لارج', // REVIEW
    single: 'سنگل', // REVIEW
    double: 'ڈبل', // REVIEW
    optionA: 'آپشن A', // REVIEW
    optionB: 'آپشن B', // REVIEW
    classic: 'کلاسک', // REVIEW
    cheese: 'چیز', // REVIEW
  },
  store: {
    closed: 'ہم ابھی بند ہیں۔', // REVIEW
    closedUntil: 'ہم بند ہیں۔ ⁦{time}⁩ پر واپس۔', // REVIEW
    openingSoon: 'جلد کھل رہے ہیں۔ ⁦{time}⁩ پر۔', // REVIEW
    paused: 'آرڈرز کچھ دیر کے لیے رکے ہوئے ہیں۔', // REVIEW
    pausedReason: 'آرڈرز رکے ہوئے ہیں: {reason}', // REVIEW
    holiday: 'آج چھٹی کی وجہ سے بند ہے۔', // REVIEW
    holidayNote: 'آج بند: {note}۔', // REVIEW
    preorderHint: 'آپ پھر بھی آرڈر شیڈول کر سکتے ہیں۔', // REVIEW
  },
  stage: {
    received: 'آرڈر ہو گیا!', // REVIEW
    preparing: 'جوش سے پک رہا ہے', // REVIEW
    out_for_delivery: 'راستے میں ہے', // REVIEW
    ready_for_pickup: 'پک اپ کے لیے تیار', // REVIEW
    delivered: 'پہنچ گیا۔ مزے کریں!', // REVIEW
    cancelled: 'آرڈر منسوخ', // REVIEW
  },
  footer: {
    tagline: 'تازہ بنا، جوش سے پیش', // REVIEW
    findUs: 'ہمیں ڈھونڈیں', // REVIEW
    follow: 'فالو کریں', // REVIEW
    legal: 'قانونی', // REVIEW
    privacy: 'پرائیویسی', // REVIEW
    terms: 'شرائط', // REVIEW
    refunds: 'ریفنڈ پالیسی', // REVIEW
    rights: '© {year} برف پانی۔ جملہ حقوق محفوظ ہیں۔', // REVIEW
    call: 'کال کریں', // REVIEW
    whatsapp: 'واٹس ایپ', // REVIEW
    instagram: 'انسٹاگرام', // REVIEW
    facebook: 'فیس بک', // REVIEW
    tiktok: 'ٹک ٹاک', // REVIEW
    explore: 'مزید دیکھیں', // REVIEW
    language: 'زبان', // REVIEW
    findOnGoogle: 'گوگل پر ہمیں ڈھونڈیں', // REVIEW
    reviewOnGoogle: 'گوگل پر ریویو دیں', // REVIEW
    links: {
      menu: 'مینو', // REVIEW
      deals: 'ڈیلز اور ایونٹس', // REVIEW
      about: 'ہماری جگہ', // REVIEW
      contact: 'آئیں اور رابطہ کریں', // REVIEW
      faq: 'سوالات', // REVIEW
      track: 'آرڈر ٹریک کریں', // REVIEW
      account: 'آپ کا اکاؤنٹ', // REVIEW
    },
  },
  common: {
    close: 'بند کریں', // REVIEW
    retry: 'دوبارہ کوشش کریں', // REVIEW
    loading: 'لوڈ ہو رہا ہے…', // REVIEW
    back: 'واپس', // REVIEW
    done: 'ہو گیا', // REVIEW
    add: 'شامل کریں', // REVIEW
    optional: 'اختیاری', // REVIEW
    soldOut: 'ختم', // REVIEW
    new: 'نیا', // REVIEW
  },
  states: {
    errorTitle: 'کچھ گڑبڑ ہو گئی', // REVIEW
    errorBody: 'کچھ لوڈ نہیں ہوا۔ آپ کی غلطی نہیں۔ دوبارہ کوشش کریں۔', // REVIEW
    offlineTitle: 'آپ آف لائن ہیں', // REVIEW
    offlineBody: 'کنکشن چیک کریں، ہم وہیں سے شروع کریں گے۔', // REVIEW
    emptyTitle: 'یہاں کچھ نہیں', // REVIEW
  },
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
    pending_payment: 'ادائیگی کا انتظار', // REVIEW
    placed: 'نیا', // REVIEW
    accepted: 'قبول', // REVIEW
    preparing: 'تیار ہو رہا ہے', // REVIEW
    ready: 'تیار', // REVIEW
    out_for_delivery: 'راستے میں', // REVIEW
    delivered: 'پہنچ گیا', // REVIEW
    picked_up: 'لے لیا گیا', // REVIEW
    cancelled: 'منسوخ', // REVIEW
    rejected: 'مسترد', // REVIEW
    payment_failed: 'ادائیگی ناکام', // REVIEW
    expired: 'میعاد ختم', // REVIEW
  },
  source: {
    website: 'ویب سائٹ', // REVIEW
    whatsapp: 'واٹس ایپ', // REVIEW
    phone: 'فون', // REVIEW
    walk_in: 'واک اِن', // REVIEW
    foodpanda: 'فوڈ پانڈا', // REVIEW
  },
  phone: {
    label: 'فون نمبر', // REVIEW
    placeholder: '03XX XXXXXXX',
    hint: 'ہم آپ کو آرڈر کی اپڈیٹس بھیجیں گے۔ صرف پاکستانی موبائل۔', // REVIEW
    invalid: 'یہ پاکستانی موبائل نمبر نہیں لگتا۔ 03XX XXXXXXX لکھیں۔', // REVIEW
  },
  otp: {
    label: '6 ہندسوں کا کوڈ لکھیں', // REVIEW
    digit: '6 میں سے ہندسہ {n}', // REVIEW
  },
  countdown: {
    left: '⁦{time}⁩ باقی', // REVIEW
    expired: 'وقت ختم', // REVIEW
  },
  map: {
    title: 'اپنی جگہ پن کریں', // REVIEW
    hint: 'اپنے دروازے پر پن لگائیں تاکہ رائیڈر پہلی بار میں پہنچے۔', // REVIEW
    useLocation: 'میری لوکیشن استعمال کریں', // REVIEW
    locating: 'آپ کو ڈھونڈ رہے ہیں…', // REVIEW
    denied: 'لوکیشن نہیں ملی۔ خود لکھیں۔', // REVIEW
    lat: 'عرض بلد', // REVIEW
    lng: 'طول بلد', // REVIEW
    picked: '⁦{lat}⁩, ⁦{lng}⁩ پر پن', // REVIEW
    placeholder: 'نقشہ جلد آ رہا ہے', // REVIEW
  },
  errors: {
    STORE_CLOSED: 'ہم ابھی بند ہیں۔ بعد کے لیے شیڈول کریں؟', // REVIEW
    STORE_CLOSED_until: 'ہم ابھی بند ہیں۔ ⁦{time}⁩ واپس۔ بعد کے لیے آرڈر شیڈول کریں؟', // REVIEW
    ITEM_SOLD_OUT: 'آپ کی کارٹ میں کچھ ابھی ختم ہو گیا۔ ہم نے نشان لگا دیا ہے۔', // REVIEW
    OUTSIDE_ZONE: 'یہ جگہ ہمارے ڈیلیوری علاقے سے باہر ہے۔ پک اپ ممکن ہے!', // REVIEW
    BELOW_MIN_ORDER: 'تھوڑا اور شامل کریں۔ کم از کم آرڈر ⁦Rs {minOrder}⁩ ہے۔', // REVIEW
    ADDRESS_NOT_FOUND: 'یہ پتہ نہیں ملا۔ دوبارہ چنیں؟', // REVIEW
    COD_NOT_ALLOWED: 'اس آرڈر پر کیش آن ڈیلیوری دستیاب نہیں۔ کوئی اور طریقہ آزمائیں۔', // REVIEW
    COD_NOT_ALLOWED_blocked: 'اس نمبر پر کیش آن ڈیلیوری دستیاب نہیں۔ ہمیں کال کریں۔', // REVIEW
    COD_NOT_ALLOWED_over_cap:
      'بڑا آرڈر! کیش آن ڈیلیوری کی حد ہے۔ آن لائن ادائیگی کریں یا پک اپ کریں۔', // REVIEW
    COD_NOT_ALLOWED_preorder_too_far:
      'کیش آن ڈیلیوری صرف 2 گھنٹے تک پہلے کے آرڈرز پر ہے۔ آن لائن ادائیگی کریں یا جلدی کا وقت چنیں۔', // REVIEW
    PREORDER_INVALID: 'یہ وقت نہیں چلے گا۔ اگلے 7 دنوں میں ہمارے کھلنے کا وقت چنیں۔', // REVIEW
    PROMO_INVALID: 'یہ کوڈ نہیں چلا۔', // REVIEW
    PROMO_EXPIRED: 'یہ کوڈ ختم ہو چکا ہے۔', // REVIEW
    PROMO_LIMIT: 'یہ کوڈ پورا استعمال ہو چکا ہے۔', // REVIEW
    PROMO_MIN_ORDER: 'اس کوڈ کے لیے کم از کم ⁦Rs {minOrder}⁩ کا آرڈر چاہیے۔', // REVIEW
    TOO_LATE_TO_CANCEL: 'کچن شروع کر چکا ہے۔ تبدیلی کے لیے ⁦{phone}⁩ پر کال کریں۔', // REVIEW
    RATE_LIMITED: 'ذرا رکیں۔ تھوڑی دیر میں دوبارہ کوشش کریں۔', // REVIEW
    RATE_LIMITED_seconds: 'ذرا رکیں۔ ⁦{seconds}⁩ سیکنڈ بعد دوبارہ کوشش کریں۔', // REVIEW
    RATE_LIMITED_minutes: 'ذرا رکیں۔ {minutes} منٹ بعد دوبارہ کوشش کریں۔', // REVIEW
    IDEMPOTENCY_CONFLICT: 'بھیجتے وقت آپ کا آرڈر بدل گیا۔ دیکھ کر دوبارہ کوشش کریں۔', // REVIEW
    IN_PROGRESS: 'آپ کا آرڈر ابھی جا رہا ہے۔ تھوڑا انتظار کریں۔', // REVIEW
    PAYMENT_PENDING: 'ہم ابھی آپ کی ادائیگی کی تصدیق کر رہے ہیں۔', // REVIEW
    VALIDATION_FAILED: 'کچھ چیزیں دوبارہ دیکھنی ہیں۔', // REVIEW
    UNAUTHENTICATED: 'جاری رکھنے کے لیے اپنا فون نمبر تصدیق کریں۔', // REVIEW
    UNAUTHENTICATED_otp: 'اس نمبر سے پہلا کیش آرڈر؟ ایک کوڈ سے تصدیق کریں۔', // REVIEW
    FORBIDDEN: 'آپ کو اس تک رسائی نہیں۔', // REVIEW
    NOT_FOUND: 'یہ نہیں ملا۔', // REVIEW
    OTP_INVALID: 'یہ کوڈ درست نہیں۔ چیک کر کے دوبارہ کوشش کریں۔', // REVIEW
    OTP_EXPIRED: 'یہ کوڈ ختم ہو گیا۔ ہم نیا بھیج سکتے ہیں۔', // REVIEW
    TURNSTILE_FAILED: 'ہم تصدیق نہیں کر سکے۔ دوبارہ کوشش کریں۔', // REVIEW
    DUPLICATE_ORDER_SUSPECTED: 'آپ نے ابھی یہی آرڈر کیا تھا۔ دوبارہ کریں؟', // REVIEW
    VERSION_CONFLICT: 'کسی اور نے ابھی اسے بدلا ہے۔ ریفریش ہو گیا۔', // REVIEW
    INVALID_TRANSITION: 'یہ قدم ابھی ممکن نہیں۔', // REVIEW
    EVENT_FULL: 'یہ ایونٹ بھر چکا ہے۔ کوئی اور تاریخ یا ٹیبل بکنگ آزمائیں۔', // REVIEW
    INTERNAL_ERROR: 'ہماری طرف کچھ خراب ہو گیا۔ دوبارہ کوشش کریں۔', // REVIEW
    NETWORK_ERROR: 'ہم تک رسائی نہیں ہو سکی۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔', // REVIEW
  },
};

export default ur;
