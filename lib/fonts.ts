import {
  Bebas_Neue,
  DM_Sans,
  Lalezar,
  Lilita_One,
  Noto_Nastaliq_Urdu,
  Poppins,
} from 'next/font/google';

// Self-hosted at build time by next/font. Only the weights the design uses.
export const lilita = Lilita_One({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-lilita',
  display: 'swap',
});
export const poppins = Poppins({
  weight: ['800', '900'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
});
export const bebas = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});
export const dmSans = DM_Sans({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

// Urdu fonts: only attached (and therefore only downloaded) for the `ur` locale.
export const nastaliq = Noto_Nastaliq_Urdu({
  weight: ['400', '700'],
  subsets: ['arabic'],
  variable: '--font-nastaliq',
  display: 'swap',
  preload: false,
});
export const lalezar = Lalezar({
  weight: '400',
  subsets: ['arabic'],
  variable: '--font-lalezar',
  display: 'swap',
  preload: false,
});

export const latinFontVars = [lilita, poppins, bebas, dmSans].map((f) => f.variable).join(' ');
export const urduFontVars = [nastaliq, lalezar].map((f) => f.variable).join(' ');
