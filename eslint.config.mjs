import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

// esquery can't parse {n} quantifiers, so the three hex digits are spelled out.
const HEX = '/#[0-9a-fA-F][0-9a-fA-F][0-9a-fA-F]/';
const noHex = [
  {
    selector: `Literal[value=${HEX}]`,
    message: 'No ad-hoc hex colours. Use a design token (see docs/DESIGN.md).',
  },
  {
    selector: `TemplateElement[value.raw=${HEX}]`,
    message: 'No ad-hoc hex colours. Use a design token (see docs/DESIGN.md).',
  },
];
const noFetch = {
  selector: "CallExpression[callee.name='fetch']",
  message: 'Only lib/api may call fetch. Use the API client.',
};
const noMocks = {
  patterns: [
    {
      group: ['@/mocks', '@/mocks/*', '**/mocks', '**/mocks/*'],
      message: 'Only the MSW bootstrap may import /mocks.',
    },
  ],
};

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', noFetch, ...noHex],
      'no-restricted-imports': ['error', noMocks],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
    },
  },
  // The API client is the single gateway allowed to call fetch.
  { files: ['lib/api/**'], rules: { 'no-restricted-syntax': ['error', ...noHex] } },
  // The MSW bootstrap (and the mocks themselves) may import /mocks.
  {
    files: ['mocks/**', 'components/dev/MswBootstrap.tsx'],
    rules: { 'no-restricted-imports': 'off' },
  },
]);
