import type { Messages } from '../en';

// TODO translate: machine-drafted. Keys must match en/receipt.ts exactly.
const receipt: Messages['receipt'] = {
  metaTitle: 'آپ کا آرڈر', // TODO translate
  celebrate: {
    title: 'آرڈر ہو گیا!', // TODO translate
    sticker: 'آرڈر #{number} · Rs {total}', // TODO translate
    track: 'میرا آرڈر ٹریک کریں', // TODO translate
    dismiss: 'میری رسید دیکھیں', // TODO translate
  },
  title: 'رسید', // TODO translate
  orderNumber: 'آرڈر #{number}', // TODO translate
  placedAt: '{time} کو آرڈر کیا', // TODO translate
  items: 'آپ نے کیا منگوایا', // TODO translate
  qty: '{qty}×', // TODO translate
  lineNote: 'نوٹ: {note}', // TODO translate
  subtotal: 'سب ٹوٹل', // TODO translate
  deliveryFee: 'ڈیلیوری', // TODO translate
  free: 'مفت', // TODO translate
  discount: 'رعایت', // TODO translate
  tax: 'ٹیکس', // TODO translate
  tip: 'ٹپ', // TODO translate
  total: 'کل', // TODO translate
  payment: 'ادائیگی', // TODO translate
  method: {
    cod: 'کیش آن ڈیلیوری', // TODO translate
    jazzcash: 'JazzCash', // TODO translate
    easypaisa: 'Easypaisa', // TODO translate
  },
  payStatus: {
    codDue: 'پہنچنے پر ادائیگی', // TODO translate
    unpaid: 'ابھی ادا نہیں ہوا', // TODO translate
    pending: 'تصدیق ہو رہی ہے', // TODO translate
    paid: 'ادا ہو گیا', // TODO translate
    failed: 'ناکام', // TODO translate
    refunded: 'رقم واپس', // TODO translate
    partially_refunded: 'جزوی رقم واپس', // TODO translate
  },
  deliveryTo: 'یہاں ڈیلیوری', // TODO translate
  landmark: '{landmark} کے قریب', // TODO translate
  pickupFrom: 'یہاں سے وصول کریں', // TODO translate
  directions: 'راستہ', // TODO translate
  scheduled: 'طے شدہ وقت', // TODO translate
  yourNote: 'آپ کا نوٹ', // TODO translate
  track: 'آرڈر ٹریک کریں', // TODO translate
  reorder: 'دوبارہ آرڈر', // TODO translate
  share: 'واٹس ایپ پر شیئر کریں', // TODO translate
  shareText: 'میرا برف پانی آرڈر لائیو ٹریک کریں: {url}', // TODO translate
  reorderSkipped:
    '{count, plural, one {# آئٹم} other {# آئٹمز}} ابھی دستیاب نہیں، اس لیے شامل نہیں کیے گئے۔', // TODO translate
  reorderNone: 'اس آرڈر میں سے ابھی کچھ دستیاب نہیں۔ مینو دیکھیں؟', // TODO translate
  pendingTitle: 'ادائیگی کا انتظار', // TODO translate
  pendingBody: 'ادائیگی کی تصدیق ہوتے ہی آرڈر بننا شروع ہو جائے گا۔', // TODO translate
  pendingCta: 'ادائیگی چیک کریں', // TODO translate
  terminal: {
    cancelled: 'یہ آرڈر منسوخ ہو گیا۔', // TODO translate
    rejected: 'کچن یہ آرڈر نہیں لے سکا۔ معذرت۔', // TODO translate
    payment_failed: 'ادائیگی نہیں ہو سکی، اس لیے یہ آرڈر کچن تک نہیں پہنچا۔', // TODO translate
    expired: 'جواب آنے سے پہلے ادائیگی کا وقت ختم ہو گیا، اس لیے یہ آرڈر بند ہو گیا۔', // TODO translate
  },
  notFoundTitle: 'ہمیں یہ آرڈر نہیں ملا', // TODO translate
  notFoundBody: 'شاید لنک ادھورا ہے۔ اپنے فون نمبر سے تلاش کریں۔', // TODO translate
  findOrder: 'میرا آرڈر تلاش کریں', // TODO translate
};

export default receipt;
