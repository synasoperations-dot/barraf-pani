import type { Messages } from '../en';

// Machine-drafted Urdu. Strings marked // REVIEW need a native speaker. Keys must match en/deals.ts.
const deals: Messages['deals'] = {
  metaTitle: 'ڈیلز اور ایونٹس', // REVIEW
  metaDescription: 'برف پانی، پیراڈائز سٹی، جھنگ میں موجودہ ڈیلز، آنے والے ایونٹس اور ٹیبل بکنگ۔', // REVIEW
  title: 'ڈیلز اور ایونٹس', // REVIEW
  sub: 'زبردست ڈیلز، شاندار راتیں۔', // REVIEW
  bookTable: 'ٹیبل بک کریں', // REVIEW
  dealsTitle: 'ڈیلز', // REVIEW
  eventsTitle: 'ایونٹس', // REVIEW
  loadError: 'ڈیلز لوڈ نہیں ہوئیں۔', // REVIEW
  emptyTitle: 'نئی ڈیلز جلد آ رہی ہیں', // REVIEW
  emptyBody: 'انسٹاگرام پر فالو کریں تاکہ سب سے پہلے پتا چلے۔ ٹیبل بکنگ ابھی بھی کھلی ہے۔', // REVIEW
  followInstagram: 'انسٹاگرام پر فالو کریں', // REVIEW
  deal: {
    includes: 'اس میں کیا ہے', // REVIEW
    till: '{date} تک', // REVIEW
    orderThis: 'یہ ڈیل آرڈر کریں', // REVIEW
    added: 'ڈیل آپ کی ٹوکری میں شامل ہو گئی', // REVIEW
    skipped:
      'اس ڈیل کی {count, plural, one {# چیز} other {# چیزیں}} ختم ہیں، اس لیے شامل نہیں کیں۔', // REVIEW
    none: 'اس ڈیل کی ہر چیز ابھی ختم ہے۔', // REVIEW
    priceNote: 'عام مینو قیمتیں۔ اصل کل رقم ٹوکری میں دکھائی دے گی۔', // REVIEW
    code: 'کوڈ', // REVIEW
    copyCode: 'کوڈ کاپی کریں', // REVIEW
    copied: 'کوڈ {code} کاپی ہو کر ٹوکری میں لگ گیا', // REVIEW
    loadingMenu: 'مینو لوڈ ہو رہا ہے…', // REVIEW
  },
  event: {
    book: 'بک کریں', // REVIEW
    fullyBooked: 'مکمل بک', // REVIEW
    spotsLeft: '{count, plural, one {# جگہ باقی} other {# جگہیں باقی}}', // REVIEW
    time: '{from} – {to}',
    poster: 'ایونٹ', // REVIEW
  },
  sheet: {
    title: 'جگہ بک کریں', // REVIEW
    type: 'آپ کیا بک کر رہے ہیں؟', // REVIEW
    types: {
      table: 'ٹیبل بکنگ', // REVIEW
      event: 'یہ ایونٹ', // REVIEW
      private_event: 'پرائیویٹ ایونٹ اور کیٹرنگ', // REVIEW
    },
    typeHints: {
      table: 'اپنے دوستوں کے لیے ٹیبل لیں۔', // REVIEW
      event: '{name}',
      private_event: 'سالگرہ، دفتر کی پارٹی، کیٹرنگ۔ ہم کال کر کے پلان کریں گے۔', // REVIEW
    },
    date: 'تاریخ', // REVIEW
    time: 'وقت', // REVIEW
    pickTime: 'وقت منتخب کریں', // REVIEW
    noSlots: 'اس دن ہم بند ہیں۔ کوئی اور تاریخ آزمائیں۔', // REVIEW
    holiday: '{date} کو ہم بند ہیں{note, select, none {} other { ({note})}}۔', // REVIEW
    eventWhen: '{date} · {time}',
    guests: 'مہمان', // REVIEW
    guestsMax: 'اس ایونٹ کے لیے زیادہ سے زیادہ {max}۔', // REVIEW
    name: 'آپ کا نام', // REVIEW
    nameError: 'بتائیں بکنگ کس کے نام پر ہے۔', // REVIEW
    phoneError: 'پاکستانی موبائل نمبر لکھیں تاکہ ہم تصدیق کر سکیں۔', // REVIEW
    note: 'کچھ اور بتانا ہے؟', // REVIEW
    notePlaceholder: 'بچوں کی کرسی، سالگرہ کا کیک، کونے والی ٹیبل…', // REVIEW
    submit: 'درخواست بھیجیں', // REVIEW
    sentTitle: 'درخواست بھیج دی!', // REVIEW
    sentBody: 'ہم جلد واٹس ایپ یا ایس ایم ایس پر تصدیق کریں گے۔', // REVIEW
    viewStatus: 'بکنگ کی صورتحال دیکھیں', // REVIEW
    another: 'ایک اور بکنگ', // REVIEW
  },
  status: {
    metaTitle: 'آپ کی بکنگ', // REVIEW
    title: 'آپ کی بکنگ', // REVIEW
    requested: 'درخواست موصول', // REVIEW
    requestedBody: 'مل گئی۔ ہم جلد واٹس ایپ یا ایس ایم ایس پر تصدیق کریں گے۔', // REVIEW
    confirmed: 'تصدیق ہو گئی!', // REVIEW
    confirmedBody: 'وہاں ملتے ہیں۔ کاؤنٹر پر یہ صفحہ دکھائیں۔', // REVIEW
    declined: 'منظور نہیں ہوئی', // REVIEW
    declinedBody: 'معذرت، اس بار گنجائش نہیں بن سکی۔', // REVIEW
    reason: 'وجہ: {reason}', // REVIEW
    cancelled: 'منسوخ', // REVIEW
    cancelledBody: 'یہ بکنگ منسوخ ہو گئی۔', // REVIEW
    completed: 'مکمل', // REVIEW
    completedBody: 'آنے کا شکریہ!', // REVIEW
    no_show: 'نہیں آئے', // REVIEW
    no_showBody: 'اس بار آپ کی کمی محسوس ہوئی۔', // REVIEW
    details: 'تفصیل', // REVIEW
    type: 'قسم', // REVIEW
    when: 'کب', // REVIEW
    guests: 'مہمان', // REVIEW
    name: 'نام', // REVIEW
    addToCalendar: 'کیلنڈر میں شامل کریں', // REVIEW
    calendarTitle: 'برف پانی بکنگ ({guests, plural, one {# مہمان} other {# مہمان}})', // REVIEW
    whatsapp: 'واٹس ایپ پر پیغام بھیجیں', // REVIEW
    whatsappText: 'السلام علیکم! میری بکنگ {token} کے بارے میں', // REVIEW
    notFoundTitle: 'بکنگ نہیں ملی', // REVIEW
    notFoundBody: 'یہ لنک درست نہیں لگتا۔ ہمارا بھیجا ہوا پیغام دیکھیں۔', // REVIEW
    live: 'لائیو اپڈیٹس', // REVIEW
    bookAgain: 'ایک اور بکنگ کریں', // REVIEW
  },
};

export default deals;
