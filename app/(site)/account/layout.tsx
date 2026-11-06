import type { ReactNode } from 'react';
import { AccountTabs } from '@/components/account/AccountTabs';

/** /account/*: guarded by proxy.ts (guests → /login?next=…). Client-side, never indexed (§2.1). */
export default function AccountLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid-paper">
      <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
        <AccountTabs />
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
