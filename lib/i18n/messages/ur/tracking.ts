import type { Messages } from '../en';

// REVIEW: machine-drafted. Keys must match en/tracking.ts exactly.
const tracking: Messages['tracking'] = {
  meta: {
    title: 'اپنا آرڈر ٹریک کریں · برف پانی', // REVIEW
    findTitle: 'میرا آرڈر تلاش کریں · برف پانی', // REVIEW
  },
  orderNumber: 'آرڈر #⁦{number}⁩', // REVIEW
  receiptLink: 'رسید دیکھیں', // REVIEW
  reconnecting: 'دوبارہ جڑ رہے ہیں… ہم چیک کرتے رہیں گے', // REVIEW
  eta: {
    label: 'متوقع وقت', // REVIEW
    at: 'تقریباً ⁦{time}⁩', // REVIEW
    anyMinute: 'بس پہنچنے ہی والا ہے', // REVIEW
  },
  strip: {
    label: 'آرڈر کی پیش رفت', // REVIEW
    step: 'مرحلہ {n} از 4', // REVIEW
    done: 'مکمل', // REVIEW
    current: 'ابھی جاری ہے', // REVIEW
    upcoming: 'آگے آ رہا ہے', // REVIEW
  },
  panels: {
    received: 'آرڈر موصول', // REVIEW
    cooking: 'جوش سے پک رہا ہے', // REVIEW
    onTheWay: 'راستے میں', // REVIEW
    counter: 'کاؤنٹر پر تیار', // REVIEW
    delivered: 'پہنچ گیا۔ مزے لیں!', // REVIEW
    pickedUp: 'آپ کا ہو گیا۔ مزے لیں!', // REVIEW
  },
  bubble: {
    waiting: 'کچن کا انتظار ہے…', // REVIEW
    accepted: 'قبول! وقت طے ہو گیا', // REVIEW
    acceptedStamp: 'قبول!', // REVIEW
    receivedDone: 'مل گیا۔ بورڈ پر لگ گیا۔', // REVIEW
    cooking: 'آگ جل گئی۔ آپ کا آرڈر تیار ہو رہا ہے۔', // REVIEW
    packed: 'پیک اور تیار', // REVIEW
    cookingDone: 'گرم، تازہ، پیک۔', // REVIEW
    cookingNext: 'اب گرل جلے گی', // REVIEW
    riding: '{name} آپ کی طرف آ رہے ہیں', // REVIEW
    ridingNoName: 'رائیڈر راستے میں ہے', // REVIEW
    rideDone: 'پہنچ گئے!', // REVIEW
    rideNext: 'رائیڈر لے کر آئے گا', // REVIEW
    counter: 'کاؤنٹر سے لے لیں', // REVIEW
    counterNext: 'کاؤنٹر پر آپ کا انتظار ہوگا', // REVIEW
    delivered: 'ہر نوالے کا مزہ لیں۔', // REVIEW
    finishNext: 'سب سے اچھا حصہ', // REVIEW
  },
  rider: {
    title: 'آپ کا رائیڈر', // REVIEW
    body: '{name} کے پاس آپ کا آرڈر ہے', // REVIEW
    call: 'کال کریں', // REVIEW
    whatsapp: 'واٹس ایپ', // REVIEW
  },
  scheduled: {
    stamp: 'پری آرڈر', // REVIEW
    title: '⁦{time}⁩ کے لیے شیڈول', // REVIEW
    body: 'ہم {release} پر پکانا شروع کریں گے۔ یہیں ٹریک کریں۔', // REVIEW
  },
  pendingPayment: {
    title: 'آپ کی ادائیگی کا انتظار ہے', // REVIEW
    body: 'ادائیگی کی تصدیق ہوتے ہی کچن شروع ہو جائے گا۔', // REVIEW
    cta: 'ادائیگی کی صورتحال دیکھیں', // REVIEW
  },
  paymentFailed: {
    title: 'ادائیگی نہیں ہو سکی', // REVIEW
    body: 'کوئی آرڈر نہیں لگا۔ آپ کی کارٹ محفوظ ہے۔ دوبارہ کوشش کریں یا کیش آن ڈیلیوری کریں۔', // REVIEW
  },
  expired: {
    title: 'ادائیگی کا وقت ختم', // REVIEW
    body: 'ادائیگی کی تصدیق سے پہلے 15 منٹ ختم ہو گئے۔ اگر آپ نے ادائیگی کی ہے تو آرڈر چلے گا یا رقم واپس ہوگی۔', // REVIEW
  },
  retryPayment: 'چیک آؤٹ پر واپس', // REVIEW
  payCash: 'کیش میں ادا کریں', // REVIEW
  rejected: {
    title: 'کچن یہ آرڈر نہیں لے سکا', // REVIEW
    body: 'کچھ ادا نہیں کرنا۔ معذرت۔ ہمیں کال کریں، ہم سنبھال لیں گے۔', // REVIEW
    reason: 'کچن کا نوٹ', // REVIEW
  },
  autoRejected: {
    stamp: 'وقت ختم', // REVIEW
    title: 'وقت پر کسی نے نہیں اٹھایا۔ یہ ہماری غلطی ہے', // REVIEW
    body: 'کچن نے 8 منٹ میں آرڈر قبول نہیں کیا، اس لیے ہم نے اسے منسوخ کر دیا۔ کچھ ادا نہیں کرنا۔', // REVIEW
  },
  cancelled: {
    title: 'آرڈر منسوخ', // REVIEW
    body: 'یہ آرڈر منسوخ ہو گیا ہے۔ کچھ ادا نہیں کرنا۔', // REVIEW
    reason: 'وجہ', // REVIEW
    refund: 'آن لائن ادائیگی کی تھی؟ ہم رقم واپس کریں گے۔ نہ ملے تو ہمیں کال کریں۔', // REVIEW
  },
  callShop: '⁦{phone}⁩ پر کال کریں', // REVIEW
  orderElse: 'کچھ اور آرڈر کریں', // REVIEW
  cancel: {
    open: 'آرڈر منسوخ کریں', // REVIEW
    title: 'یہ آرڈر منسوخ کریں؟', // REVIEW
    body: 'کچن کے قبول کرنے تک آپ منسوخ کر سکتے ہیں۔', // REVIEW
    reason: 'وجہ', // REVIEW
    reasonHint: 'اس سے ہمیں بہتر ہونے میں مدد ملتی ہے۔', // REVIEW
    confirm: 'ہاں، منسوخ کریں', // REVIEW
    keep: 'میرا آرڈر رکھیں', // REVIEW
    done: 'آرڈر منسوخ ہو گیا', // REVIEW
  },
  review: {
    title: 'کیسا لگا؟', // REVIEW
    legend: 'اپنے آرڈر کی ریٹنگ دیں', // REVIEW
    bolts: '5 میں سے {n} بولٹ', // REVIEW
    meh: 'بس ٹھیک', // REVIEW
    solid: 'زبردست', // REVIEW
    furious: 'کمال!', // REVIEW
    comment: 'کچھ اور کہنا ہے؟', // REVIEW
    submit: 'ریویو بھیجیں', // REVIEW
    pick: 'پہلے ریٹنگ چنیں۔', // REVIEW
    thanksTitle: 'ریویو کا شکریہ!', // REVIEW
    thanksBody: 'ہر ریویو سیدھا کچن تک جاتا ہے۔', // REVIEW
    google: 'پسند آیا؟ گوگل پر ریویو دیں', // REVIEW
  },
  orderAgain: 'دوبارہ آرڈر کریں', // REVIEW
  reorder: {
    added: '{count} آئٹمز دوبارہ کارٹ میں', // REVIEW
    skipped: '{added} آئٹمز شامل۔ {skipped} آج دستیاب نہیں۔', // REVIEW
    none: 'یہ آئٹمز ابھی دستیاب نہیں۔', // REVIEW
  },
  notFound: {
    title: 'یہ آرڈر نہیں ملا', // REVIEW
    body: 'لنک شاید کٹ گیا ہے۔ اپنے فون نمبر سے تلاش کریں۔', // REVIEW
    cta: 'میرا آرڈر تلاش کریں', // REVIEW
  },
  find: {
    title: 'میرا آرڈر تلاش کریں', // REVIEW
    sub: 'ویب سائٹ، واٹس ایپ یا فون پر آرڈر کیا؟ یہاں تلاش کریں۔', // REVIEW
    device: 'اس ڈیوائس پر', // REVIEW
    deviceEmpty: 'اس ڈیوائس پر ابھی کوئی آرڈر نہیں۔', // REVIEW
    deviceFailed: 'کچھ آرڈر لوڈ نہیں ہوئے۔', // REVIEW
    more: 'مزید دکھائیں', // REVIEW
    phoneTitle: 'فون سے تلاش کریں', // REVIEW
    phoneBody: 'نمبر کی تصدیق کے لیے ہم آپ کو کوڈ بھیجیں گے۔', // REVIEW
    send: 'کوڈ بھیجیں', // REVIEW
    sentTo: 'ہم نے ⁦{phone}⁩ پر 6 ہندسوں کا کوڈ بھیجا ہے', // REVIEW
    verify: 'تصدیق کریں', // REVIEW
    resend: 'کوڈ دوبارہ بھیجیں', // REVIEW
    resendIn: '⁦{seconds}⁩ سیکنڈ میں دوبارہ بھیجیں', // REVIEW
    change: 'نمبر بدلیں', // REVIEW
    locked: 'بہت زیادہ کوششیں۔ ⁦{time}⁩ بعد کوشش کریں۔', // REVIEW
    mine: 'آپ کے آرڈر', // REVIEW
    mineEmpty: 'اس نمبر پر ابھی کوئی آرڈر نہیں۔', // REVIEW
    browse: 'مینو دیکھیں', // REVIEW
    items: '{count} آئٹمز', // REVIEW
    open: 'آرڈر ⁦{number}⁩ ٹریک کریں', // REVIEW
  },
};

export default tracking;
