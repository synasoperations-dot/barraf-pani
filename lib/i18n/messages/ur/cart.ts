import type { Messages } from '../en';

// TODO translate: machine-drafted. Keys must match en/cart.ts exactly.
const cartFlow: Messages['cartFlow'] = {
  metaTitle: 'آپ کی ٹوکری · برف پانی', // TODO translate
  title: 'آپ کا آرڈر', // TODO translate
  lines: 'ٹوکری میں موجود آئٹمز', // TODO translate
  modifiers: '+ {list}', // TODO translate
  note: 'نوٹ: {note}', // TODO translate
  removeShort: 'ہٹائیں', // TODO translate
  replace: 'بدلیں', // TODO translate
  replaceLabel: '{name} جیسا کچھ تلاش کریں', // TODO translate
  swipeHint: 'ہٹانے کے لیے لائن کو سائیڈ پر سوائپ کریں۔', // TODO translate
  removed: '{name} ہٹا دیا گیا', // TODO translate
  soldOutStamp: 'آج ختم', // TODO translate
  soldOutBody: 'یہ ابھی ختم ہو گیا۔ اسے ہٹائیں یا ملتا جلتا کچھ لیں۔', // TODO translate
  soldOutBlock: 'چیک آؤٹ کے لیے ختم شدہ آئٹمز ہٹائیں۔', // TODO translate
  friesTitle: 'اسے زبردست بنائیں؟', // TODO translate
  friesBody: 'فرائز کے بغیر برگر بس ایک سینڈوچ ہے۔', // TODO translate
  friesAdd: '+ {name}', // TODO translate
  friesAddLabel: '{name} شامل کریں، {price}', // TODO translate
  dipsTitle: 'ڈِپ چاہیے؟', // TODO translate
  dipsBody: 'ہر لقمہ ڈِپ کا حقدار ہے۔', // TODO translate
  dipAddLabel: '{name} شامل کریں، {price}', // TODO translate
  promoLabel: 'پرومو کوڈ', // TODO translate
  promoPlaceholder: 'کوڈ درج کریں', // TODO translate
  promoApply: 'لگائیں', // TODO translate
  promoRemove: 'کوڈ {code} ہٹائیں', // TODO translate
  promoHint: 'ایک آرڈر پر ایک کوڈ۔ نیا کوڈ پرانے کی جگہ لے لیتا ہے۔', // TODO translate
  promoReplaced: '{code} نے {old} کی جگہ لے لی۔ ایک آرڈر پر ایک کوڈ۔', // TODO translate
  promoChecking: '{code} چیک ہو رہا ہے…', // TODO translate
  promoApplied: '{code} لگ گیا · −{price} (اندازہ)', // TODO translate
  promoAppliedLater: '{code} لگ گیا۔ بچت چیک آؤٹ پر نظر آئے گی۔', // TODO translate
  promoLater: 'ہم {code} چیک آؤٹ پر چیک کریں گے۔', // TODO translate
  estimate: 'اندازہ', // TODO translate
  estimateNote: 'ڈیلیوری فیس اور حتمی رقم چیک آؤٹ پر طے ہوگی۔', // TODO translate
  checkout: 'چیک آؤٹ', // TODO translate
  preorder: 'پری آرڈر', // TODO translate
  closedOpensAt: 'ہم بند ہیں۔ {time} پر کھلیں گے', // TODO translate
  emptyTitle: 'یہ بالٹی خالی ہے', // TODO translate
  emptyBody: 'ایک بھی فرائی نہیں بچی۔ مینو سے کچھ زبردست لیں۔', // TODO translate
  browse: 'مینو دیکھیں', // TODO translate
};

export default cartFlow;
