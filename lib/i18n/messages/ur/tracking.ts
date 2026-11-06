import type { Messages } from '../en';

// TODO translate: machine-drafted. Keys must match en/tracking.ts exactly.
const tracking: Messages['tracking'] = {
  meta: {
    title: 'اپنا آرڈر ٹریک کریں · برف پانی', // TODO translate
    findTitle: 'میرا آرڈر تلاش کریں · برف پانی', // TODO translate
  },
  orderNumber: 'آرڈر #{number}', // TODO translate
  receiptLink: 'رسید دیکھیں', // TODO translate
  reconnecting: 'دوبارہ جڑ رہے ہیں… ہم چیک کرتے رہیں گے', // TODO translate
  eta: {
    label: 'متوقع وقت', // TODO translate
    at: 'تقریباً {time}', // TODO translate
    anyMinute: 'بس پہنچنے ہی والا ہے', // TODO translate
  },
  strip: {
    label: 'آرڈر کی پیش رفت', // TODO translate
    step: 'مرحلہ {n} از 4', // TODO translate
    done: 'مکمل', // TODO translate
    current: 'ابھی جاری ہے', // TODO translate
    upcoming: 'آگے آ رہا ہے', // TODO translate
  },
  panels: {
    received: 'آرڈر موصول', // TODO translate
    cooking: 'جوش سے پک رہا ہے', // TODO translate
    onTheWay: 'راستے میں', // TODO translate
    counter: 'کاؤنٹر پر تیار', // TODO translate
    delivered: 'پہنچ گیا۔ مزے لیں!', // TODO translate
    pickedUp: 'آپ کا ہو گیا۔ مزے لیں!', // TODO translate
  },
  bubble: {
    waiting: 'کچن کا انتظار ہے…', // TODO translate
    accepted: 'قبول! وقت طے ہو گیا', // TODO translate
    acceptedStamp: 'قبول!', // TODO translate
    receivedDone: 'مل گیا۔ بورڈ پر لگ گیا۔', // TODO translate
    cooking: 'آگ جل گئی۔ آپ کا آرڈر تیار ہو رہا ہے۔', // TODO translate
    packed: 'پیک اور تیار', // TODO translate
    cookingDone: 'گرم، تازہ، پیک۔', // TODO translate
    cookingNext: 'اب گرل جلے گی', // TODO translate
    riding: '{name} آپ کی طرف آ رہے ہیں', // TODO translate
    ridingNoName: 'رائیڈر راستے میں ہے', // TODO translate
    rideDone: 'پہنچ گئے!', // TODO translate
    rideNext: 'رائیڈر لے کر آئے گا', // TODO translate
    counter: 'کاؤنٹر سے لے لیں', // TODO translate
    counterNext: 'کاؤنٹر پر آپ کا انتظار ہوگا', // TODO translate
    delivered: 'ہر نوالے کا مزہ لیں۔', // TODO translate
    finishNext: 'سب سے اچھا حصہ', // TODO translate
  },
  rider: {
    title: 'آپ کا رائیڈر', // TODO translate
    body: '{name} کے پاس آپ کا آرڈر ہے', // TODO translate
    call: 'کال کریں', // TODO translate
    whatsapp: 'واٹس ایپ', // TODO translate
  },
  scheduled: {
    stamp: 'پری آرڈر', // TODO translate
    title: '{time} کے لیے شیڈول', // TODO translate
    body: 'ہم {release} پر پکانا شروع کریں گے۔ یہیں ٹریک کریں۔', // TODO translate
  },
  pendingPayment: {
    title: 'آپ کی ادائیگی کا انتظار ہے', // TODO translate
    body: 'ادائیگی کی تصدیق ہوتے ہی کچن شروع ہو جائے گا۔', // TODO translate
    cta: 'ادائیگی کی صورتحال دیکھیں', // TODO translate
  },
  paymentFailed: {
    title: 'ادائیگی نہیں ہو سکی', // TODO translate
    body: 'کوئی آرڈر نہیں لگا۔ آپ کی کارٹ محفوظ ہے۔ دوبارہ کوشش کریں یا کیش آن ڈیلیوری کریں۔', // TODO translate
  },
  expired: {
    title: 'ادائیگی کا وقت ختم', // TODO translate
    body: 'ادائیگی کی تصدیق سے پہلے 15 منٹ ختم ہو گئے۔ اگر آپ نے ادائیگی کی ہے تو آرڈر چلے گا یا رقم واپس ہوگی۔', // TODO translate
  },
  retryPayment: 'چیک آؤٹ پر واپس', // TODO translate
  payCash: 'کیش میں ادا کریں', // TODO translate
  rejected: {
    title: 'کچن یہ آرڈر نہیں لے سکا', // TODO translate
    body: 'کچھ ادا نہیں کرنا۔ معذرت۔ ہمیں کال کریں، ہم سنبھال لیں گے۔', // TODO translate
    reason: 'کچن کا نوٹ', // TODO translate
  },
  autoRejected: {
    stamp: 'وقت ختم', // TODO translate
    title: 'وقت پر کسی نے نہیں اٹھایا۔ یہ ہماری غلطی ہے', // TODO translate
    body: 'کچن نے 8 منٹ میں آرڈر قبول نہیں کیا، اس لیے ہم نے اسے منسوخ کر دیا۔ کچھ ادا نہیں کرنا۔', // TODO translate
  },
  cancelled: {
    title: 'آرڈر منسوخ', // TODO translate
    body: 'یہ آرڈر منسوخ ہو گیا ہے۔ کچھ ادا نہیں کرنا۔', // TODO translate
    reason: 'وجہ', // TODO translate
    refund: 'آن لائن ادائیگی کی تھی؟ ہم رقم واپس کریں گے۔ نہ ملے تو ہمیں کال کریں۔', // TODO translate
  },
  callShop: '{phone} پر کال کریں', // TODO translate
  orderElse: 'کچھ اور آرڈر کریں', // TODO translate
  cancel: {
    open: 'آرڈر منسوخ کریں', // TODO translate
    title: 'یہ آرڈر منسوخ کریں؟', // TODO translate
    body: 'کچن کے قبول کرنے تک آپ منسوخ کر سکتے ہیں۔', // TODO translate
    reason: 'وجہ', // TODO translate
    reasonHint: 'اس سے ہمیں بہتر ہونے میں مدد ملتی ہے۔', // TODO translate
    confirm: 'ہاں، منسوخ کریں', // TODO translate
    keep: 'میرا آرڈر رکھیں', // TODO translate
    done: 'آرڈر منسوخ ہو گیا', // TODO translate
  },
  review: {
    title: 'کیسا لگا؟', // TODO translate
    legend: 'اپنے آرڈر کی ریٹنگ دیں', // TODO translate
    bolts: '5 میں سے {n} بولٹ', // TODO translate
    meh: 'بس ٹھیک', // TODO translate
    solid: 'زبردست', // TODO translate
    furious: 'کمال!', // TODO translate
    comment: 'کچھ اور کہنا ہے؟', // TODO translate
    submit: 'ریویو بھیجیں', // TODO translate
    pick: 'پہلے ریٹنگ چنیں۔', // TODO translate
    thanksTitle: 'ریویو کا شکریہ!', // TODO translate
    thanksBody: 'ہر ریویو سیدھا کچن تک جاتا ہے۔', // TODO translate
    google: 'پسند آیا؟ گوگل پر ریویو دیں', // TODO translate
  },
  orderAgain: 'دوبارہ آرڈر کریں', // TODO translate
  reorder: {
    added: '{count} آئٹمز دوبارہ کارٹ میں', // TODO translate
    skipped: '{added} آئٹمز شامل۔ {skipped} آج دستیاب نہیں۔', // TODO translate
    none: 'یہ آئٹمز ابھی دستیاب نہیں۔', // TODO translate
  },
  notFound: {
    title: 'یہ آرڈر نہیں ملا', // TODO translate
    body: 'لنک شاید کٹ گیا ہے۔ اپنے فون نمبر سے تلاش کریں۔', // TODO translate
    cta: 'میرا آرڈر تلاش کریں', // TODO translate
  },
  find: {
    title: 'میرا آرڈر تلاش کریں', // TODO translate
    sub: 'ویب سائٹ، واٹس ایپ یا فون پر آرڈر کیا؟ یہاں تلاش کریں۔', // TODO translate
    device: 'اس ڈیوائس پر', // TODO translate
    deviceEmpty: 'اس ڈیوائس پر ابھی کوئی آرڈر نہیں۔', // TODO translate
    deviceFailed: 'کچھ آرڈر لوڈ نہیں ہوئے۔', // TODO translate
    phoneTitle: 'فون سے تلاش کریں', // TODO translate
    phoneBody: 'نمبر کی تصدیق کے لیے ہم آپ کو کوڈ بھیجیں گے۔', // TODO translate
    send: 'کوڈ بھیجیں', // TODO translate
    sentTo: 'ہم نے {phone} پر 6 ہندسوں کا کوڈ بھیجا ہے', // TODO translate
    verify: 'تصدیق کریں', // TODO translate
    resend: 'کوڈ دوبارہ بھیجیں', // TODO translate
    resendIn: '{seconds} سیکنڈ میں دوبارہ بھیجیں', // TODO translate
    change: 'نمبر بدلیں', // TODO translate
    locked: 'بہت زیادہ کوششیں۔ {time} بعد کوشش کریں۔', // TODO translate
    mine: 'آپ کے آرڈر', // TODO translate
    mineEmpty: 'اس نمبر پر ابھی کوئی آرڈر نہیں۔', // TODO translate
    browse: 'مینو دیکھیں', // TODO translate
    items: '{count} آئٹمز', // TODO translate
    open: 'آرڈر {number} ٹریک کریں', // TODO translate
  },
};

export default tracking;
