import type { Messages } from '../en';

// REVIEW: machine-drafted. Keys must match en/checkout.ts exactly.
const checkout: Messages['checkout'] = {
  title: 'چیک آؤٹ', // REVIEW
  metaTitle: 'چیک آؤٹ · برف پانی', // REVIEW
  stepN: 'مرحلہ {n} از 5:', // REVIEW
  steps: {
    contact: 'رابطہ', // REVIEW
    delivery: 'ڈیلیوری', // REVIEW
    pickup: 'پک اپ', // REVIEW
    when: 'کب', // REVIEW
    payment: 'ادائیگی', // REVIEW
    review: 'جائزہ', // REVIEW
  },
  empty: {
    title: 'چیک آؤٹ کے لیے کچھ نہیں', // REVIEW
    body: 'آپ کی ٹوکری خالی ہے۔ پہلے مینو سے کچھ زبردست چنیں۔', // REVIEW
    cta: 'مینو دیکھیں', // REVIEW
  },
  closed: {
    title: 'ہم بند ہیں', // REVIEW
    opensAt: 'ہم بند ہیں۔ ⁦{time}⁩ پر کھلیں گے۔', // REVIEW
    noTime: 'ہم ابھی بند ہیں۔ جلد دوبارہ دیکھیں۔', // REVIEW
    paused: 'آرڈر عارضی طور پر بند ہیں: {reason}', // REVIEW
    body: 'ابھی پیشگی آرڈر بند ہیں، اس لیے یہ آرڈر ابھی نہیں لے سکتے۔ آپ کی ٹوکری محفوظ ہے۔', // REVIEW
    cta: 'واپس مینو پر', // REVIEW
  },
  offline: {
    title: 'آپ آف لائن ہیں', // REVIEW
    body: 'آپ کا آرڈر اس صفحے پر محفوظ ہے۔ دوبارہ جڑیں اور پھر کوشش کریں۔ یہ دو بار نہیں جائے گا۔', // REVIEW
  },
  contact: {
    name: 'آپ کا نام', // REVIEW
    namePlaceholder: 'علی رضا', // REVIEW
    nameError: 'بتائیں آرڈر کس کے لیے ہے۔', // REVIEW
    phoneError: 'پاکستانی موبائل نمبر درکار ہے، جیسے 03XX XXXXXXX۔', // REVIEW
    whatsapp: 'آرڈر کی اپڈیٹس واٹس ایپ پر بھیجیں', // REVIEW
    whatsappHint: 'اختیاری۔ صرف اس آرڈر کے بارے میں، کوئی اسپام نہیں۔', // REVIEW
  },
  otp: {
    title: 'فوری تصدیق', // REVIEW
    body: 'اس نمبر سے پہلا کیش آرڈر؟ 6 ہندسوں کے کوڈ سے تصدیق کریں۔', // REVIEW
    send: 'کوڈ بھیجیں', // REVIEW
    sentTo: 'کوڈ ⁦{phone}⁩ پر بھیج دیا گیا۔', // REVIEW
    verify: 'تصدیق کریں', // REVIEW
    resend: 'نیا کوڈ بھیجیں', // REVIEW
    resendIn: 'نیا کوڈ ⁦{seconds}⁩ سیکنڈ میں', // REVIEW
    locked: 'بہت زیادہ کوڈ۔ ⁦{time}⁩ بعد دوبارہ کوشش کریں۔', // REVIEW
    verified: 'تصدیق شدہ', // REVIEW
    mockHint: 'موک کوڈ: 123456', // REVIEW
    required: 'کیش آرڈر کے لیے اپنا نمبر تصدیق کریں۔', // REVIEW
  },
  delivery: {
    saved: 'یہاں پہنچائیں', // REVIEW
    newAddress: 'نیا پتہ', // REVIEW
    newAddressHint: 'پن لگائیں اور رائیڈر کو بتائیں کہاں آنا ہے', // REVIEW
    line1: 'مکان / گلی', // REVIEW
    line1Placeholder: 'مکان 12، گلی 4', // REVIEW
    line1Error: 'اپنا مکان اور گلی لکھیں۔', // REVIEW
    area: 'علاقہ', // REVIEW
    areaPlaceholder: 'پیراڈائز سٹی', // REVIEW
    areaError: 'آپ کس علاقے میں ہیں؟', // REVIEW
    landmark: 'نشانی', // REVIEW
    landmarkPlaceholder: 'پیٹرول پمپ کے سامنے', // REVIEW
    landmarkHint: 'ضرور لکھیں۔ "نیلے گیٹ کے پاس" سے رائیڈر کو فون نہیں کرنا پڑتا۔', // REVIEW
    pinError: 'پن لگائیں تاکہ رائیڈر آپ کو ڈھونڈ سکے۔', // REVIEW
    zone: '{zone} · ڈیلیوری {fee} · تقریباً {minutes} منٹ', // REVIEW
    checking: 'ڈیلیوری فیس دیکھ رہے ہیں…', // REVIEW
    outsideTitle: 'ہم ابھی وہاں نہیں پہنچتے', // REVIEW
    outsideBody: 'یہ جگہ ہمارے ڈیلیوری علاقے سے باہر ہے۔ پک اپ جلدی ہے اور فرائز اتنے ہی زبردست۔', // REVIEW
    switchToPickup: 'پک اپ پر جائیں', // REVIEW
    pickAgain: 'پتہ دوبارہ چنیں', // REVIEW
  },
  pickup: {
    title: 'یہاں سے لیں', // REVIEW
    ready: 'تقریباً {minutes} منٹ میں تیار', // REVIEW
    call: 'کال کریں ⁦{phone}⁩', // REVIEW
    directions: 'راستہ', // REVIEW
  },
  when: {
    label: 'آپ کو کب چاہیے؟', // REVIEW
    asap: 'جتنی جلدی ممکن ہو', // REVIEW
    asapHint: 'سیدھا کچن میں', // REVIEW
    schedule: 'وقت طے کریں', // REVIEW
    scheduleHint: 'دن اور وقت چنیں', // REVIEW
    forced: 'ہم ابھی بند ہیں، اس لیے یہ پیشگی آرڈر ہوگا۔', // REVIEW
    forcedPaused: 'آرڈر ابھی رکے ہوئے ہیں، اس لیے یہ پیشگی آرڈر ہوگا۔', // REVIEW
    day: 'دن', // REVIEW
    time: 'وقت', // REVIEW
    today: 'آج', // REVIEW
    tomorrow: 'کل', // REVIEW
    none: 'اگلے {days} دنوں میں کوئی وقت خالی نہیں۔ ہمیں کال کریں۔', // REVIEW
    pick: 'وقت چنیں۔', // REVIEW
    scheduleInstead: 'اس کے بجائے وقت طے کریں', // REVIEW
  },
  payment: {
    label: 'آپ کیسے ادائیگی کریں گے؟', // REVIEW
    cod: 'کیش آن ڈیلیوری', // REVIEW
    codPickup: 'کاؤنٹر پر کیش', // REVIEW
    codHint: 'ملنے پر ادائیگی کریں', // REVIEW
    jazzcash: 'جاز کیش', // REVIEW
    easypaisa: 'ایزی پیسہ', // REVIEW
    onlineHint: 'ابھی محفوظ والٹ صفحے پر آن لائن ادائیگی کریں', // REVIEW
    sooner: 'جلدی کا وقت چنیں', // REVIEW
    pick: 'ادائیگی کا طریقہ چنیں۔', // REVIEW
  },
  summary: {
    title: 'آپ کا آرڈر', // REVIEW
    edit: 'ٹوکری میں تبدیلی', // REVIEW
    quoting: 'آپ کا کل اپڈیٹ ہو رہا ہے…', // REVIEW
    subtotal: 'ذیلی کل', // REVIEW
    deliveryFee: 'ڈیلیوری', // REVIEW
    free: 'مفت', // REVIEW
    discount: 'رعایت · ⁦{code}⁩', // REVIEW
    tax: 'ٹیکس', // REVIEW
    tip: 'ٹپ', // REVIEW
    total: 'کل', // REVIEW
    etaDelivery: 'تقریباً {minutes} منٹ میں پہنچے گا', // REVIEW
    etaPickup: 'تقریباً {minutes} منٹ میں تیار', // REVIEW
    pinFirst: 'ڈیلیوری فیس اور کل دیکھنے کے لیے پن لگائیں۔', // REVIEW
    soldOut: 'ختم', // REVIEW
    soldOutHelp: 'یہ ابھی ختم ہو گیا۔ اسے ہٹائیں یا بدل دیں۔', // REVIEW
    remove: 'ہٹائیں', // REVIEW
    replace: 'بدل دیں', // REVIEW
    belowMinTitle: '{shortBy} مزید شامل کریں', // REVIEW
    belowMinBody: 'کم از کم آرڈر {minOrder} ہے۔ کچھ جلدی سے شامل کریں؟', // REVIEW
    quickAdd: '{name} شامل کریں', // REVIEW
  },
  promo: {
    label: 'پرومو کوڈ', // REVIEW
    placeholder: 'مثلاً FRIES10', // REVIEW
    apply: 'لگائیں', // REVIEW
    remove: 'کوڈ ہٹائیں', // REVIEW
    applied: '⁦{code}⁩ لگ گیا', // REVIEW
  },
  notes: {
    label: 'کچن کے لیے ہدایات', // REVIEW
    placeholder: 'زیادہ کرسپی، پیاز کے بغیر…', // REVIEW
    count: '{count}/300', // REVIEW
  },
  place: {
    cta: 'آرڈر کریں', // REVIEW
    placing: 'آپ کا آرڈر بھیج رہے ہیں…', // REVIEW
    placingBody: 'تھوڑا انتظار کریں، یہ صفحہ بند نہ کریں۔', // REVIEW
    waitQuote: 'آپ کا حتمی کل آ رہا ہے…', // REVIEW
    fixFirst: 'پہلے نشان زدہ حصہ ٹھیک کریں۔', // REVIEW
    fixFields: 'کچھ تفصیلات دوبارہ دیکھیں۔', // REVIEW
    retryIn: 'آپ دوبارہ کوشش کر سکیں گے', // REVIEW
  },
  conflict: {
    title: 'آپ کا آرڈر بدل گیا', // REVIEW
    body: 'بھیجتے وقت آپ کا آرڈر بدل گیا۔ جائزہ لے کر دوبارہ آرڈر کریں؟', // REVIEW
    confirm: 'جائزہ لیں اور دوبارہ آرڈر کریں', // REVIEW
  },
  duplicate: {
    title: 'دوبارہ آرڈر کریں؟', // REVIEW
    body: 'آپ نے 2 منٹ پہلے یہی آرڈر دیا تھا۔ دوبارہ آرڈر کریں؟', // REVIEW
    again: 'دوبارہ آرڈر کریں', // REVIEW
    view: 'وہ آرڈر دیکھیں', // REVIEW
  },
  turnstile: {
    mock: 'بوٹ چیک · موک', // REVIEW
    label: 'بوٹ چیک', // REVIEW
  },
};

export default checkout;
