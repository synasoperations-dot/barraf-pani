import type { Messages } from '../en';

// REVIEW: machine-drafted. Keys must match en/cart.ts exactly.
const cartFlow: Messages['cartFlow'] = {
  metaTitle: 'آپ کی ٹوکری · برف پانی', // REVIEW
  title: 'آپ کا آرڈر', // REVIEW
  lines: 'ٹوکری میں موجود آئٹمز', // REVIEW
  modifiers: '+ {list}', // REVIEW
  note: 'نوٹ: {note}', // REVIEW
  removeShort: 'ہٹائیں', // REVIEW
  replace: 'بدلیں', // REVIEW
  replaceLabel: '{name} جیسا کچھ تلاش کریں', // REVIEW
  swipeHint: 'ہٹانے کے لیے لائن کو سائیڈ پر سوائپ کریں۔', // REVIEW
  removed: '{name} ہٹا دیا گیا', // REVIEW
  soldOutStamp: 'آج ختم', // REVIEW
  soldOutBody: 'یہ ابھی ختم ہو گیا۔ اسے ہٹائیں یا ملتا جلتا کچھ لیں۔', // REVIEW
  soldOutBlock: 'چیک آؤٹ کے لیے ختم شدہ آئٹمز ہٹائیں۔', // REVIEW
  friesTitle: 'اسے زبردست بنائیں؟', // REVIEW
  friesBody: 'فرائز کے بغیر برگر بس ایک سینڈوچ ہے۔', // REVIEW
  friesAdd: '+ {name}', // REVIEW
  friesAddLabel: '{name} شامل کریں، {price}', // REVIEW
  dipsTitle: 'ڈِپ چاہیے؟', // REVIEW
  dipsBody: 'ہر لقمہ ڈِپ کا حقدار ہے۔', // REVIEW
  dipAddLabel: '{name} شامل کریں، {price}', // REVIEW
  promoLabel: 'پرومو کوڈ', // REVIEW
  promoPlaceholder: 'کوڈ درج کریں', // REVIEW
  promoApply: 'لگائیں', // REVIEW
  promoRemove: 'کوڈ ⁦{code}⁩ ہٹائیں', // REVIEW
  promoHint: 'ایک آرڈر پر ایک کوڈ۔ نیا کوڈ پرانے کی جگہ لے لیتا ہے۔', // REVIEW
  promoReplaced: '⁦{code}⁩ نے {old} کی جگہ لے لی۔ ایک آرڈر پر ایک کوڈ۔', // REVIEW
  promoChecking: '⁦{code}⁩ چیک ہو رہا ہے…', // REVIEW
  promoApplied: '⁦{code}⁩ لگ گیا · −{price} (اندازہ)', // REVIEW
  promoAppliedLater: '⁦{code}⁩ لگ گیا۔ بچت چیک آؤٹ پر نظر آئے گی۔', // REVIEW
  promoLater: 'ہم ⁦{code}⁩ چیک آؤٹ پر چیک کریں گے۔', // REVIEW
  estimate: 'اندازہ', // REVIEW
  estimateNote: 'ڈیلیوری فیس اور حتمی رقم چیک آؤٹ پر طے ہوگی۔', // REVIEW
  checkout: 'چیک آؤٹ', // REVIEW
  preorder: 'پری آرڈر', // REVIEW
  closedOpensAt: 'ہم بند ہیں۔ ⁦{time}⁩ پر کھلیں گے', // REVIEW
  emptyTitle: 'یہ بالٹی خالی ہے', // REVIEW
  emptyBody: 'ایک بھی فرائی نہیں بچی۔ مینو سے کچھ زبردست لیں۔', // REVIEW
  browse: 'مینو دیکھیں', // REVIEW
};

export default cartFlow;
