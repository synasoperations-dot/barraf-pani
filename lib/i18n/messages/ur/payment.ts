import type { Messages } from '../en';

// REVIEW: machine-drafted. Keys must match en/payment.ts exactly.
const payment: Messages['payment'] = {
  metaRedirect: 'ادائیگی کی طرف', // REVIEW
  metaReturn: 'ادائیگی کی تصدیق', // REVIEW
  provider: {
    jazzcash: 'JazzCash', // REVIEW
    easypaisa: 'Easypaisa', // REVIEW
  },
  redirect: {
    title: 'آپ کو {provider} پر لے جا رہے ہیں…', // REVIEW
    body: 'ذرا رکیں اور یہ ٹیب کھلا رکھیں۔ آپ {provider} کے محفوظ صفحے پر ادائیگی کریں گے۔', // REVIEW
    preparing: 'آپ کا ادائیگی کا صفحہ تیار ہو رہا ہے…', // REVIEW
    stalled: 'آگے نہیں بڑھا؟ جاری رکھیں دبائیں۔', // REVIEW
    continue: '{provider} پر جاری رکھیں', // REVIEW
  },
  notAwaiting: {
    title: 'یہ آرڈر ادائیگی کا انتظار نہیں کر رہا', // REVIEW
    paidBody: 'اس کی ادائیگی ہو چکی ہے اور یہ کچن میں ہے۔ مزید کچھ کرنے کی ضرورت نہیں۔', // REVIEW
    closedBody:
      'یہ آرڈر بند ہو چکا ہے، اس لیے اب ادائیگی نہیں ہو سکتی۔ آپ کی کارٹ محفوظ ہے: نیا چیک آؤٹ شروع کریں۔', // REVIEW
    viewOrder: 'میرا آرڈر دیکھیں', // REVIEW
    newCheckout: 'نیا چیک آؤٹ شروع کریں', // REVIEW
    track: 'یہ آرڈر ٹریک کریں', // REVIEW
  },
  return: {
    title: 'ادائیگی کی تصدیق ہو رہی ہے…', // REVIEW
    body: 'ہم {provider} سے تصدیق کر رہے ہیں۔ عام طور پر چند سیکنڈ لگتے ہیں۔', // REVIEW
    window: 'ادائیگی کا وقت', // REVIEW
    reconnecting: 'لائیو اپڈیٹس رک گئیں۔ ہر چند سیکنڈ بعد چیک کر رہے ہیں۔', // REVIEW
    confirmedTitle: 'ادائیگی کی تصدیق ہو گئی!', // REVIEW
    confirmedBody: 'آپ کے آرڈر کی طرف لے جا رہے ہیں…', // REVIEW
    stuckTitle: 'ابھی تک {provider} کا انتظار ہے', // REVIEW
    stuckBody: 'جیسے ہی ادائیگی پہنچے گی ہم آپ کو پیغام بھیجیں گے۔ دوبارہ ادائیگی کی ضرورت نہیں۔', // REVIEW
    track: 'میرا آرڈر ٹریک کریں', // REVIEW
    failedTitle: 'ادائیگی نہیں ہو سکی', // REVIEW
    failedBody: '{provider} نے اس بار تصدیق نہیں کی۔ دوبارہ کوشش کریں یا دروازے پر نقد ادا کریں۔', // REVIEW
    tryAgain: 'دوبارہ کوشش کریں', // REVIEW
    switchCod: 'کیش آن ڈیلیوری پر جائیں', // REVIEW
    expiredTitle: 'ادائیگی کا وقت ختم', // REVIEW
    expiredBody: '15 منٹ میں {provider} سے جواب نہیں آیا، اس لیے یہ آرڈر بند کر دیا گیا۔', // REVIEW
    reorder: 'دوبارہ کارٹ میں ڈالیں', // REVIEW
    menu: 'مینو پر واپس', // REVIEW
    backOnTitle: 'مل گیا، آپ کا آرڈر دوبارہ چالو ہے', // REVIEW
    backOnBody: 'آپ کی ادائیگی تھوڑی دیر سے پہنچی، لیکن اب آرڈر کچن میں ہے۔', // REVIEW
    viewOrder: 'میرا آرڈر دیکھیں', // REVIEW
    refundTitle: 'ادائیگی مل گئی، لیکن آئٹمز ختم ہو گئے', // REVIEW
    refundBody:
      'آپ کی ادائیگی وقت ختم ہونے کے بعد آئی اور کچھ آئٹمز ختم ہو گئے۔ رقم کی واپسی کی درخواست کر دی گئی ہے۔', // REVIEW
  },
};

export default payment;
