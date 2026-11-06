import type { Messages } from '../en';

// Machine-drafted Urdu. Strings marked // REVIEW need a native speaker. Keys must match en/system.ts.
const system: Messages['system'] = {
  notFound: {
    metaTitle: 'صفحہ نہیں ملا', // REVIEW
    title: 'یہ صفحہ کوئی کھا گیا۔', // REVIEW
    body: 'یہاں جو بھی تھا، کوئی بھوکا پہلے پہنچ گیا۔ مینو مگر ابھی بھی بھرا ہوا ہے۔', // REVIEW
    menu: 'واپس مینو پر', // REVIEW
    home: 'ہوم', // REVIEW
    art: 'فرش پر گرا ہوا فرائز کا بکٹ', // REVIEW
  },
  error: {
    title: 'کچن میں کچھ جل گیا', // REVIEW
    body: 'یہ ہماری غلطی ہے۔ دوبارہ کوشش کریں، یا واٹس ایپ پر پیغام بھیجیں، ہم آپ کا آرڈر سنبھال لیں گے۔', // REVIEW
    retry: 'دوبارہ کوشش کریں', // REVIEW
    whatsapp: 'واٹس ایپ پر آرڈر کریں', // REVIEW
    whatsappText: 'السلام علیکم برف پانی! ویب سائٹ پر مسئلہ آیا۔ میں آرڈر کرنا چاہتا ہوں:', // REVIEW
    code: 'ایرر کوڈ: ⁦{digest}⁩', // REVIEW
  },
  offline: {
    banner: 'آپ آف لائن ہیں۔ مینو چلتا رہے گا؛ آرڈر کنکشن واپس آنے پر ہوگا۔', // REVIEW
    placeOrder: 'آپ آف لائن ہیں۔ آرڈر کے لیے کنکشن ضروری ہے۔', // REVIEW
  },
  maintenance: {
    metaTitle: 'جلد واپس', // REVIEW
    title: 'بس ابھی آئے', // REVIEW
    body: 'ہم ویب سائٹ کو تھوڑا سنوار رہے ہیں۔ ابھی بھوک لگی ہے؟ کال یا واٹس ایپ کریں۔', // REVIEW
    call: 'کال کریں', // REVIEW
    whatsapp: 'واٹس ایپ کریں', // REVIEW
  },
  install: {
    title: 'برف پانی کو ہوم اسکرین پر لگائیں', // REVIEW
    body: 'اگلی بار ایک ٹیپ میں مینو۔ کسی ایپ اسٹور کی ضرورت نہیں۔', // REVIEW
    install: 'لگائیں', // REVIEW
    dismiss: 'ابھی نہیں', // REVIEW
  },
  account: 'آپ کا اکاؤنٹ', // REVIEW
};

export default system;
