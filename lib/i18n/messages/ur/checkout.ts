import type { Messages } from '../en';

// TODO translate: machine-drafted. Keys must match en/checkout.ts exactly.
const checkout: Messages['checkout'] = {
  title: 'چیک آؤٹ', // TODO translate
  metaTitle: 'چیک آؤٹ · برف پانی', // TODO translate
  stepN: 'مرحلہ {n} از 5:', // TODO translate
  steps: {
    contact: 'رابطہ', // TODO translate
    delivery: 'ڈیلیوری', // TODO translate
    pickup: 'پک اپ', // TODO translate
    when: 'کب', // TODO translate
    payment: 'ادائیگی', // TODO translate
    review: 'جائزہ', // TODO translate
  },
  empty: {
    title: 'چیک آؤٹ کے لیے کچھ نہیں', // TODO translate
    body: 'آپ کی ٹوکری خالی ہے۔ پہلے مینو سے کچھ زبردست چنیں۔', // TODO translate
    cta: 'مینو دیکھیں', // TODO translate
  },
  closed: {
    title: 'ہم بند ہیں', // TODO translate
    opensAt: 'ہم بند ہیں۔ {time} پر کھلیں گے۔', // TODO translate
    noTime: 'ہم ابھی بند ہیں۔ جلد دوبارہ دیکھیں۔', // TODO translate
    paused: 'آرڈر عارضی طور پر بند ہیں: {reason}', // TODO translate
    body: 'ابھی پیشگی آرڈر بند ہیں، اس لیے یہ آرڈر ابھی نہیں لے سکتے۔ آپ کی ٹوکری محفوظ ہے۔', // TODO translate
    cta: 'واپس مینو پر', // TODO translate
  },
  offline: {
    title: 'آپ آف لائن ہیں', // TODO translate
    body: 'آپ کا آرڈر اس صفحے پر محفوظ ہے۔ دوبارہ جڑیں اور پھر کوشش کریں۔ یہ دو بار نہیں جائے گا۔', // TODO translate
  },
  contact: {
    name: 'آپ کا نام', // TODO translate
    namePlaceholder: 'علی رضا', // TODO translate
    nameError: 'بتائیں آرڈر کس کے لیے ہے۔', // TODO translate
    phoneError: 'پاکستانی موبائل نمبر درکار ہے، جیسے 03XX XXXXXXX۔', // TODO translate
    whatsapp: 'آرڈر کی اپڈیٹس واٹس ایپ پر بھیجیں', // TODO translate
    whatsappHint: 'اختیاری۔ صرف اس آرڈر کے بارے میں، کوئی اسپام نہیں۔', // TODO translate
  },
  otp: {
    title: 'فوری تصدیق', // TODO translate
    body: 'اس نمبر سے پہلا کیش آرڈر؟ 6 ہندسوں کے کوڈ سے تصدیق کریں۔', // TODO translate
    send: 'کوڈ بھیجیں', // TODO translate
    sentTo: 'کوڈ {phone} پر بھیج دیا گیا۔', // TODO translate
    verify: 'تصدیق کریں', // TODO translate
    resend: 'نیا کوڈ بھیجیں', // TODO translate
    resendIn: 'نیا کوڈ {seconds} سیکنڈ میں', // TODO translate
    locked: 'بہت زیادہ کوڈ۔ {time} بعد دوبارہ کوشش کریں۔', // TODO translate
    verified: 'تصدیق شدہ', // TODO translate
    mockHint: 'موک کوڈ: 123456', // TODO translate
    required: 'کیش آرڈر کے لیے اپنا نمبر تصدیق کریں۔', // TODO translate
  },
  delivery: {
    saved: 'یہاں پہنچائیں', // TODO translate
    newAddress: 'نیا پتہ', // TODO translate
    newAddressHint: 'پن لگائیں اور رائیڈر کو بتائیں کہاں آنا ہے', // TODO translate
    line1: 'مکان / گلی', // TODO translate
    line1Placeholder: 'مکان 12، گلی 4', // TODO translate
    line1Error: 'اپنا مکان اور گلی لکھیں۔', // TODO translate
    area: 'علاقہ', // TODO translate
    areaPlaceholder: 'پیراڈائز سٹی', // TODO translate
    areaError: 'آپ کس علاقے میں ہیں؟', // TODO translate
    landmark: 'نشانی', // TODO translate
    landmarkPlaceholder: 'پیٹرول پمپ کے سامنے', // TODO translate
    landmarkHint: 'ضرور لکھیں۔ "نیلے گیٹ کے پاس" سے رائیڈر کو فون نہیں کرنا پڑتا۔', // TODO translate
    pinError: 'پن لگائیں تاکہ رائیڈر آپ کو ڈھونڈ سکے۔', // TODO translate
    zone: '{zone} · ڈیلیوری {fee} · تقریباً {minutes} منٹ', // TODO translate
    checking: 'ڈیلیوری فیس دیکھ رہے ہیں…', // TODO translate
    outsideTitle: 'ہم ابھی وہاں نہیں پہنچتے', // TODO translate
    outsideBody: 'یہ جگہ ہمارے ڈیلیوری علاقے سے باہر ہے۔ پک اپ جلدی ہے اور فرائز اتنے ہی زبردست۔', // TODO translate
    switchToPickup: 'پک اپ پر جائیں', // TODO translate
    pickAgain: 'پتہ دوبارہ چنیں', // TODO translate
  },
  pickup: {
    title: 'یہاں سے لیں', // TODO translate
    ready: 'تقریباً {minutes} منٹ میں تیار', // TODO translate
    call: 'کال کریں {phone}', // TODO translate
    directions: 'راستہ', // TODO translate
  },
  when: {
    label: 'آپ کو کب چاہیے؟', // TODO translate
    asap: 'جتنی جلدی ممکن ہو', // TODO translate
    asapHint: 'سیدھا کچن میں', // TODO translate
    schedule: 'وقت طے کریں', // TODO translate
    scheduleHint: 'دن اور وقت چنیں', // TODO translate
    forced: 'ہم ابھی بند ہیں، اس لیے یہ پیشگی آرڈر ہوگا۔', // TODO translate
    forcedPaused: 'آرڈر ابھی رکے ہوئے ہیں، اس لیے یہ پیشگی آرڈر ہوگا۔', // TODO translate
    day: 'دن', // TODO translate
    time: 'وقت', // TODO translate
    today: 'آج', // TODO translate
    tomorrow: 'کل', // TODO translate
    none: 'اگلے {days} دنوں میں کوئی وقت خالی نہیں۔ ہمیں کال کریں۔', // TODO translate
    pick: 'وقت چنیں۔', // TODO translate
    scheduleInstead: 'اس کے بجائے وقت طے کریں', // TODO translate
  },
  payment: {
    label: 'آپ کیسے ادائیگی کریں گے؟', // TODO translate
    cod: 'کیش آن ڈیلیوری', // TODO translate
    codPickup: 'کاؤنٹر پر کیش', // TODO translate
    codHint: 'ملنے پر ادائیگی کریں', // TODO translate
    jazzcash: 'جاز کیش', // TODO translate
    easypaisa: 'ایزی پیسہ', // TODO translate
    onlineHint: 'ابھی محفوظ والٹ صفحے پر آن لائن ادائیگی کریں', // TODO translate
    sooner: 'جلدی کا وقت چنیں', // TODO translate
    pick: 'ادائیگی کا طریقہ چنیں۔', // TODO translate
  },
  summary: {
    title: 'آپ کا آرڈر', // TODO translate
    edit: 'ٹوکری میں تبدیلی', // TODO translate
    quoting: 'آپ کا کل اپڈیٹ ہو رہا ہے…', // TODO translate
    subtotal: 'ذیلی کل', // TODO translate
    deliveryFee: 'ڈیلیوری', // TODO translate
    free: 'مفت', // TODO translate
    discount: 'رعایت · {code}', // TODO translate
    tax: 'ٹیکس', // TODO translate
    tip: 'ٹپ', // TODO translate
    total: 'کل', // TODO translate
    etaDelivery: 'تقریباً {minutes} منٹ میں پہنچے گا', // TODO translate
    etaPickup: 'تقریباً {minutes} منٹ میں تیار', // TODO translate
    pinFirst: 'ڈیلیوری فیس اور کل دیکھنے کے لیے پن لگائیں۔', // TODO translate
    soldOut: 'ختم', // TODO translate
    soldOutHelp: 'یہ ابھی ختم ہو گیا۔ اسے ہٹائیں یا بدل دیں۔', // TODO translate
    remove: 'ہٹائیں', // TODO translate
    replace: 'بدل دیں', // TODO translate
    belowMinTitle: '{shortBy} مزید شامل کریں', // TODO translate
    belowMinBody: 'کم از کم آرڈر {minOrder} ہے۔ کچھ جلدی سے شامل کریں؟', // TODO translate
    quickAdd: '{name} شامل کریں', // TODO translate
  },
  promo: {
    label: 'پرومو کوڈ', // TODO translate
    placeholder: 'مثلاً FRIES10', // TODO translate
    apply: 'لگائیں', // TODO translate
    remove: 'کوڈ ہٹائیں', // TODO translate
    applied: '{code} لگ گیا', // TODO translate
  },
  notes: {
    label: 'کچن کے لیے ہدایات', // TODO translate
    placeholder: 'زیادہ کرسپی، پیاز کے بغیر…', // TODO translate
    count: '{count}/300', // TODO translate
  },
  place: {
    cta: 'آرڈر کریں', // TODO translate
    placing: 'آپ کا آرڈر بھیج رہے ہیں…', // TODO translate
    placingBody: 'تھوڑا انتظار کریں، یہ صفحہ بند نہ کریں۔', // TODO translate
    waitQuote: 'آپ کا حتمی کل آ رہا ہے…', // TODO translate
    fixFirst: 'پہلے نشان زدہ حصہ ٹھیک کریں۔', // TODO translate
    fixFields: 'کچھ تفصیلات دوبارہ دیکھیں۔', // TODO translate
    retryIn: 'آپ دوبارہ کوشش کر سکیں گے', // TODO translate
  },
  conflict: {
    title: 'آپ کا آرڈر بدل گیا', // TODO translate
    body: 'بھیجتے وقت آپ کا آرڈر بدل گیا۔ جائزہ لے کر دوبارہ آرڈر کریں؟', // TODO translate
    confirm: 'جائزہ لیں اور دوبارہ آرڈر کریں', // TODO translate
  },
  duplicate: {
    title: 'دوبارہ آرڈر کریں؟', // TODO translate
    body: 'آپ نے 2 منٹ پہلے یہی آرڈر دیا تھا۔ دوبارہ آرڈر کریں؟', // TODO translate
    again: 'دوبارہ آرڈر کریں', // TODO translate
    view: 'وہ آرڈر دیکھیں', // TODO translate
  },
  turnstile: {
    mock: 'بوٹ چیک · موک', // TODO translate
    label: 'بوٹ چیک', // TODO translate
  },
};

export default checkout;
