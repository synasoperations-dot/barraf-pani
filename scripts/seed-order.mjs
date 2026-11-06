// Places one COD pickup order through the server-side mock API (MOCK_API=server) and prints its
// tracking token, for Lighthouse runs on /track/[token]. node scripts/seed-order.mjs <base>
const base = process.argv[2] ?? 'http://localhost:3300';
const phone = '+923001112233';
const post = async (path, body, headers = {}) => {
  const r = await fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const json = await r.json();
  if (!r.ok) throw new Error(`${path} ${r.status} ${JSON.stringify(json)}`);
  return json;
};
const menu = await (await fetch(base + '/api/menu')).json();
const item = (name) => menu.items.find((i) => i.name.en === name);
const line = (name) => ({
  itemId: item(name).id,
  variantId: item(name).variants[0].id,
  modifierIds: [],
  qty: 1,
  note: null,
});
await post('/api/auth/otp/request', { phone, channel: 'sms', turnstileToken: 'x' });
await post('/api/auth/otp/verify', { phone, code: '123456' });
const { order } = await post(
  '/api/orders',
  {
    lines: [line('Fillet Fury'), line('Long Fries')],
    fulfilment: 'pickup',
    addressId: null,
    newAddress: null,
    paymentMethod: 'cod',
    promoCode: null,
    scheduledFor: null,
    customerNote: null,
    tip: 0,
    customer: { name: 'Lighthouse', phone },
    whatsappOptIn: false,
    confirmDuplicate: true,
    turnstileToken: 'x',
  },
  { 'Idempotency-Key': crypto.randomUUID() },
);
console.log(order.publicToken);
