import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// esquery can't parse {n} quantifiers, so the three hex digits are spelled out.
const HEX = '/#[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]/';
const hexMsg = 'No ad-hoc hex colours. Use a design token (tailwind.config.ts, docs/DESIGN.md).';
const noHex = [
  { selector: `Literal[value=${HEX}]`, message: hexMsg },
  { selector: `TemplateElement[value.raw=${HEX}]`, message: hexMsg },
];

const noFetch = {
  selector: "CallExpression[callee.name='fetch']",
  message: 'Only lib/api and lib/realtime may call fetch. Use the API client.',
};

// Money is integer rupees (§0.2): no parseFloat, no decimal literals in money code.
const moneyMsg = 'Money is whole rupees (§0.2): no parseFloat or decimal literals in money code.';
const noMoneyFloats = [
  { selector: "CallExpression[callee.name='parseFloat']", message: moneyMsg },
  { selector: "MemberExpression[property.name='parseFloat']", message: moneyMsg },
  { selector: 'Literal[raw=/^[0-9]*[.][0-9]/]', message: moneyMsg },
];
const MONEY_FILES = [
  'lib/money.ts',
  'lib/contracts/**',
  'stores/cart.ts',
  'mocks/fixtures/menu.ts',
  'mocks/fixtures/deals.ts',
  'features/cart/**',
  'features/checkout/**',
  'components/cart/**',
  'components/checkout/**',
];

const mocksPattern = {
  group: ['@/mocks', '@/mocks/*', '**/mocks', '**/mocks/*'],
  message: 'Only the MSW bootstrap may import /mocks.',
};
const supabasePattern = {
  group: ['@supabase/*', '@supabase/**', 'supabase'],
  message: 'Only lib/api and lib/realtime may talk to Supabase.',
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', noFetch, ...noHex],
      'no-restricted-imports': ['error', { patterns: [mocksPattern, supabasePattern] }],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  // The transport layer: may fetch and import Supabase.
  {
    files: ['lib/api/**', 'lib/realtime/**'],
    rules: {
      'no-restricted-syntax': ['error', ...noHex],
      'no-restricted-imports': ['error', { patterns: [mocksPattern] }],
    },
  },
  // Money code.
  {
    files: MONEY_FILES,
    ignores: ['**/*.test.ts'],
    rules: { 'no-restricted-syntax': ['error', noFetch, ...noHex, ...noMoneyFloats] },
  },
  // Tokens are defined here (the only place hex values may live).
  { files: ['tailwind.config.ts'], rules: { 'no-restricted-syntax': ['error', noFetch] } },
  // The MSW bootstrap (and the mocks themselves) may import /mocks.
  {
    files: ['mocks/**', 'components/dev/MswBootstrap.tsx', 'instrumentation.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [supabasePattern] }] },
  },
]);
