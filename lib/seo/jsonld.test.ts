import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { z } from 'zod';
import { menuFixture } from '@/mocks/fixtures/menu';
import { demoEvents } from '@/mocks/fixtures/deals';
import { hoursFixture } from '@/mocks/fixtures/store';
import { buildFacts, hoursLines } from '@/lib/business-facts';
import type { StoreStatus } from '@/lib/contracts';
import { llmsFullTxt, llmsTxt } from './llms';
import {
  breadcrumbJsonLd,
  eventJsonLd,
  faqJsonLd,
  menuJsonLd,
  openingHoursSpecification,
  restaurantJsonLd,
} from './jsonld';

/* Required properties per Google's rich-result docs, as Zod shapes. */
const Url = z.url();
const Time = z.string().regex(/^\d{2}:\d{2}$/);
const Day = z.string().regex(/^https:\/\/schema\.org\/(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day$/);
const PostalAddress = z.object({
  '@type': z.literal('PostalAddress'),
  streetAddress: z.string().min(1),
  addressLocality: z.string().min(1),
  addressCountry: z.literal('PK'),
});
const Geo = z.object({
  '@type': z.literal('GeoCoordinates'),
  latitude: z.number(),
  longitude: z.number(),
});
const Hours = z.object({
  '@type': z.literal('OpeningHoursSpecification'),
  dayOfWeek: z.array(Day).min(1),
  opens: Time,
  closes: Time,
});
const Restaurant = z.object({
  '@context': z.literal('https://schema.org'),
  '@type': z.array(z.string()).refine((t) => t.includes('Restaurant')),
  name: z.literal('Barraf Paani'),
  url: Url,
  telephone: z.string().regex(/^\+92\d+$/),
  address: PostalAddress,
  geo: Geo,
  openingHoursSpecification: z.array(Hours).min(1),
  servesCuisine: z.array(z.string()).min(1),
  priceRange: z.string().regex(/^Rs \d[\d,]*–\d[\d,]*$/),
  acceptsReservations: z.literal(true),
  hasMenu: Url,
});
const Offer = z.object({
  '@type': z.literal('Offer'),
  price: z.number().int().positive(),
  priceCurrency: z.literal('PKR'),
});
const MenuLd = z.object({
  '@type': z.literal('Menu'),
  hasMenuSection: z
    .array(
      z.object({
        '@type': z.literal('MenuSection'),
        name: z.string().min(1),
        hasMenuItem: z
          .array(
            z.object({
              '@type': z.literal('MenuItem'),
              name: z.string().min(1),
              offers: z.array(Offer).min(1),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});
const EventLd = z.object({
  '@type': z.literal('Event'),
  name: z.string().min(1),
  startDate: z.iso.datetime({ offset: true }),
  endDate: z.iso.datetime({ offset: true }),
  eventAttendanceMode: z.literal('https://schema.org/OfflineEventAttendanceMode'),
  location: z.object({ '@type': z.literal('Place'), name: z.string(), address: PostalAddress }),
});
const FaqLd = z.object({
  '@type': z.literal('FAQPage'),
  mainEntity: z
    .array(
      z.object({
        '@type': z.literal('Question'),
        name: z.string().min(1),
        acceptedAnswer: z.object({ '@type': z.literal('Answer'), text: z.string().min(1) }),
      }),
    )
    .min(1),
});
const Breadcrumb = z.object({
  '@type': z.literal('BreadcrumbList'),
  itemListElement: z.array(
    z.object({
      '@type': z.literal('ListItem'),
      position: z.number().int().positive(),
      name: z.string(),
      item: Url,
    }),
  ),
});

const status = {
  shopPhone: '+920000000000',
  openingHours: hoursFixture,
  holidays: [{ date: '2027-03-23', note: null }],
} as unknown as StoreStatus;
const facts = buildFacts(status, menuFixture);

describe('JSON-LD', () => {
  it('Restaurant has the required local-business fields', () => {
    const ld = restaurantJsonLd(facts);
    Restaurant.parse(ld);
    assert.equal(
      (ld.specialOpeningHoursSpecification as unknown[]).length,
      1,
      'holidays become closed-all-day specs',
    );
  });

  it('past-midnight windows keep closes < opens (Google overnight format)', () => {
    const specs = openingHoursSpecification([
      { weekday: 5, opens: '12:00', closes: '02:00' },
      { weekday: 6, opens: '12:00', closes: '02:00' },
      { weekday: 1, opens: '12:00', closes: '23:30' },
    ]);
    assert.equal(specs.length, 2);
    assert.deepEqual(specs[0], {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['https://schema.org/Friday', 'https://schema.org/Saturday'],
      opens: '12:00',
      closes: '02:00',
    });
  });

  it('Menu → MenuSection → MenuItem → Offer (PKR per variant)', () => {
    const ld = MenuLd.parse(menuJsonLd(facts, menuFixture));
    const fries = ld.hasMenuSection
      .flatMap((s) => s.hasMenuItem)
      .find((i) => i.name === 'Masala Fries');
    assert.deepEqual(
      fries?.offers.map((o) => o.price),
      [250, 400],
    );
  });

  it('Event, FAQPage and BreadcrumbList', () => {
    for (const e of demoEvents()) EventLd.parse(eventJsonLd(facts, e));
    FaqLd.parse(faqJsonLd([{ q: 'Do you deliver?', a: 'Yes.' }]));
    Breadcrumb.parse(
      breadcrumbJsonLd(facts, [
        ['Home', '/'],
        ['Menu', '/menu'],
      ]),
    );
  });

  it('facts: one name/phone, price range from the live menu, overnight hours text', () => {
    assert.equal(facts.phone, '+920000000000');
    assert.match(facts.priceRange ?? '', /^Rs \d/);
    assert.ok(hoursLines(hoursFixture).some((l) => l.includes('(next day)')));
    assert.equal(buildFacts(null, null).priceRange, null);
  });
});

describe('llms.txt', () => {
  it('uses the same name, address and phone as the JSON-LD', () => {
    const txt = llmsTxt(facts);
    const ld = restaurantJsonLd(facts);
    assert.ok(txt.startsWith(`# ${ld.name as string}`));
    assert.ok(txt.includes(facts.address.full));
    assert.ok(txt.includes(ld.telephone as string));
    assert.ok(txt.includes('/llms-full.txt'));
  });

  it('full version lists every item with its PKR prices', () => {
    const full = llmsFullTxt(facts, menuFixture);
    assert.ok(full.includes('- Masala Fries: Regular Rs 250 / Large Rs 400'), full.slice(0, 400));
    assert.ok(llmsFullTxt(facts, null).includes('temporarily unavailable'));
  });
});
