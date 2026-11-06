import type { Messages } from '../en';

// Machine-drafted Urdu. Strings marked // REVIEW need a native speaker. Keys must match en/account.ts.
// Numbers, prices and phones are wrapped in ⁦…⁩ (LTR isolate) so they stay LTR in RTL text.
const account: Messages['account'] = {
  nav: {
    account: 'اکاؤنٹ', // REVIEW
    profile: 'پروفائل', // REVIEW
    orders: 'آرڈرز', // REVIEW
    addresses: 'پتے', // REVIEW
    section: 'اکاؤنٹ کے حصے', // REVIEW
  },
  login: {
    metaTitle: 'لاگ اِن', // REVIEW
    title: 'لاگ اِن', // REVIEW
    sub: 'آپ کا فون نمبر ہی آپ کا اکاؤنٹ ہے۔ کوئی پاس ورڈ نہیں۔', // REVIEW
    phoneBody:
      'ہم SMS پر 6 ہندسوں کا کوڈ بھیجیں گے۔ لاگ اِن کے بغیر بھی بطور مہمان آرڈر ہو سکتا ہے۔', // REVIEW
    send: 'کوڈ بھیجیں', // REVIEW
    sentTo: 'کوڈ ⁦{phone}⁩ پر بھیج دیا گیا', // REVIEW
    verify: 'لاگ اِن', // REVIEW
    resend: 'نیا کوڈ بھیجیں', // REVIEW
    resendIn: 'نیا کوڈ ⁦{seconds}⁩ سیکنڈ میں', // REVIEW
    change: 'نمبر بدلیں', // REVIEW
    expired: 'یہ کوڈ ختم ہو گیا۔ نیا کوڈ منگوائیں اور تازہ کوڈ استعمال کریں۔', // REVIEW
    wrong: 'یہ کوڈ درست نہیں۔ SMS دیکھ کر دوبارہ کوشش کریں۔', // REVIEW
    locked: 'بہت زیادہ کوششیں۔ نیا کوڈ ⁦{time}⁩ بعد منگوا سکتے ہیں۔', // REVIEW
    lockedTitle: 'تھوڑی دیر کے لیے بند', // REVIEW
    welcome: 'خوش آمدید!', // REVIEW
    welcomeNew: 'آپ اندر آ گئے! برف پانی میں خوش آمدید۔', // REVIEW
    guest: 'صرف آرڈر کرنا ہے؟ اسے چھوڑیں اور بطور مہمان چیک آؤٹ کریں۔', // REVIEW
    toMenu: 'مینو دیکھیں', // REVIEW
  },
  profile: {
    metaTitle: 'آپ کا اکاؤنٹ', // REVIEW
    title: 'آپ کا اکاؤنٹ', // REVIEW
    name: 'نام', // REVIEW
    namePlaceholder: 'ہم آپ کو کیا کہیں؟', // REVIEW
    save: 'محفوظ کریں', // REVIEW
    saved: 'محفوظ ہو گیا', // REVIEW
    phone: 'فون', // REVIEW
    phoneHint: 'یہی آپ کا لاگ اِن ہے۔ بدلنے کے لیے نئے نمبر سے لاگ اِن کریں۔', // REVIEW
    verified: 'تصدیق شدہ', // REVIEW
    lang: 'پیغامات کی زبان', // REVIEW
    langHint: 'آرڈر اپ ڈیٹس اور اس ویب سائٹ کے لیے۔', // REVIEW
    whatsapp: 'واٹس ایپ پر آرڈر اپ ڈیٹس', // REVIEW
    whatsappHint: 'پہلے سے بند۔ ہم صرف آپ کے آرڈر اور بکنگ کے بارے میں پیغام بھیجتے ہیں۔', // REVIEW
    whatsappOnSince: '⁦{date}⁩ سے آن', // REVIEW
    whatsappOn: 'واٹس ایپ اپ ڈیٹس آن', // REVIEW
    whatsappOff: 'واٹس ایپ اپ ڈیٹس بند', // REVIEW
    privacy: 'آپ کا ڈیٹا', // REVIEW
    privacyBody:
      'ہم صرف آپ کا نام، فون اور پتے رکھتے ہیں۔ کارڈ اور والیٹ کی تفصیلات کبھی محفوظ نہیں ہوتیں۔', // REVIEW
    deleteData: 'میرا ڈیٹا حذف کرنے کی درخواست', // REVIEW
    logout: 'لاگ آؤٹ', // REVIEW
    loggedOut: 'لاگ آؤٹ ہو گئے۔ پھر ملیں گے!', // REVIEW
  },
  orders: {
    metaTitle: 'آپ کے آرڈرز', // REVIEW
    title: 'آپ کے آرڈرز', // REVIEW
    emptyTitle: 'ابھی کوئی آرڈر نہیں', // REVIEW
    emptyBody: 'آپ کا پہلا فلے فیوری بس ایک ٹیپ دور ہے۔', // REVIEW
    browse: 'مینو دیکھیں', // REVIEW
    view: 'رسید دیکھیں', // REVIEW
    viewLabel: '⁦{number}⁩ کی رسید دیکھیں', // REVIEW
    reorder: 'دوبارہ آرڈر', // REVIEW
    reorderLabel: '⁦{number}⁩ دوبارہ آرڈر کریں', // REVIEW
    more: 'مزید دکھائیں', // REVIEW
    items: '{count, plural, one {# آئٹم} other {# آئٹمز}}', // REVIEW
    more_items: '⁦+{count}⁩ مزید', // REVIEW
    reviewTitle: 'شامل کرنے سے پہلے ایک نظر', // REVIEW
    reviewBody: 'اس آرڈر کے بعد مینو بدل گیا ہے:', // REVIEW
    soldOut: '{name} آج ختم ہے', // REVIEW
    inactive: '{name} اب مینو پر نہیں', // REVIEW
    priceChanged: '{name}: ⁦Rs {was} → Rs {now}⁩', // REVIEW
    addRest: '{count, plural, one {# آئٹم} other {# آئٹمز}} ٹوکری میں ڈالیں', // REVIEW
    nothingLeft: 'اس آرڈر کی کوئی چیز ابھی دستیاب نہیں۔', // REVIEW
    added: 'آپ کی ٹوکری میں شامل', // REVIEW
    menuLoading: 'مینو لوڈ ہو رہا ہے…', // REVIEW
  },
  addresses: {
    metaTitle: 'آپ کے پتے', // REVIEW
    title: 'محفوظ پتے', // REVIEW
    add: 'نیا پتہ شامل کریں', // REVIEW
    edit: 'ترمیم', // REVIEW
    editLabel: '{label} میں ترمیم', // REVIEW
    delete: 'حذف کریں', // REVIEW
    deleteLabel: '{label} حذف کریں', // REVIEW
    deleteTitle: 'یہ پتہ حذف کریں؟', // REVIEW
    deleteBody: '{line1} آپ کے محفوظ پتوں سے ہٹ جائے گا۔', // REVIEW
    deleteConfirm: 'حذف کر دیں', // REVIEW
    deleted: 'پتہ حذف ہو گیا', // REVIEW
    keep: 'رہنے دیں', // REVIEW
    makeDefault: 'ڈیفالٹ بنائیں', // REVIEW
    default: 'ڈیفالٹ', // REVIEW
    defaultSet: 'ڈیفالٹ پتہ اپ ڈیٹ ہو گیا', // REVIEW
    emptyTitle: 'کوئی محفوظ پتہ نہیں', // REVIEW
    emptyBody: 'گھر یا دفتر ایک بار محفوظ کریں، چیک آؤٹ خود بھر جائے گا۔', // REVIEW
    sheetAdd: 'نیا پتہ', // REVIEW
    sheetEdit: 'پتے میں ترمیم', // REVIEW
    label: 'نام', // REVIEW
    line1: 'مکان / گلی', // REVIEW
    line1Placeholder: 'مکان 12، گلی 4', // REVIEW
    line1Error: 'اپنا مکان اور گلی لکھیں۔', // REVIEW
    area: 'علاقہ', // REVIEW
    areaPlaceholder: 'پیراڈائز سٹی', // REVIEW
    landmark: 'نشانی', // REVIEW
    landmarkPlaceholder: 'مسجد کے قریب، سبز گیٹ', // REVIEW
    landmarkHint: 'رائیڈر کو پہلی بار میں آپ تک پہنچنے میں مدد ملتی ہے۔', // REVIEW
    pinError: 'پن لگائیں تاکہ رائیڈر آپ کو ڈھونڈ سکے۔', // REVIEW
    save: 'پتہ محفوظ کریں', // REVIEW
    saveAnyway: 'پھر بھی محفوظ کریں', // REVIEW
    saved: 'پتہ محفوظ ہو گیا', // REVIEW
    checking: 'ڈیلیوری علاقہ چیک ہو رہا ہے…', // REVIEW
    inZone: 'ہم یہاں ڈیلیور کرتے ہیں: {zone}، تقریباً ⁦{minutes}⁩ منٹ۔', // REVIEW
    outsideTitle: 'ہمارے ڈیلیوری علاقے سے باہر', // REVIEW
    outsideBody:
      'ہم ابھی اس پن پر ڈیلیور نہیں کر سکتے۔ آپ اسے پک اپ کے حوالے کے لیے پھر بھی محفوظ کر سکتے ہیں۔', // REVIEW
  },
  labels: {
    home: 'گھر', // REVIEW
    work: 'دفتر', // REVIEW
    other: 'دیگر', // REVIEW
  },
};

export default account;
