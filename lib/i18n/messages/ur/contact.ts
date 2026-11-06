import type { Messages } from '../en';

// Machine-drafted Urdu. Strings marked // REVIEW need a native speaker. Keys must match en/contact.ts.
const contact: Messages['contact'] = {
  metaTitle: 'تشریف لائیں اور رابطہ', // REVIEW
  metaDescription:
    'برف پانی، پیراڈائز سٹی، جھنگ کا پتا، اوقات، فون اور واٹس ایپ۔ راستہ دیکھیں یا ہمیں پیغام بھیجیں۔', // REVIEW
  title: 'تشریف لائیں اور رابطہ', // REVIEW
  sub: 'بھوکے آئیں، خوش ہو کر جائیں۔', // REVIEW
  address: 'پتا', // REVIEW
  hours: 'اوقات', // REVIEW
  today: 'آج', // REVIEW
  closedDay: 'بند', // REVIEW
  nextDay: '(اگلے دن)', // REVIEW
  range: '{opens} – {closes}',
  holidays: 'آنے والی چھٹیاں', // REVIEW
  holidayLine: '{date}{note, select, none {} other { · {note}}}',
  noHolidays: 'کوئی چھٹی نہیں آ رہی۔', // REVIEW
  hoursError: 'اوقات لوڈ نہیں ہوئے۔', // REVIEW
  phone: 'فون', // REVIEW
  call: 'کال کریں', // REVIEW
  whatsapp: 'واٹس ایپ کریں', // REVIEW
  whatsappText: 'السلام علیکم برف پانی! میرا ایک سوال ہے:', // REVIEW
  directions: 'راستہ دیکھیں', // REVIEW
  eventTitle: 'کوئی ایونٹ پلان کر رہے ہیں؟', // REVIEW
  eventBody: 'سالگرہ، دفتر کی پارٹی، کیٹرنگ۔', // REVIEW
  eventCta: 'یہاں بک کریں', // REVIEW
  form: {
    title: 'ہمیں پیغام بھیجیں', // REVIEW
    name: 'آپ کا نام', // REVIEW
    topic: 'موضوع', // REVIEW
    topics: {
      feedback: 'رائے', // REVIEW
      complaint: 'شکایت', // REVIEW
      data_deletion: 'ڈیٹا حذف کرنے کی درخواست', // REVIEW
      other: 'دیگر', // REVIEW
    },
    deletionHint:
      'ہم اپنے ریکارڈ سے آپ کا نام اور فون حذف کر دیں گے۔ پرانے آرڈر گمنام ہو کر رہیں گے۔ عملہ پہلے فون پر تصدیق کرے گا۔', // REVIEW
    message: 'پیغام', // REVIEW
    messagePlaceholder: 'بتائیں کیا ہوا، یا کیا اچھا لگا۔', // REVIEW
    send: 'پیغام بھیجیں', // REVIEW
    nameError: 'اپنا نام لکھیں۔', // REVIEW
    phoneError: 'پاکستانی موبائل نمبر لکھیں تاکہ ہم جواب دے سکیں۔', // REVIEW
    messageError: 'کم از کم چند الفاظ لکھیں۔', // REVIEW
    sentStamp: 'بھیج دیا!', // REVIEW
    sentBody: 'شکریہ۔ ہم <ltr>{phone}</ltr> پر جواب دیں گے۔', // REVIEW
    reference: 'حوالہ: <ltr>{reference}</ltr>', // REVIEW
    another: 'ایک اور پیغام', // REVIEW
  },
};

export default contact;
