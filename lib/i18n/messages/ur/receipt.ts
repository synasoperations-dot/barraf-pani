import type { Messages } from '../en';

// REVIEW: machine-drafted. Keys must match en/receipt.ts exactly.
const receipt: Messages['receipt'] = {
  metaTitle: 'آپ کا آرڈر', // REVIEW
  celebrate: {
    title: 'آرڈر ہو گیا!', // REVIEW
    sticker: 'آرڈر #⁦{number}⁩ · ⁦Rs {total}⁩', // REVIEW
    track: 'میرا آرڈر ٹریک کریں', // REVIEW
    dismiss: 'میری رسید دیکھیں', // REVIEW
  },
  title: 'رسید', // REVIEW
  orderNumber: 'آرڈر #⁦{number}⁩', // REVIEW
  placedAt: '⁦{time}⁩ کو آرڈر کیا', // REVIEW
  items: 'آپ نے کیا منگوایا', // REVIEW
  qty: '{qty}×', // REVIEW
  lineNote: 'نوٹ: {note}', // REVIEW
  subtotal: 'سب ٹوٹل', // REVIEW
  deliveryFee: 'ڈیلیوری', // REVIEW
  free: 'مفت', // REVIEW
  discount: 'رعایت', // REVIEW
  tax: 'ٹیکس', // REVIEW
  tip: 'ٹپ', // REVIEW
  total: 'کل', // REVIEW
  payment: 'ادائیگی', // REVIEW
  method: {
    cod: 'کیش آن ڈیلیوری', // REVIEW
    jazzcash: 'JazzCash', // REVIEW
    easypaisa: 'Easypaisa', // REVIEW
  },
  payStatus: {
    codDue: 'پہنچنے پر ادائیگی', // REVIEW
    unpaid: 'ابھی ادا نہیں ہوا', // REVIEW
    pending: 'تصدیق ہو رہی ہے', // REVIEW
    paid: 'ادا ہو گیا', // REVIEW
    failed: 'ناکام', // REVIEW
    refunded: 'رقم واپس', // REVIEW
    partially_refunded: 'جزوی رقم واپس', // REVIEW
  },
  deliveryTo: 'یہاں ڈیلیوری', // REVIEW
  landmark: '{landmark} کے قریب', // REVIEW
  pickupFrom: 'یہاں سے وصول کریں', // REVIEW
  directions: 'راستہ', // REVIEW
  scheduled: 'طے شدہ وقت', // REVIEW
  yourNote: 'آپ کا نوٹ', // REVIEW
  track: 'آرڈر ٹریک کریں', // REVIEW
  reorder: 'دوبارہ آرڈر', // REVIEW
  share: 'واٹس ایپ پر شیئر کریں', // REVIEW
  shareText: 'میرا برف پانی آرڈر لائیو ٹریک کریں: {url}', // REVIEW
  reorderSkipped:
    '{count, plural, one {# آئٹم} other {# آئٹمز}} ابھی دستیاب نہیں، اس لیے شامل نہیں کیے گئے۔', // REVIEW
  reorderNone: 'اس آرڈر میں سے ابھی کچھ دستیاب نہیں۔ مینو دیکھیں؟', // REVIEW
  pendingTitle: 'ادائیگی کا انتظار', // REVIEW
  pendingBody: 'ادائیگی کی تصدیق ہوتے ہی آرڈر بننا شروع ہو جائے گا۔', // REVIEW
  pendingCta: 'ادائیگی چیک کریں', // REVIEW
  terminal: {
    cancelled: 'یہ آرڈر منسوخ ہو گیا۔', // REVIEW
    rejected: 'کچن یہ آرڈر نہیں لے سکا۔ معذرت۔', // REVIEW
    payment_failed: 'ادائیگی نہیں ہو سکی، اس لیے یہ آرڈر کچن تک نہیں پہنچا۔', // REVIEW
    expired: 'جواب آنے سے پہلے ادائیگی کا وقت ختم ہو گیا، اس لیے یہ آرڈر بند ہو گیا۔', // REVIEW
  },
  notFoundTitle: 'ہمیں یہ آرڈر نہیں ملا', // REVIEW
  notFoundBody: 'شاید لنک ادھورا ہے۔ اپنے فون نمبر سے تلاش کریں۔', // REVIEW
  findOrder: 'میرا آرڈر تلاش کریں', // REVIEW
};

export default receipt;
