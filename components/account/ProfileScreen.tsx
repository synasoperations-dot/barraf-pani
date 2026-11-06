'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { useEffect, useState, useTransition } from 'react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { Checkbox, Input } from '@/components/ui/form';
import { SegmentedToggle } from '@/components/ui/SegmentedToggle';
import { ErrorState, Skeleton, Tag } from '@/components/ui/states';
import { Card } from '@/components/ui/surfaces';
import { toast } from '@/components/ui/Toast';
import { useLogout, useMe, useUpdateMe } from '@/features/account/hooks';
import { isApiError } from '@/lib/api';
import type { Customer, Locale } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { setLocale } from '@/lib/i18n/actions';
import { formatPkPhone } from '@/lib/phone';

const H2 = ({ children }: { children: string }) => (
  <h2 className="font-sticker text-xl font-black uppercase">{children}</h2>
);

/** /account: name, phone (read-only), language, WhatsApp opt-in (off by default), data, logout. */
export function ProfileScreen() {
  const t = useTranslations('account.profile');
  const router = useRouter();
  const me = useMe();

  // The cookie said "logged in" but the server disagrees (expired session): go log in again.
  useEffect(() => {
    if (me.data === null) router.replace('/login?next=/account');
  }, [me.data, router]);

  if (me.data) return <ProfileForm me={me.data} />;
  if (me.error)
    return (
      <ErrorState
        offline={isApiError(me.error) && me.error.code === 'NETWORK_ERROR'}
        onRetry={() => void me.refetch()}
      />
    );
  return (
    <div aria-busy="true" aria-label={t('title')} className="grid gap-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-56 rounded-card" />
      <Skeleton className="h-40 rounded-card" />
    </div>
  );
}

export function ProfileForm({ me }: { me: Customer }) {
  const t = useTranslations('account.profile');
  const format = useFormatter();
  const locale = useLocale();
  const router = useRouter();
  const message = useErrorMessage();
  const update = useUpdateMe();
  const logout = useLogout();
  const [, startLocale] = useTransition();
  const [name, setName] = useState(me.name ?? '');
  const dirty = name.trim() !== (me.name ?? '') && name.trim().length > 0;

  const changeLang = (lang: Locale) =>
    update.mutate(
      { preferredLang: lang },
      {
        onSuccess: () =>
          lang !== locale &&
          startLocale(async () => {
            await setLocale(lang);
            router.refresh();
          }),
      },
    );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-display text-4xl leading-none md:text-5xl">{t('title')}</h1>

      <Card className="flex flex-col gap-5 p-5 md:p-7">
        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (dirty) update.mutate({ name: name.trim() }, { onSuccess: () => toast(t('saved')) });
          }}
        >
          <Input
            label={t('name')}
            placeholder={t('namePlaceholder')}
            autoComplete="name"
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={!dirty} loading={update.isPending && dirty}>
            {t('save')}
          </Button>
        </form>

        <div>
          <p className="mb-1.5 text-sm font-bold">{t('phone')}</p>
          <p className="flex flex-wrap items-center gap-3">
            <span dir="ltr" className="font-price text-3xl leading-none tracking-[0.02em]">
              {formatPkPhone(me.phone)}
            </span>
            {me.phoneVerifiedAt && <Tag tone="blue">{t('verified')}</Tag>}
          </p>
          <p className="mt-1.5 text-sm text-muted">{t('phoneHint')}</p>
        </div>

        <div>
          <p aria-hidden="true" className="mb-1.5 text-sm font-bold">
            {t('lang')}
          </p>
          <SegmentedToggle<Locale>
            label={t('lang')}
            value={me.preferredLang}
            onChange={changeLang}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ur', label: 'اردو' },
            ]}
          />
          <p className="mt-1.5 text-sm text-muted">{t('langHint')}</p>
        </div>

        <div>
          <Checkbox
            label={t('whatsapp')}
            hint={
              me.whatsappOptIn && me.whatsappOptInAt
                ? t('whatsappOnSince', {
                    date: format.dateTime(new Date(me.whatsappOptInAt), { dateStyle: 'medium' }),
                  })
                : t('whatsappHint')
            }
            checked={me.whatsappOptIn}
            disabled={update.isPending}
            onChange={(e) =>
              update.mutate(
                e.target.checked
                  ? { whatsappOptIn: true, whatsappOptInSource: 'account' }
                  : { whatsappOptIn: false },
                { onSuccess: (c) => toast(c.whatsappOptIn ? t('whatsappOn') : t('whatsappOff')) },
              )
            }
          />
        </div>

        {update.error && (
          <p role="alert" className="flex gap-2 font-bold">
            <span aria-hidden="true" className="text-orange-deep">
              !
            </span>
            {message(update.error)}
          </p>
        )}
      </Card>

      <Card className="flex flex-col items-start gap-3 p-5 md:p-7">
        <H2>{t('privacy')}</H2>
        <p className="text-muted">{t('privacyBody')}</p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/contact?topic=data_deletion#contact-form"
            className={buttonClasses({ variant: 'ghost', size: 'sm' })}
          >
            {t('deleteData')}
          </Link>
          <Button
            variant="dark"
            size="sm"
            loading={logout.isPending}
            onClick={() =>
              logout.mutate(undefined, {
                onSuccess: () => {
                  toast(t('loggedOut'));
                  router.replace('/');
                  router.refresh();
                },
              })
            }
          >
            {t('logout')}
          </Button>
        </div>
      </Card>
    </div>
  );
}
