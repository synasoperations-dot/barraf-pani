/**
 * FAQ copy. The same English answers feed the FAQPage JSON-LD, so keep them plain text.
 * `[TBC]` marks client facts still to confirm (docs/OPEN_QUESTIONS.md). Read with t.raw('groups').
 */
const faq = {
  metaTitle: 'FAQ',
  metaDescription:
    'Ordering, delivery, payments, pre-orders, cancellations and allergens at Barraf Paani, Paradise City, Jhang.',
  title: 'Got questions?',
  sub: 'Straight answers. No small print.',
  breadcrumb: 'FAQ',
  jump: 'Jump to',
  stillStuck: 'Still stuck?',
  stillStuckBody: 'Message us and a real person will get back to you.',
  contact: 'Contact us',
  groups: [
    {
      id: 'ordering',
      title: 'Ordering',
      items: [
        {
          q: 'How do I order?',
          a: 'Pick your food on the menu, choose delivery or pickup, and check out. No account needed: a name and a Pakistani mobile number are enough.',
        },
        {
          q: 'Why do I need a code on my first order?',
          a: 'The first cash order from a new number needs a one-time code sent by SMS or WhatsApp. It keeps fake orders out of the kitchen. After that you skip it.',
        },
        {
          q: 'How do I track my order?',
          a: 'After you order you get a tracking link. It shows every step live, from the kitchen to your door. You can also find it under Find my order.',
        },
        {
          q: 'Is the price on the menu the final price?',
          a: 'The menu and cart show an estimate. The total at checkout is calculated by our server and is the price you pay.',
        },
      ],
    },
    {
      id: 'delivery',
      title: 'Delivery',
      items: [
        {
          q: 'Where do you deliver?',
          a: 'Paradise City and most of Jhang. Drop your pin at checkout and we tell you straight away if we reach you, the delivery fee and the time. Delivery area and fees: [TBC].',
        },
        {
          q: 'Is there a minimum order?',
          a: 'Yes. The minimum depends on your area and is shown at checkout before you order. Amounts: [TBC].',
        },
        {
          q: 'How long does it take?',
          a: 'Usually [TBC] minutes, depending on how busy the kitchen is and where you are. The tracking page shows a live estimate.',
        },
        {
          q: 'Will I get WhatsApp updates?',
          a: 'Only if you say yes. The WhatsApp box at checkout is unticked by default, and you can turn updates off any time in your account.',
        },
      ],
    },
    {
      id: 'payments',
      title: 'Payments',
      items: [
        {
          q: 'How can I pay?',
          a: 'Cash on delivery, or cash at the counter for pickup. JazzCash and Easypaisa are coming: when they are on, you pay on their own secure page and we never see or store your card or wallet details.',
        },
        {
          q: 'Is there a limit on cash orders?',
          a: 'Yes. Very large orders cannot be paid in cash on delivery. Pay online or pick it up instead. Limit: [TBC].',
        },
        {
          q: 'Why is cash on delivery not available for me?',
          a: 'Cash on delivery is switched off for a number after two missed deliveries, and for pre-orders more than 2 hours ahead. Call us and we will sort it out.',
        },
      ],
    },
    {
      id: 'preorders',
      title: 'Pre-orders',
      items: [
        {
          q: 'Can I order for later?',
          a: 'Yes. Schedule an order up to 7 days ahead for any time we are open. It reaches the kitchen 60 minutes before your time, so it is fresh when you get it.',
        },
        {
          q: 'Can I order while you are closed?',
          a: 'You can schedule an order for when we open again. ASAP orders only go through while we are open.',
        },
        {
          q: 'Can I pay cash on a pre-order?',
          a: 'Cash works for pre-orders up to 2 hours ahead. For later times, pay online or pick a sooner slot.',
        },
      ],
    },
    {
      id: 'cancellations',
      title: 'Cancellations',
      items: [
        {
          q: 'Can I cancel my order?',
          a: 'Yes, from the tracking page, until the kitchen accepts it. Once the kitchen has accepted, call us and we will see what we can do.',
        },
        {
          q: 'How do refunds work?',
          a: 'If you paid online and we cannot deliver, our manager requests a refund, the owner approves it and it goes back through JazzCash or Easypaisa. Timing: [TBC]. See the refund policy for details.',
        },
      ],
    },
    {
      id: 'allergens',
      title: 'Allergens',
      items: [
        {
          q: 'Do you list allergens?',
          a: 'Allergen information for each item: [TBC]. Until then, ask us before you order if you have an allergy. Our kitchen handles wheat, dairy, eggs and more, so we cannot promise any item is free of traces.',
        },
        {
          q: 'Is the food halal?',
          a: '[TBC]',
        },
      ],
    },
  ],
};

export default faq;
