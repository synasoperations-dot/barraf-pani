'use client';

import Link from 'next/link';
import { useFormatter, useTranslations } from 'next-intl';
import { useState } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { BoltPair } from '@/components/ui/motifs';
import { OtpInput } from '@/components/ui/OtpInput';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { EmptyState, ErrorState, Skeleton } from '@/components/ui/states';
import { StatusTag } from '@/components/ui/StatusTag';
import { Card } from '@/components/ui/surfaces';
import { useOtpFlow } from '@/features/auth/useOtpFlow';
import { useDeviceOrders, useMyOrders } from '@/features/tracking/hooks';
import { isApiError } from '@/lib/api';
import type { Order } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { formatAmount } from '@/lib/format';
import { formatPkPhone } from '@/lib/phone';

/** /track: orders on this device + guest "My orders" behind phone OTP. */
export function FindMyOrder() {
  const t = useTranslations('tracking.find');
  return (
    <div className="grid-paper">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-8 md:py-12">
        <header className="flex flex-col items-start gap-3">
          <div className="flex items-center gap-3">
            <BoltPair side="start" />
            <h1 className="font-display text-4xl leading-none md:text-5xl">{t('title')}</h1>
            <BoltPair side="end" />
          </div>
          <p className="max-w-xl text-lg text-muted">{t('sub')}</p>
        </header>
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <DeviceOrders />
          <PhoneOrders />
        </div>
      </div>
    </div>
  );
}

const SectionTitle = ({ children }: { children: string }) => (
  <h2 className="mb-4 font-sticker text-xl font-black uppercase">{children}</h2>
);

function DeviceOrders() {
  const t = useTranslations('tracking.find');
  const tc = useTranslations('common');
  const { orders, pending, failed, retry } = useDeviceOrders();
  return (
    <section>
      <SectionTitle>{t('device')}</SectionTitle>
      {orders.length ? (
        <OrderList orders={orders} />
      ) : pending ? (
        <ListSkeleton />
      ) : failed ? (
        <ErrorState onRetry={retry} />
      ) : (
        <Card className="p-2">
          <EmptyState title={t('deviceEmpty')} action={<MenuLink />} />
        </Card>
      )}
      {orders.length > 0 && failed > 0 && (
        <p className="mt-3 flex flex-wrap items-center gap-3 text-sm font-bold">
          {t('deviceFailed')}
          <Button size="sm" variant="ghost" onClick={retry}>
            {tc('retry')}
          </Button>
        </p>
      )}
    </section>
  );
}

const MenuLink = () => {
  const t = useTranslations('tracking.find');
  return (
    <Link href="/menu" className={buttonClasses({ variant: 'secondary' })}>
      {t('browse')}
    </Link>
  );
};

const ListSkeleton = () => (
  <div className="grid gap-4">
    <Skeleton className="h-28 rounded-card" />
    <Skeleton className="h-28 rounded-card" />
  </div>
);

/**
 * Phone + OTP → api.myOrders(). If a session already exists (e.g. verified at checkout) the
 * list shows straight away; UNAUTHENTICATED means "ask for the phone".
 */
