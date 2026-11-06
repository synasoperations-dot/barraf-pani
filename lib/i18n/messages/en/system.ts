/** System states: 404, errors, offline, maintenance, install prompt. */
const system = {
  notFound: {
    metaTitle: 'Page not found',
    title: 'This page got eaten.',
    body: "Whatever was here, someone hungry got to it first. The menu's still full though.",
    menu: 'Back to the menu',
    home: 'Home',
    art: 'A fries bucket dropped on the floor',
  },
  error: {
    title: 'Something burned in the kitchen',
    body: "That's on us. Try again, or message us on WhatsApp and we'll sort your order out.",
    retry: 'Try again',
    whatsapp: 'Order on WhatsApp',
    whatsappText: 'Hi Barraf Paani! The website had a problem. I want to order:',
    code: 'Error code: {digest}',
  },
  offline: {
    banner: "You're offline. The menu still works; ordering waits until you're back.",
    placeOrder: "You're offline. Placing an order needs a connection.",
  },
  maintenance: {
    metaTitle: 'Back soon',
    title: 'Back in a flash',
    body: "We're giving the website a quick tune-up. Hungry right now? Call or WhatsApp us.",
    call: 'Call us',
    whatsapp: 'WhatsApp us',
  },
  install: {
    title: 'Add Barraf Paani to your home screen',
    body: 'One tap to the menu next time. No app store needed.',
    install: 'Add it',
    dismiss: 'Not now',
  },
  account: 'Your account',
};

export default system;
