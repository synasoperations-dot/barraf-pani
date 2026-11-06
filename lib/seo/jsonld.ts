/**
 * schema.org JSON-LD builders (docs/ARCHITECTURE_ADDITIONS.md §A3). Pure functions over
 * business facts and contract data; rendered with <JsonLd>. Shapes are checked in jsonld.test.ts.
 * Text is English (canonical facts) so every crawler sees the same names and prices.
 */
import type { BusinessFacts } from '@/lib/business-facts';
import type { Event, Menu, OpeningHours } from '@/lib/contracts';

type Thing = Record<string, unknown>;

const DAY_URL = [
  'https://schema.org/Sunday',
  'https://schema.org/Monday',
  'https://schema.org/Tuesday',
  'https://schema.org/Wednesday',
  'https://schema.org/Thursday',
  'https://schema.org/Friday',
  'https://schema.org/Saturday',
];

export const abs = (facts: BusinessFacts, path: string) =>
  path.startsWith('http') ? path : `${facts.url}${path.startsWith('/') ? '' : '/'}${path}`;

function postalAddress(f: BusinessFacts): Thing {
  return {
    '@type': 'PostalAddress',
    streetAddress: `${f.address.street}, ${f.address.locality}`,
    addressLocality: f.address.city,
    addressRegion: f.address.region,
    postalCode: f.address.postalCode,
    addressCountry: f.address.country,
  };
}

/**
 * One spec per (opens, closes) window, grouped by day. A window that runs past midnight keeps
 * `closes` earlier than `opens` (e.g. 12:00 → 02:00), which is how Google reads overnight hours.
 */
export function openingHoursSpecification(hours: OpeningHours[]): Thing[] {
  const groups = new Map<string, number[]>();
  for (const h of hours) {
    const k = `${h.opens}|${h.closes}`;
    groups.set(k, [...(groups.get(k) ?? []), h.weekday]);
  }
  return [...groups].map(([k, days]) => {
    const [opens, closes] = k.split('|');
    return {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: [...new Set(days)].sort().map((d) => DAY_URL[d]),
      opens,
      closes,
    };
  });
}

/** Restaurant (FastFoodRestaurant) on Home. */
export function restaurantJsonLd(f: BusinessFacts): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': ['Restaurant', 'FastFoodRestaurant'],
    '@id': `${f.url}/#restaurant`,
    name: f.name,
    slogan: f.tagline,
    url: f.url,
    image: abs(f, '/opengraph-image'),
    logo: abs(f, '/icon/512'),
    telephone: f.phone,
    address: postalAddress(f),
    geo: { '@type': 'GeoCoordinates', latitude: f.geo.lat, longitude: f.geo.lng },
    hasMap: f.mapsUrl,
    openingHoursSpecification: openingHoursSpecification(f.openingHours),
    // Holidays: closed all day (Google: opens = closes = 00:00 for the date).
    specialOpeningHoursSpecification: f.holidays.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      validFrom: h.date,
      validThrough: h.date,
      opens: '00:00',
      closes: '00:00',
    })),
    servesCuisine: f.cuisine,
    ...(f.priceRange ? { priceRange: f.priceRange } : {}),
    currenciesAccepted: 'PKR',
    paymentAccepted: f.payments.join(', '),
    acceptsReservations: f.acceptsReservations,
    hasMenu: abs(f, '/menu'),
    areaServed: f.deliveryArea,
    potentialAction: {
      '@type': 'OrderAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: abs(f, '/menu'),
        actionPlatform: [
          'https://schema.org/DesktopWebPlatform',
          'https://schema.org/MobileWebPlatform',
        ],
      },
      deliveryMethod: ['http://purl.org/goodrelations/v1#DeliveryModeOwnFleet'],
    },
    ...(f.socials.length ? { sameAs: f.socials } : {}),
  };
}

/** Menu → MenuSection → MenuItem with PKR offers per variant, on /menu. */
export function menuJsonLd(f: BusinessFacts, menu: Menu): Thing {
  const active = menu.items.filter((i) => i.isActive);
  const sections = menu.categories
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((c) => ({
      c,
      items: active.filter((i) => i.categoryId === c.id).sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    .filter((s) => s.items.length);
  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    '@id': `${f.url}/menu#menu`,
    name: `${f.name} menu`,
    url: abs(f, '/menu'),
    inLanguage: 'en',
    hasMenuSection: sections.map(({ c, items }) => ({
      '@type': 'MenuSection',
      name: c.name.en,
      url: abs(f, `/menu#${c.slug}`),
      hasMenuItem: items.map((i) => ({
        '@type': 'MenuItem',
        name: i.name.en,
        url: abs(f, `/item/${i.slug}`),
        ...(i.description ? { description: i.description.en } : {}),
        ...(i.imagePath ? { image: abs(f, i.imagePath) } : {}),
        offers: i.variants
          .filter((v) => v.isAvailable)
          .map((v) => ({
            '@type': 'Offer',
            ...(i.variants.length > 1 ? { name: v.name } : {}),
            price: v.price,
            priceCurrency: 'PKR',
            availability: i.isSoldOut
              ? 'https://schema.org/OutOfStock'
              : 'https://schema.org/InStock',
          })),
      })),
    })),
  };
}

/** Event per upcoming event, on /deals. */
export function eventJsonLd(f: BusinessFacts, e: Event): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: e.title.en,
    ...(e.description ? { description: e.description.en } : {}),
    startDate: e.startsAt,
    endDate: e.endsAt,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(e.imagePath ? { image: [abs(f, e.imagePath)] } : {}),
    location: {
      '@type': 'Place',
      name: f.name,
      address: postalAddress(f),
      geo: { '@type': 'GeoCoordinates', latitude: f.geo.lat, longitude: f.geo.lng },
    },
    organizer: { '@type': 'Organization', name: f.name, url: f.url },
    ...(e.bookable
      ? {
          offers: {
            '@type': 'Offer',
            url: abs(f, '/deals'),
            price: 0,
            priceCurrency: 'PKR',
            availability:
              e.spotsLeft === 0 ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
          },
        }
      : {}),
  };
}

/** FAQPage on /faq. Answers are plain text. */
export function faqJsonLd(qas: { q: string; a: string }[]): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: qas.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
}

/** BreadcrumbList: [["Home", "/"], ["Menu", "/menu"], …]. */
export function breadcrumbJsonLd(f: BusinessFacts, trail: [name: string, path: string][]): Thing {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map(([name, path], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: abs(f, path),
    })),
  };
}
