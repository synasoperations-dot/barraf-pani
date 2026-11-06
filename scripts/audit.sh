#!/usr/bin/env bash
# QA consistency audit (docs/PAGES.md "Audits"). Prints offenders; exits 1 if any are found.
# ESLint already blocks hex literals, fetch outside lib/api, Supabase and /mocks imports and
# money floats in TS; this also covers CSS, JSX text and URL patterns ESLint can't see.
set -u
cd "$(dirname "$0")/.."
fail=0
check() {
  local title="$1" out="$2"
  if [ -n "$out" ]; then
    echo "✗ $title"; echo "$out" | head -20; fail=1
  else
    echo "✓ $title"
  fi
}

SRC="app components features lib stores"

check "no hex colours outside tailwind.config.ts (CSS + TSX)" \
  "$(grep -rnE '#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b' $SRC --include=*.css --include=*.tsx --include=*.ts | grep -vE 'tailwind\.config|\.test\.|href="#|#main|#admin-main|#print-root|url\(#|getElementById' )"

check "no blurred shadows (hard offset shadows only)" \
  "$(grep -rnE 'shadow-(sm|md|lg|xl|2xl|inner)\b|drop-shadow|\bblur-[a-z0-9]|backdrop-blur' $SRC --include=*.tsx --include=*.css | grep -vE 'shadow-hard|drop-shadow-none|drop-shadow\([0-9]+px [0-9]+px 0 ')"

check "no fetch( outside lib/api and lib/realtime" \
  "$(grep -rnE '\bfetch\(' $SRC --include=*.ts --include=*.tsx | grep -vE '^lib/(api|realtime)/|refetch|\.test\.')"

check "no Supabase imports outside lib/api and lib/realtime" \
  "$(grep -rn "@supabase" $SRC --include=*.ts --include=*.tsx | grep -vE '^lib/(api|realtime)/')"

check "no /mocks imports outside the MSW bootstrap" \
  "$(grep -rln "from '@/mocks" $SRC --include=*.ts --include=*.tsx | grep -vE 'MswBootstrap|app/api/\[\.\.\.path\]|\.test\.')"

check "no order numbers in URLs (tokens only)" \
  "$(grep -rnE '(href|push|replace)[=(][^\n]*\.number\b' $SRC --include=*.tsx --include=*.ts)"

check "no parseFloat / toFixed in money code (whole rupees)" \
  "$(grep -rnE 'parseFloat|toFixed\(' lib/money.ts lib/contracts stores features/cart features/checkout features/admin components/cart components/checkout components/admin --include=*.ts --include=*.tsx | grep -v '\.test\.')"

check "no hard-coded English JSX text in components (outside dev/)" \
  "$(grep -rnE '>[[:space:]]*[A-Z][a-z]{2,}( [a-z]+)+[[:space:]]*<' components --include=*.tsx | grep -vE 'components/dev/')"

check "no TODO without an OPEN_QUESTIONS / backend reference" \
  "$(grep -rnP 'TODO(?!_CONFIRM)' $SRC --include=*.ts --include=*.tsx | grep -viE 'backend|OPEN_QUESTIONS|translate|client SVG|TODO\(|TBC' )"

exit $fail
