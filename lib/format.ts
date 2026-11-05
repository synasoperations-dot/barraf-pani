import type { LocalizedText, Variant } from '@/lib/contracts';

const pkr = new Intl.NumberFormat('en-PK', { maximumFractionDigits: 0 });

/** 1095 → "1,095". Prices stay in Western digits in both locales (Bebas Neue has no Urdu digits). */
export const formatAmount = (rupees: number) => pkr.format(rupees);

/** Pick the locale's text, falling back to English when Urdu isn't translated yet. */
export const localized = (text: LocalizedText, locale: string) =>
  (locale === 'ur' && text.ur) || text.en;

/** Variant label parts: size ("S") and an i18n key for the option ("variant.optionA"). */
export const variantLabelParts = (v: Pick<Variant, 'size' | 'option'>) => ({
  size: v.size,
  optionKey: v.option ? (`variant.${v.option}` as const) : null,
});
