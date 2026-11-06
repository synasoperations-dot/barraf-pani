import type { Messages } from '../en';

// TODO translate: machine-drafted. Keys must match en/menu.ts exactly.
const menuPage: Messages['menuPage'] = {
  metaTitle: 'مینو', // TODO translate
  metaDescription:
    'برف پانی، جھنگ کے فرائز، سینڈوچ، برگر، ونگز، ریپس، پاستا، پیزا، ڈپس اور سائیڈز۔ شامل کرنے کے لیے قیمت پر ٹیپ کریں۔', // TODO translate
  title: 'مینو', // TODO translate
  sub: 'شامل کرنے کے لیے قیمت پر ٹیپ کریں۔ تفصیل کے لیے نام پر ٹیپ کریں۔', // TODO translate
  searchLabel: 'مینو میں تلاش کریں', // TODO translate
  searchPlaceholder: 'فرائز، ونگز، پیزا…', // TODO translate
  results: '{count, plural, =0 {کوئی نتیجہ نہیں} one {# نتیجہ} other {# نتائج}}', // TODO translate
  emptyTitle: 'اس نام کے فرائز نہیں ملے…', // TODO translate
  emptyBody: 'مینو میں “{query}” سے کچھ نہیں ملا۔ کوئی اور لفظ آزمائیں۔', // TODO translate
  clearSearch: 'تلاش صاف کریں', // TODO translate
  categories: 'مینو کی اقسام', // TODO translate
  soldOutToday: 'آج ختم', // TODO translate
  addItem: '{name} شامل کریں، {price}', // TODO translate
  addVariant: '{name} شامل کریں، {variant}، {price}', // TODO translate
  chooseItem: '{name} کے آپشن منتخب کریں، {price}', // TODO translate
  soldOutItem: '{name}، آج ختم', // TODO translate
  notOffered: 'سائز {size} میں دستیاب نہیں', // TODO translate
  sizes: 'سائز', // TODO translate
  optionShort: { optionA: 'A', optionB: 'B' }, // TODO translate
  photoAlt: 'برف پانی کا {name}', // TODO translate
  closedNotice: 'ہم ابھی بند ہیں۔ آپ پھر بھی اپنا آرڈر تیار کر سکتے ہیں۔', // TODO translate
  preorderNotice: 'ہم ابھی بند ہیں۔ آپ آرڈر تیار کر کے بعد کے لیے پری آرڈر کر سکتے ہیں۔', // TODO translate
  pausedNotice: 'آرڈرز کچھ دیر کے لیے رکے ہوئے ہیں۔ آپ پھر بھی اپنا آرڈر تیار کر سکتے ہیں۔', // TODO translate
};

export default menuPage;