function PhoneOrders() {
  const t = useTranslations('tracking.find');
  const message = useErrorMessage();
  const mine = useMyOrders();
  const otp = useOtpFlow();
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState('');

  // onComplete and Enter can both fire: one in-flight verify only.
  const verify = (c: string) =>
    !otp.verify.isPending && otp.verify.mutate(c, { onSuccess: () => void mine.refetch() });

  let body;
  if (mine.data) {
    body = mine.data.length ? (
      <OrderList orders={mine.data} />
    ) : (
      <Card className="p-2">
        <EmptyState title={t('mineEmpty')} action={<MenuLink />} />
      </Card>
    );
  } else if (mine.isPending || (otp.verified && mine.isFetching)) {
    body = <ListSkeleton />;
  } else if (otp.verified && mine.error) {
    // After login: RATE_LIMITED (lookups are rate-limited), offline, or a server error.
    // Before login any error just means "ask for the phone".
    const offline = isApiError(mine.error) && mine.error.code === 'NETWORK_ERROR';
    body = (
      <ErrorState
        offline={offline}
        body={offline ? undefined : message(mine.error)}
        onRetry={() => void mine.refetch()}
      />
    );
  } else {
    const locked = otp.lockedFor > 0;
    const lockText = t('locked', {
      time: `${Math.floor(otp.lockedFor / 60)}:${String(otp.lockedFor % 60).padStart(2, '0')}`,
    });
    const err = (otp.sentTo && otp.verify.error) || otp.request.error;
    body = (
      <Card className="flex flex-col gap-5 p-5 md:p-7">
        <p className="text-muted">{t('phoneBody')}</p>
        {!otp.sentTo ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (phone && !locked) otp.request.mutate({ phone });
            }}
          >
            <PhoneInput value={phone} onChange={setPhone} />
            <div>
              <Button type="submit" loading={otp.request.isPending} disabled={!phone || locked}>
                {t('send')}
              </Button>
            </div>
          </form>
        ) : (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === 6) verify(code);
            }}
          >
            <p className="font-bold">{t('sentTo', { phone: formatPkPhone(otp.sentTo) })}</p>
            <OtpInput
              value={code}
              onChange={setCode}
              onComplete={verify}
              disabled={otp.verify.isPending || locked}
              autoFocus
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="submit"
                loading={otp.verify.isPending}
                disabled={code.length !== 6 || locked}
              >
                {t('verify')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={otp.resendIn > 0 || locked || otp.request.isPending}
                onClick={() => {
                  setCode('');
                  otp.verify.reset();
                  otp.request.mutate({ phone: otp.sentTo! });
                }}
              >
                {otp.resendIn > 0 ? t('resendIn', { seconds: otp.resendIn }) : t('resend')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setCode('');
                  otp.reset();
                }}
              >
                {t('change')}
              </Button>
            </div>
          </form>
        )}
        {(locked || (err && !(isApiError(err) && err.code === 'RATE_LIMITED'))) && (
          <p role="alert" className="flex gap-2 font-bold">
            <span aria-hidden="true" className="text-orange-deep">
              !
            </span>
            {/* Lockout shows a live countdown instead of the static Retry-After copy. */}
            {locked ? lockText : message(err)}
          </p>
        )}
      </Card>
    );
  }

  return (
    <section>
      <SectionTitle>{mine.data ? t('mine') : t('phoneTitle')}</SectionTitle>
      {body}
    </section>
  );
}

/** Sticker receipt cards → /track/[token]. */
export function OrderList({ orders }: { orders: Order[] }) {
  return (
    <ul className="grid gap-4">
      {orders.map((o) => (
        <li key={o.publicToken}>
          <OrderCard order={o} />
        </li>
      ))}
    </ul>
  );
}

export function OrderCard({ order }: { order: Order }) {
  const t = useTranslations();
  const format = useFormatter();
  const count = order.lines.reduce((n, l) => n + l.qty, 0);
  return (
    <Link
      href={`/track/${order.publicToken}`}
      aria-label={t('tracking.find.open', { number: order.number })}
      className="block press rounded-card border-3 border-ink bg-white p-5 shadow-hard-md [--press-x:6px] [--press-y:6px]"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-price text-3xl leading-none tracking-[0.02em]">{order.number}</p>
          <p className="mt-1 text-sm text-muted" suppressHydrationWarning>
            {format.dateTime(new Date(order.createdAt), {
              dateStyle: 'medium',
              timeStyle: 'short',
            })}
          </p>
        </div>
        <StatusTag status={order.status} />
      </div>
      <div className="mt-4 flex items-end justify-between gap-3 border-t-2 border-dashed border-ink pt-3">
        <span className="text-sm font-bold">{t('tracking.find.items', { count })}</span>
        <span className="font-price text-3xl leading-none tracking-[0.02em] text-orange-deep">
          {t('price.rs', { amount: formatAmount(order.total) })}
        </span>
      </div>
    </Link>
  );
}
