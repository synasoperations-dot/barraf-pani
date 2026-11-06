import type { Messages } from '../en';

// REVIEW: machine-drafted. Keys must match en/home.ts exactly.
const home: Messages['home'] = {
  intro: {
    skip: 'انٹرو چھوڑیں', // REVIEW
  },
  hero: {
    line1: 'تازہ بنا۔', // REVIEW
    line2: 'جوش سے پیش۔', // REVIEW
    location: 'پیراڈائز سٹی · جھنگ', // REVIEW
    start: 'آرڈر شروع کریں', // REVIEW
    seeMenu: 'مینو دیکھیں', // REVIEW
    preorderFor: '⁦{time}⁩ کے لیے پری آرڈر', // REVIEW
    preorder: 'آرڈر شیڈول کریں', // REVIEW
    opensAt: '⁦{time}⁩ پر کھلے گا', // REVIEW
    closed: 'ابھی بند ہے', // REVIEW
    photoAlt: 'فِلے فیوری برگر', // REVIEW
    featured: '{name} · {price}', // REVIEW
  },
  ways: {
    deliveryBody: 'جھنگ میں جہاں تک ہم پہنچتے ہیں، گرم گرم آپ کے دروازے پر۔', // REVIEW
    pickupBody: 'پہلے آرڈر کریں اور انتظار سے بچیں۔', // REVIEW
    dineIn: 'یہیں کھائیں', // REVIEW
    dineInBody: 'پیراڈائز سٹی میں بیٹھیں اور مزے سے کھائیں۔', // REVIEW
  },
  favourites: {
    title: 'سب کے پسندیدہ', // REVIEW
    add: 'شامل کریں +', // REVIEW
    addLabel: '{name} کارٹ میں شامل کریں', // REVIEW
    choose: '{name} شامل کریں: پہلے آپشن چنیں', // REVIEW
    soldOutStamp: 'آج ختم', // REVIEW
    seeMenu: 'پورا مینو دیکھیں', // REVIEW
  },
  cravings: {
    seeMenu: 'سب کچھ', // REVIEW
  },
  deals: {
    title: 'ڈیلز اور ایونٹس', // REVIEW
    seeAll: 'تمام ڈیلز اور ایونٹس دیکھیں', // REVIEW
    deal: 'ڈیل', // REVIEW
    event: 'ایونٹ', // REVIEW
  },
  spot: {
    title: 'ہماری جگہ', // REVIEW
    soon: 'تصویر جلد', // REVIEW
    counter: 'کاؤنٹر', // REVIEW
    fryer: 'فرائر سے تازہ', // REVIEW
    seats: 'بیٹھنے کی جگہ', // REVIEW
    night: 'رات دیر تک', // REVIEW
  },
  findUs: {
    title: 'ہمیں ڈھونڈیں', // REVIEW
    address: 'پتہ', // REVIEW
    hours: 'اوقات', // REVIEW
    days: '{from} تا {to}', // REVIEW
    range: '{opens} – {closes}', // REVIEW
    nextDay: '(اگلے دن)', // REVIEW
    whatsapp: 'واٹس ایپ کریں', // REVIEW
    directions: 'راستہ دیکھیں', // REVIEW
    loadMap: 'نقشہ دکھائیں', // REVIEW
    mapHint: 'نقشہ صرف ٹیپ کرنے پر لوڈ ہوتا ہے۔', // REVIEW
    pin: 'برف پانی یہاں ہے', // REVIEW
    openMaps: 'گوگل میپس میں کھولیں', // REVIEW
  },
};

export default home;
