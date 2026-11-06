import type { Messages } from './en';
import home from './ur/home';
import menuPage from './ur/menu';
import item from './ur/item';
import cartFlow from './ur/cart';
import checkout from './ur/checkout';
import payment from './ur/payment';
import receipt from './ur/receipt';
import tracking from './ur/tracking';

// TODO translate: machine-drafted Urdu so RTL layout can be tested. Every string needs native review
// for tone ("Made fresh. Served furious." voice) before launch. Keys must stay identical to en.ts.
const ur: Messages = {
  meta: {
    title: 'برف پانی · تازہ بنا، جوش سے پیش', // TODO translate
    description:
      'فرائز، برگر، ونگز، ریپس اور پیزا، پیراڈائز سٹی، جھنگ۔ ڈیلیوری یا پک اپ کے لیے آرڈر کریں۔', // TODO translate
  },
  brand: {
    name: 'برف پانی', // TODO translate: confirm Urdu spelling of the brand
    tagline: 'تازہ بنا، جوش سے پیش', // TODO translate
    craving: 'آج کیا کھانے کا دل ہے؟', // TODO translate
  },
  a11y: {
    skipToContent: 'مواد پر جائیں', // TODO translate
    primaryNav: 'مرکزی', // TODO translate
    logo: 'برف پانی ہوم', // TODO translate
  },
  nav: {
    menu: 'مینو', // TODO translate
    deals: 'ڈیلز اور ایونٹس', // TODO translate
    about: 'ہمارے بارے میں', // TODO translate
    visit: 'تشریف لائیں', // TODO translate
    orderNow: 'ابھی آرڈر کریں', // TODO translate
    openMenu: 'مینو کھولیں', // TODO translate
    closeMenu: 'مینو بند کریں', // TODO translate
  },
  lang: {
    label: 'زبان', // TODO translate
    switchTo: 'EN',
    current: 'اردو',
  },
  fulfilment: {
    label: 'آپ کیسے لینا چاہیں گے؟', // TODO translate
    delivery: 'ڈیلیوری', // TODO translate
    pickup: 'پک اپ', // TODO translate
  },
  cart: {
    title: 'آپ کا آرڈر', // TODO translate
    open: 'کارٹ کھولیں، {count, plural, =0 {خالی} other {# آئٹمز}}', // TODO translate
    items: '{count, plural, one {# آئٹم} other {# آئٹمز}}', // TODO translate
    viewCart: 'کارٹ دیکھیں', // TODO translate
    checkout: 'چیک آؤٹ', // TODO translate
    emptyTitle: 'ابھی کچھ نہیں', // TODO translate
    emptyBody: 'آپ کی کارٹ بھوکی ہے۔ مینو سے کچھ زبردست چنیں۔', // TODO translate
    browseMenu: 'مینو دیکھیں', // TODO translate
    subtotal: 'ذیلی کل', // TODO translate
    estimateNote: 'اندازہ۔ حتمی رقم چیک آؤٹ پر طے ہوگی۔', // TODO translate
    remove: '{name} ہٹائیں', // TODO translate
    added: '{name} شامل ہو گیا', // TODO translate
    addedToast: 'شامل ہو گیا · {name}', // TODO translate
    undo: 'واپس', // TODO translate
  },
  qty: {
    label: 'تعداد', // TODO translate
    decrease: 'تعداد کم کریں', // TODO translate
    increase: 'تعداد بڑھائیں', // TODO translate
  },
  price: {
    rs: 'Rs {amount}',
    from: 'Rs {amount} سے', // TODO translate
  },
  variant: {
    regular: 'ریگولر', // TODO translate
    large: 'لارج', // TODO translate
    single: 'سنگل', // TODO translate
    double: 'ڈبل', // TODO translate
    optionA: 'آپشن A', // TODO translate
    optionB: 'آپشن B', // TODO translate
    classic: 'کلاسک', // TODO translate
    cheese: 'چیز', // TODO translate
  },
  store: {
    closed: 'ہم ابھی بند ہیں۔', // TODO translate
    closedUntil: 'ہم بند ہیں۔ {time} پر واپس۔', // TODO translate
    openingSoon: 'جلد کھل رہے ہیں۔ {time} پر۔', // TODO translate
    paused: 'آرڈرز کچھ دیر کے لیے رکے ہوئے ہیں۔', // TODO translate
    pausedReason: 'آرڈرز رکے ہوئے ہیں: {reason}', // TODO translate
    preorderHint: 'آپ پھر بھی آرڈر شیڈول کر سکتے ہیں۔', // TODO translate
  },
  stage: {
    received: 'آرڈر ہو گیا!', // TODO translate
    preparing: 'جوش سے پک رہا ہے', // TODO translate
    out_for_delivery: 'راستے میں ہے', // TODO translate
    ready_for_pickup: 'پک اپ کے لیے تیار', // TODO translate
    delivered: 'پہنچ گیا۔ مزے کریں!', // TODO translate
    cancelled: 'آرڈر منسوخ', // TODO translate
  },
  footer: {
    tagline: 'تازہ بنا، جوش سے پیش', // TODO translate
    findUs: 'ہمیں ڈھونڈیں', // TODO translate
    follow: 'فالو کریں', // TODO translate
    legal: 'قانونی', // TODO translate
    privacy: 'پرائیویسی', // TODO translate
    terms: 'شرائط', // TODO translate
    refunds: 'ریفنڈ پالیسی', // TODO translate
    rights: '© {year} برف پانی۔ جملہ حقوق محفوظ ہیں۔', // TODO translate
    call: 'کال کریں', // TODO translate
    whatsapp: 'واٹس ایپ', // TODO translate
    instagram: 'انسٹاگرام', // TODO translate
    facebook: 'فیس بک', // TODO translate
    tiktok: 'ٹک ٹاک', // TODO translate
  },
  common: {
    close: 'بند کریں', // TODO translate
    retry: 'دوبارہ کوشش کریں', // TODO translate
    loading: 'لوڈ ہو رہا ہے…', // TODO translate
    back: 'واپس', // TODO translate
    done: 'ہو گیا', // TODO translate
    add: 'شامل کریں', // TODO translate
    optional: 'اختیاری', // TODO translate
    soldOut: 'ختم', // TODO translate
    new: 'نیا', // TODO translate
  },
  states: {
    errorTitle: 'کچھ گڑبڑ ہو گئی', // TODO translate
    errorBody: 'کچھ لوڈ نہیں ہوا۔ آپ کی غلطی نہیں۔ دوبارہ کوشش کریں۔', // TODO translate
    offlineTitle: 'آپ آف لائن ہیں', // TODO translate
    offlineBody: 'کنکشن چیک کریں، ہم وہیں سے شروع کریں گے۔', // TODO translate
    emptyTitle: 'یہاں کچھ نہیں', // TODO translate
  },
  home,
  menuPage,
  item,
  cartFlow,
  checkout,
  payment,
  receipt,
  tracking,
  status: {
    pending_payment: 'ادائیگی کا انتظار', // TODO translate
    placed: 'نیا', // TODO translate
    accepted: 'قبول', // TODO translate
    preparing: 'تیار ہو رہا ہے', // TODO translate
    ready: 'تیار', // TODO translate
    out_for_delivery: 'راستے میں', // TODO translate
    delivered: 'پہنچ گیا', // TODO translate
    picked_up: 'لے لیا گیا', // TODO translate
    cancelled: 'منسوخ', // TODO translate
    rejected: 'مسترد', // TODO translate
    payment_failed: 'ادائیگی ناکام', // TODO translate
    expired: 'میعاد ختم', // TODO translate
  },
  source: {
    website: 'ویب سائٹ', // TODO translate
    whatsapp: 'واٹس ایپ', // TODO translate
    phone: 'فون', // TODO translate
    walk_in: 'واک اِن', // TODO translate
    foodpanda: 'فوڈ پانڈا', // TODO translate
  },
  phone: {
    label: 'فون نمبر', // TODO translate
    placeholder: '03XX XXXXXXX',
    hint: 'ہم آپ کو آرڈر کی اپڈیٹس بھیجیں گے۔ صرف پاکستانی موبائل۔', // TODO translate
    invalid: 'یہ پاکستانی موبائل نمبر نہیں لگتا۔ 03XX XXXXXXX لکھیں۔', // TODO translate
  },
  otp: {
    label: '6 ہندسوں کا کوڈ لکھیں', // TODO translate
    digit: '6 میں سے ہندسہ {n}', // TODO translate
  },
  countdown: {
    left: '{time} باقی', // TODO translate
    expired: 'وقت ختم', // TODO translate
  },
  map: {
    title: 'اپنی جگہ پن کریں', // TODO translate
    hint: 'اپنے دروازے پر پن لگائیں تاکہ رائیڈر پہلی بار میں پہنچے۔', // TODO translate
    useLocation: 'میری لوکیشن استعمال کریں', // TODO translate
    locating: 'آپ کو ڈھونڈ رہے ہیں…', // TODO translate
    denied: 'لوکیشن نہیں ملی۔ خود لکھیں۔', // TODO translate
    lat: 'عرض بلد', // TODO translate
    lng: 'طول بلد', // TODO translate
    picked: '{lat}, {lng} پر پن', // TODO translate
    placeholder: 'نقشہ جلد آ رہا ہے', // TODO translate
  },
  errors: {
    STORE_CLOSED: 'ہم ابھی بند ہیں۔ بعد کے لیے شیڈول کریں؟', // TODO translate
    STORE_CLOSED_until: 'ہم ابھی بند ہیں۔ {time} واپس۔ بعد کے لیے آرڈر شیڈول کریں؟', // TODO translate
    ITEM_SOLD_OUT: 'آپ کی کارٹ میں کچھ ابھی ختم ہو گیا۔ ہم نے نشان لگا دیا ہے۔', // TODO translate
    OUTSIDE_ZONE: 'یہ جگہ ہمارے ڈیلیوری علاقے سے باہر ہے۔ پک اپ ممکن ہے!', // TODO translate
    BELOW_MIN_ORDER: 'تھوڑا اور شامل کریں۔ کم از کم آرڈر Rs {minOrder} ہے۔', // TODO translate
    ADDRESS_NOT_FOUND: 'یہ پتہ نہیں ملا۔ دوبارہ چنیں؟', // TODO translate
    COD_NOT_ALLOWED: 'اس آرڈر پر کیش آن ڈیلیوری دستیاب نہیں۔ کوئی اور طریقہ آزمائیں۔', // TODO translate
    COD_NOT_ALLOWED_blocked: 'اس نمبر پر کیش آن ڈیلیوری دستیاب نہیں۔ ہمیں کال کریں۔', // TODO translate
    COD_NOT_ALLOWED_over_cap:
      'بڑا آرڈر! کیش آن ڈیلیوری کی حد ہے۔ آن لائن ادائیگی کریں یا پک اپ کریں۔', // TODO translate
    COD_NOT_ALLOWED_preorder_too_far:
      'کیش آن ڈیلیوری صرف 2 گھنٹے تک پہلے کے آرڈرز پر ہے۔ آن لائن ادائیگی کریں یا جلدی کا وقت چنیں۔', // TODO translate
    PREORDER_INVALID: 'یہ وقت نہیں چلے گا۔ اگلے 7 دنوں میں ہمارے کھلنے کا وقت چنیں۔', // TODO translate
    PROMO_INVALID: 'یہ کوڈ نہیں چلا۔', // TODO translate
    PROMO_EXPIRED: 'یہ کوڈ ختم ہو چکا ہے۔', // TODO translate
    PROMO_LIMIT: 'یہ کوڈ پورا استعمال ہو چکا ہے۔', // TODO translate
    PROMO_MIN_ORDER: 'اس کوڈ کے لیے کم از کم Rs {minOrder} کا آرڈر چاہیے۔', // TODO translate
    TOO_LATE_TO_CANCEL: 'کچن شروع کر چکا ہے۔ تبدیلی کے لیے {phone} پر کال کریں۔', // TODO translate
    RATE_LIMITED: 'ذرا رکیں۔ تھوڑی دیر میں دوبارہ کوشش کریں۔', // TODO translate
    RATE_LIMITED_seconds: 'ذرا رکیں۔ {seconds} سیکنڈ بعد دوبارہ کوشش کریں۔', // TODO translate
    RATE_LIMITED_minutes: 'ذرا رکیں۔ {minutes} منٹ بعد دوبارہ کوشش کریں۔', // TODO translate
    IDEMPOTENCY_CONFLICT: 'بھیجتے وقت آپ کا آرڈر بدل گیا۔ دیکھ کر دوبارہ کوشش کریں۔', // TODO translate
    IN_PROGRESS: 'آپ کا آرڈر ابھی جا رہا ہے۔ تھوڑا انتظار کریں۔', // TODO translate
    PAYMENT_PENDING: 'ہم ابھی آپ کی ادائیگی کی تصدیق کر رہے ہیں۔', // TODO translate
    VALIDATION_FAILED: 'کچھ چیزیں دوبارہ دیکھنی ہیں۔', // TODO translate
    UNAUTHENTICATED: 'جاری رکھنے کے لیے اپنا فون نمبر تصدیق کریں۔', // TODO translate
    UNAUTHENTICATED_otp: 'اس نمبر سے پہلا کیش آرڈر؟ ایک کوڈ سے تصدیق کریں۔', // TODO translate
    FORBIDDEN: 'آپ کو اس تک رسائی نہیں۔', // TODO translate
    NOT_FOUND: 'یہ نہیں ملا۔', // TODO translate
    OTP_INVALID: 'یہ کوڈ درست نہیں۔ چیک کر کے دوبارہ کوشش کریں۔', // TODO translate
    OTP_EXPIRED: 'یہ کوڈ ختم ہو گیا۔ ہم نیا بھیج سکتے ہیں۔', // TODO translate
    TURNSTILE_FAILED: 'ہم تصدیق نہیں کر سکے۔ دوبارہ کوشش کریں۔', // TODO translate
    DUPLICATE_ORDER_SUSPECTED: 'آپ نے ابھی یہی آرڈر کیا تھا۔ دوبارہ کریں؟', // TODO translate
    VERSION_CONFLICT: 'کسی اور نے ابھی اسے بدلا ہے۔ ریفریش ہو گیا۔', // TODO translate
    INVALID_TRANSITION: 'یہ قدم ابھی ممکن نہیں۔', // TODO translate
    EVENT_FULL: 'یہ ایونٹ بھر چکا ہے۔ کوئی اور تاریخ یا ٹیبل بکنگ آزمائیں۔', // TODO translate
    INTERNAL_ERROR: 'ہماری طرف کچھ خراب ہو گیا۔ دوبارہ کوشش کریں۔', // TODO translate
    NETWORK_ERROR: 'ہم تک رسائی نہیں ہو سکی۔ کنکشن چیک کر کے دوبارہ کوشش کریں۔', // TODO translate
  },
};

export default ur;
