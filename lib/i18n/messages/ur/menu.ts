import type { Messages } from '../en';

// REVIEW: machine-drafted. Keys must match en/menu.ts exactly.
const menuPage: Messages['menuPage'] = {
  metaTitle: 'مینو', // REVIEW
  metaDescription:
    'برف پانی، جھنگ کے فرائز، سینڈوچ، برگر، ونگز، ریپس، پاستا، پیزا، ڈپس اور سائیڈز۔ شامل کرنے کے لیے قیمت پر ٹیپ کریں۔', // REVIEW
  title: 'مینو', // REVIEW
  sub: 'شامل کرنے کے لیے قیمت پر ٹیپ کریں۔ تفصیل کے لیے نام پر ٹیپ کریں۔', // REVIEW
  searchLabel: 'مینو میں تلاش کریں', // REVIEW
  searchPlaceholder: 'فرائز، ونگز، پیزا…', // REVIEW
  results: '{count, plural, =0 {کوئی نتیجہ نہیں} one {# نتیجہ} other {# نتائج}}', // REVIEW
  emptyTitle: 'اس نام کے فرائز نہیں ملے…', // REVIEW
  emptyBody: 'مینو میں “{query}” سے کچھ نہیں ملا۔ کوئی اور لفظ آزمائیں۔', // REVIEW
  clearSearch: 'تلاش صاف کریں', // REVIEW
  categories: 'مینو کی اقسام', // REVIEW
  soldOutToday: 'آج ختم', // REVIEW
  addItem: '{visible}، {name} شامل کریں', // REVIEW
  addVariant: '{visible}، {name} ({variant}) شامل کریں', // REVIEW
  chooseItem: '{visible}، {name} کے آپشن منتخب کریں', // REVIEW
  soldOutItem: '{visible}، {name} آج ختم', // REVIEW
  notOffered: 'سائز {size} میں دستیاب نہیں', // REVIEW
  sizes: 'سائز', // REVIEW
  optionShort: { optionA: 'A', optionB: 'B' }, // REVIEW
  photoAlt: 'برف پانی کا {name}', // REVIEW
  closedNotice: 'ہم ابھی بند ہیں۔ آپ پھر بھی اپنا آرڈر تیار کر سکتے ہیں۔', // REVIEW
  preorderNotice: 'ہم ابھی بند ہیں۔ آپ آرڈر تیار کر کے بعد کے لیے پری آرڈر کر سکتے ہیں۔', // REVIEW
  pausedNotice: 'آرڈرز کچھ دیر کے لیے رکے ہوئے ہیں۔ آپ پھر بھی اپنا آرڈر تیار کر سکتے ہیں۔', // REVIEW
};

export default menuPage;
