/**
 * Privacy, terms and refund policy. DRAFT, drafted from ARCHITECTURE §7 (data protection) and
 * §13.2 (refunds). A lawyer must review it before launch. Sections read with t.raw('<doc>.sections').
 */
const legal = {
  draft: 'Draft. Have a lawyer review it.',
  draftBody: 'This text is a working draft and is not legal advice yet.',
  updated: 'Last updated {date}',
  toc: 'On this page',
  questions: 'Questions?',
  questionsBody: 'Message us and a real person will reply.',
  contact: 'Contact us',
  deleteData: 'Request my data be deleted',
  privacy: {
    metaTitle: 'Privacy policy',
    metaDescription: 'What Barraf Paani stores about you, why, and how to have it deleted.',
    title: 'Privacy policy',
    intro:
      'We keep as little about you as we can: enough to cook your order and get it to you. This page explains what we store, why, and how to have it removed.',
    sections: [
      {
        id: 'what-we-store',
        title: 'What we store',
        body: [
          'Your phone number, your name and the addresses you give us. That is it.',
          'With each order we keep what you ordered, the total, the delivery address at that time and the order status, because the shop needs them for its records.',
          'We do not ask for your email, your date of birth or your ID card.',
        ],
      },
      {
        id: 'payments',
        title: 'Card and wallet details',
        body: [
          'We never see or store card numbers or wallet PINs. When online payment is on, you pay on the JazzCash or Easypaisa hosted page, and they only tell us whether the payment went through.',
        ],
      },
      {
        id: 'why',
        title: 'Why we use it',
        body: [
          'To prepare and deliver your order, to send you its status, to call you if the rider cannot find you, and to stop fake or abusive orders (for example the one-time code on a first cash order).',
          'We do not sell your data and we do not use it for advertising.',
        ],
      },
      {
        id: 'whatsapp',
        title: 'WhatsApp and SMS',
        body: [
          'We only send you WhatsApp messages if you ticked the box to receive them. We record when and where you said yes. You can switch it off any time in your account.',
          'Order updates for customers who did not opt in to WhatsApp go by SMS.',
        ],
      },
      {
        id: 'staff',
        title: 'Who sees it',
        body: [
          'Kitchen screens show your phone number masked. The rider sees your full number only while delivering your order. Managers can see your orders to help with problems.',
          'Our technology providers (hosting, database, messaging) process data for us under their own security terms.',
        ],
      },
      {
        id: 'delete',
        title: 'Deleting your data',
        body: [
          'Ask us to delete your data through the contact form (topic: Data deletion request). Our staff then remove your name and phone number and mask your saved addresses. Order records stay, without your details, because the shop must keep its sales records.',
        ],
      },
      {
        id: 'retention',
        title: 'How long we keep it',
        body: [
          'Account and order data: while you are a customer, until you ask us to delete it. Bookings: your name and phone are removed one year after the booking date. Technical logs: up to one year, webhook records 90 days.',
        ],
      },
    ],
  },
  terms: {
    metaTitle: 'Terms of service',
    metaDescription: 'The rules for ordering from Barraf Paani online.',
    title: 'Terms of service',
    intro: 'The short version: order honestly, pay for what you order, and we will cook it fresh.',
    sections: [
      {
        id: 'orders',
        title: 'Orders',
        body: [
          'An order is confirmed when the kitchen accepts it. The total at checkout is calculated by our server and is the price you pay. Menu and cart prices are an estimate until then.',
          'If an item sells out after you order, we will contact you and offer a swap or remove it.',
        ],
      },
      {
        id: 'cash',
        title: 'Cash on delivery',
        body: [
          'The first cash order from a new number needs a one-time code. Very large orders have a cash limit. Cash on delivery is switched off for a number after two missed deliveries, and for pre-orders more than 2 hours ahead.',
        ],
      },
      {
        id: 'preorders',
        title: 'Pre-orders',
        body: [
          'You can schedule an order up to 7 days ahead during opening hours. It reaches the kitchen 60 minutes before the chosen time.',
        ],
      },
      {
        id: 'cancel',
        title: 'Cancelling',
        body: [
          'You can cancel from the tracking page until the kitchen accepts the order. After that, call us. We may cancel an order we cannot deliver, for example outside our delivery area or when an item runs out.',
        ],
      },
      {
        id: 'delivery',
        title: 'Delivery',
        body: [
          'Delivery times are estimates. Please be reachable on the number you gave us. If the rider cannot reach you, the order may be cancelled.',
        ],
      },
      {
        id: 'bookings',
        title: 'Bookings',
        body: [
          'A booking is a request until we confirm it on WhatsApp or SMS. Event bookings depend on capacity.',
        ],
      },
      {
        id: 'abuse',
        title: 'Fair use',
        body: ['We may block numbers used for fake orders, abuse or repeated no-shows.'],
      },
    ],
  },
  refunds: {
    metaTitle: 'Refund policy',
    metaDescription: 'How refunds work at Barraf Paani for online and cash orders.',
    title: 'Refund policy',
    intro: 'Something went wrong? Here is how we put it right.',
    sections: [
      {
        id: 'when',
        title: 'When you get a refund',
        body: [
          'If you paid online and we cannot deliver, if an item was missing, or if we cancelled your order after payment.',
          'If a late online payment arrives after your order expired and the items are no longer available, it is refunded automatically.',
        ],
      },
      {
        id: 'how',
        title: 'How it works',
        body: [
          'Our manager requests the refund, the owner approves it, and the money is sent back through the JazzCash or Easypaisa merchant portal to the account you paid from. Every step is tracked in our system.',
        ],
      },
      {
        id: 'timing',
        title: 'How long it takes',
        body: ['Refund timing: [TBC]. JazzCash and Easypaisa may take extra time to show it.'],
      },
      {
        id: 'cash',
        title: 'Cash orders',
        body: [
          'For cash orders there is nothing to reverse online. Refunds for cash orders are given in cash at the counter: [TBC].',
        ],
      },
      {
        id: 'ask',
        title: 'How to ask',
        body: [
          'Use the contact form with the topic Complaint and your order number, or call us. Please get in touch within [TBC] of your order.',
        ],
      },
    ],
  },
};

export default legal;
