import type { Messages } from '../en';

// TODO translate: machine-drafted. Keys must match en/payment.ts exactly.
const payment: Messages['payment'] = {
  metaRedirect: 'ادائیگی کی طرف', // TODO translate
  metaReturn: 'ادائیگی کی تصدیق', // TODO translate
  provider: {
    jazzcash: 'JazzCash', // TODO translate
    easypaisa: 'Easypaisa', // TODO translate
  },
  redirect: {
    title: 'آپ کو {provider} پر لے جا رہے ہیں…', // TODO translate
    body: 'ذرا رکیں اور یہ ٹیب کھلا رکھیں۔ آپ {provider} کے محفوظ صفحے پر ادائیگی کریں گے۔', // TODO translate
    preparing: 'آپ کا ادائیگی کا صفحہ تیار ہو رہا ہے…', // TODO translate
    stalled: 'آگے نہیں بڑھا؟ جاری رکھیں دبائیں۔', // TODO translate
    continue: '{provider} پر جاری رکھیں', // TODO translate
  },
  notAwaiting: {
    title: 'یہ آرڈر ادائیگی کا انتظار نہیں کر رہا', // TODO translate
    paidBody: 'اس کی ادائیگی ہو چکی ہے اور یہ کچن میں ہے۔ مزید کچھ کرنے کی ضرورت نہیں۔', // TODO translate
    closedBody:
      'یہ آرڈر بند ہو چکا ہے، اس لیے اب ادائیگی نہیں ہو سکتی۔ آپ کی کارٹ محفوظ ہے: نیا چیک آؤٹ شروع کریں۔', // TODO translate
    viewOrder: 'میرا آرڈر دیکھیں', // TODO translate
    newCheckout: 'نیا چیک آؤٹ شروع کریں', // TODO translate
    track: 'یہ آرڈر ٹریک کریں', // TODO translate
  },
  return: {
    title: 'ادائیگی کی تصدیق ہو رہی ہے…', // TODO translate
    body: 'ہم {provider} سے تصدیق کر رہے ہیں۔ عام طور پر چند سیکنڈ لگتے ہیں۔', // TODO translate
    window: 'ادائیگی کا وقت', // TODO translate
    reconnecting: 'لائیو اپڈیٹس رک گئیں۔ ہر چند سیکنڈ بعد چیک کر رہے ہیں۔', // TODO translate
    confirmedTitle: 'ادائیگی کی تصدیق ہو گئی!', // TODO translate
    confirmedBody: 'آپ کے آرڈر کی طرف لے جا رہے ہیں…', // TODO translate
    stuckTitle: 'ابھی تک {provider} کا انتظار ہے', // TODO translate
    stuckBody: 'جیسے ہی ادائیگی پہنچے گی ہم آپ کو پیغام بھیجیں گے۔ دوبارہ ادائیگی کی ضرورت نہیں۔', // TODO translate
    track: 'میرا آرڈر ٹریک کریں', // TODO translate
    failedTitle: 'ادائیگی نہیں ہو سکی', // TODO translate
    failedBody: '{provider} نے اس بار تصدیق نہیں کی۔ دوبارہ کوشش کریں یا دروازے پر نقد ادا کریں۔', // TODO translate
    tryAgain: 'دوبارہ کوشش کریں', // TODO translate
    switchCod: 'کیش آن ڈیلیوری پر جائیں', // TODO translate
    expiredTitle: 'ادائیگی کا وقت ختم', // TODO translate
    expiredBody: '15 منٹ میں {provider} سے جواب نہیں آیا، اس لیے یہ آرڈر بند کر دیا گیا۔', // TODO translate
    reorder: 'دوبارہ کارٹ میں ڈالیں', // TODO translate
    menu: 'مینو پر واپس', // TODO translate
    backOnTitle: 'مل گیا، آپ کا آرڈر دوبارہ چالو ہے', // TODO translate
    backOnBody: 'آپ کی ادائیگی تھوڑی دیر سے پہنچی، لیکن اب آرڈر کچن میں ہے۔', // TODO translate
    viewOrder: 'میرا آرڈر دیکھیں', // TODO translate
    refundTitle: 'ادائیگی مل گئی، لیکن آئٹمز ختم ہو گئے', // TODO translate
    refundBody:
      'آپ کی ادائیگی وقت ختم ہونے کے بعد آئی اور کچھ آئٹمز ختم ہو گئے۔ رقم کی واپسی کی درخواست کر دی گئی ہے۔', // TODO translate
  },
};

export default payment;
