/** `payment` namespace: Online payment pages (/pay/*). English source of truth; ur/payment.ts must have the same keys. */
const payment = {
  metaRedirect: 'Taking you to pay',
  metaReturn: 'Confirming payment',
  provider: {
    jazzcash: 'JazzCash',
    easypaisa: 'Easypaisa',
  },
  redirect: {
    title: 'Taking you to {provider}…',
    body: "Hang tight and keep this tab open. You'll pay on {provider}'s secure page.",
    preparing: 'Getting your payment page ready…',
    stalled: "Didn't move? Tap continue.",
    continue: 'Continue to {provider}',
  },
  notAwaiting: {
    title: "This order isn't waiting for a payment",
    paidBody: "It's already paid and with the kitchen. Nothing more to do.",
    closedBody:
      "This order is closed, so it can't take a payment any more. Your cart is still here: start a fresh checkout.",
    viewOrder: 'See my order',
    newCheckout: 'Start a new checkout',
    track: 'Track this order',
  },
  return: {
    title: 'Confirming payment…',
    body: "We're checking with {provider}. This usually takes a few seconds.",
    window: 'Payment window',
    reconnecting: 'Live updates dropped. Checking every few seconds.',
    confirmedTitle: 'Payment confirmed!',
    confirmedBody: 'Taking you to your order…',
    stuckTitle: 'Still waiting on {provider}',
    stuckBody: "We'll message you as soon as it lands. No need to pay again.",
    track: 'Track my order',
    failedTitle: "Payment didn't go through",
    failedBody: "{provider} didn't confirm it this time. Try again, or pay cash at your door.",
    tryAgain: 'Try again',
    switchCod: 'Switch to cash on delivery',
    expiredTitle: 'Payment window closed',
    expiredBody: "We didn't hear back from {provider} within 15 minutes, so this order was closed.",
    reorder: 'Put it back in my cart',
    menu: 'Back to the menu',
    backOnTitle: 'Got it, your order is back on',
    backOnBody: 'Your payment landed a little late, but the kitchen has your order now.',
    viewOrder: 'See my order',
    refundTitle: 'Payment received, but items sold out',
    refundBody:
      'Your payment came in after the window closed and some items sold out. A refund has been requested.',
  },
};

export default payment;
