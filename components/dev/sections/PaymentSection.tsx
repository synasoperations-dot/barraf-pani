'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { PayOutcome } from '@/components/payment/PayOutcome';
import { PayScreen } from '@/components/payment/PayScreen';
import { OrderMissing } from '@/components/receipt/OrderMissing';
import { Button } from '@/components/ui/Button';
import { ErrorState } from '@/components/ui/states';
import { toast } from '@/components/ui/Toast';
import type { PayView } from '@/features/payment/payView';
import { Label, Section } from '../guide';

const TOKEN = 'demo0000000000000000000000000000';
const VIEWS: PayView[] = [
  'confirming',
  'stuck',
  'placed',
  'back_on',
  'failed',
  'expired',
  'refund',
];

/**
 * /dev/ui section for the Payment screens: every new component in every state.
 * Rendered at the bottom of components/dev/StyleGuide.tsx.
 */
export function PaymentSection() {
  const t = useTranslations('payment');
  const [expiresAt] = useState(() => new Date(Date.now() + 14 * 60_000).toISOString());
  const jc = t('provider.jazzcash');
  return (
    <Section
      id="payment"
      title="Payment"
      note="/pay/redirect and /pay/return. The return page only follows the server's order status (realtime with polling fallback); views below are PayOutcome states."
    >
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <Label>redirect · preparing (slow_3g: stays here, never blank)</Label>
          <PayScreen
            busy
            title={t('redirect.title', { provider: jc })}
            body={t('redirect.preparing')}
          />
        </div>
        <div>
          <Label>redirect · stalled after 3 s → Continue</Label>
          <PayScreen
            busy
            title={t('redirect.title', { provider: t('provider.easypaisa') })}
            body={t('redirect.body', { provider: t('provider.easypaisa') })}
          >
            <p className="rounded-sticker border-2 border-ink bg-white px-3 py-1 text-ink">
              {t('redirect.stalled')}
            </p>
            <Button size="lg">
              {t('redirect.continue', { provider: t('provider.easypaisa') })}
            </Button>
          </PayScreen>
        </div>
        <div>
          <Label>redirect · INVALID_TRANSITION (closed)</Label>
          <PayScreen title={t('notAwaiting.title')} body={t('notAwaiting.closedBody')}>
            <Button>{t('notAwaiting.newCheckout')}</Button>
            <Button variant="ghost">{t('notAwaiting.track')}</Button>
          </PayScreen>
        </div>
        <div>
          <Label>redirect · INVALID_TRANSITION (already paid)</Label>
          <PayScreen title={t('notAwaiting.title')} body={t('notAwaiting.paidBody')}>
            <Button>{t('notAwaiting.viewOrder')}</Button>
          </PayScreen>
        </div>
        {VIEWS.map((view) => (
          <div key={view}>
            <Label>return · {view}</Label>
            <PayOutcome
              view={view}
              token={TOKEN}
              provider="jazzcash"
              expiresAt={expiresAt}
              reconnecting={view === 'confirming'}
              onReorder={() => toast('Reorder (demo)')}
            />
          </div>
        ))}
        <div>
          <Label>missing / unknown token (NOT_FOUND)</Label>
          <OrderMissing />
        </div>
        <div>
          <Label>network_fail · offline / error with retry</Label>
          <ErrorState offline onRetry={() => toast('Retry (demo)')} />
        </div>
      </div>
    </Section>
  );
}
