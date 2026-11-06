import type { Messages } from '../en';

// Machine-drafted Urdu. Strings marked // REVIEW need a native speaker. Keys must match en/about.ts.
const about: Messages['about'] = {
  metaTitle: 'ہماری جگہ', // REVIEW
  metaDescription:
    'برف پانی کی کہانی، پیراڈائز سٹی جھنگ کی جگہ، اور ہماری پہچان: فلے فیوری، لوڈڈ فرائز اور پیزا۔', // REVIEW
  title: 'ہماری جگہ', // REVIEW
  sub: 'زوردار کھانا۔ اچھے لوگ۔ پیراڈائز سٹی۔', // REVIEW
  breadcrumb: 'ہمارے بارے میں', // REVIEW
  story: {
    title: '"برف پانی" کیوں؟', // REVIEW
    quote: '[کلائنٹ فراہم کرے: برف پانی نام کے پیچھے کی کہانی]', // REVIEW
    by: 'برف پانی ٹیم', // REVIEW
  },
  gallery: {
    title: 'ماحول', // REVIEW
    hint: 'بڑا دیکھنے کے لیے تصویر پر ٹیپ کریں۔', // REVIEW
    soon: 'تصویر جلد', // REVIEW
    open: 'تصویر کھولیں: {name}', // REVIEW
    openPrefix: 'تصویر کھولیں:',
    dialog: 'تصویر {n} از {total}: {name}', // REVIEW
    prev: 'پچھلی تصویر', // REVIEW
    next: 'اگلی تصویر', // REVIEW
    close: 'بند کریں', // REVIEW
    swipe: 'سوائپ کریں یا تیر والی کلیدیں استعمال کریں', // REVIEW
    tiles: {
      counter: 'کاؤنٹر', // REVIEW
      fryer: 'فرائر سے سیدھا', // REVIEW
      seats: 'بیٹھ جائیں', // REVIEW
      night: 'رات دیر تک', // REVIEW
      crew: 'ہماری ٹیم', // REVIEW
      neon: 'دیوار پر بجلی', // REVIEW
      buckets: 'بکٹس کا ڈھیر', // REVIEW
      street: 'دکان کے باہر', // REVIEW
    },
  },
  reels: {
    title: 'ریلز پر', // REVIEW
    hint: 'ویڈیو صرف پلے دبانے پر لوڈ ہوتی ہے۔', // REVIEW
    play: '{platform} ویڈیو چلائیں: {name}', // REVIEW
    soon: 'جلد آ رہا ہے', // REVIEW
    instagram: 'Instagram',
    tiktok: 'TikTok',
    items: {
      fries: 'فرائز لوڈ ہو رہے ہیں', // REVIEW
      burger: 'فلے فیوری کی تیاری', // REVIEW
      pizza: 'پیزا کا کھنچاؤ', // REVIEW
    },
  },
  stuff: {
    title: 'ہمارا سامان', // REVIEW
    sub: 'برانڈڈ بکٹس اور ریپس۔ جی ہاں، بکٹ آپ رکھ سکتے ہیں۔', // REVIEW
    bucket: 'فرائز بکٹ', // REVIEW
    wrap: 'ریپ', // REVIEW
    tbc: 'برانڈڈ تصویر آ رہی ہے', // REVIEW
  },
  facts: {
    title: 'برف پانی ایک نظر میں', // REVIEW
    whereQ: 'یہ کہاں ہے؟', // REVIEW
    whereA: '{address}۔ {city}، {region}، پاکستان۔', // REVIEW
    hoursQ: 'کب کھلا ہوتا ہے؟', // REVIEW
    hoursRow: '{days}: {opens} سے {closes}', // REVIEW
    days: '{from} سے {to}', // REVIEW
    nextDay: '(اگلے دن)', // REVIEW
    holidays: '{dates} کو بند۔', // REVIEW
    hoursSoon: 'اوقات کی تصدیق ہو رہی ہے۔', // REVIEW
    deliverQ: 'کیا ڈیلیوری ہوتی ہے؟', // REVIEW
    deliverA: 'جی ہاں۔ ڈیلیوری اور پک اپ۔ {area}', // REVIEW
    payQ: 'ادائیگی کیسے کروں؟', // REVIEW
    pay: {
      cod: 'کیش آن ڈیلیوری', // REVIEW
      counter: 'کاؤنٹر پر نقد', // REVIEW
      jazzcash: 'JazzCash',
      easypaisa: 'Easypaisa',
    },
    knownQ: 'کس چیز کے لیے مشہور ہے؟', // REVIEW
    knownA: '{list}۔ تازہ بنا، جوش سے پیش فاسٹ فوڈ۔', // REVIEW
    priceQ: 'کتنے کا؟', // REVIEW
    bookQ: 'کیا ٹیبل بک ہو سکتی ہے؟', // REVIEW
    bookA: 'جی ہاں۔ ٹیبل، ایونٹس اور پرائیویٹ پارٹیاں، آن لائن بک کریں۔', // REVIEW
    book: 'ٹیبل بک کریں', // REVIEW
  },
};

export default about;
