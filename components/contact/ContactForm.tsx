'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Turnstile } from '@/components/checkout/Turnstile';
import { Button } from '@/components/ui/Button';
import { ChoiceChips } from '@/components/ui/ChoiceChips';
import { Input, TextArea } from '@/components/ui/form';
import { PhoneInput } from '@/components/ui/PhoneInput';
import { Stamp } from '@/components/ui/Stamp';
import { ErrorState } from '@/components/ui/states';
import { Card } from '@/components/ui/surfaces';
import { useContact } from '@/features/contact/useContact';
import { useMe } from '@/features/checkout/useProfile';
import { isApiError } from '@/lib/api';
import { ContactRequest, ContactTopic } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { formatPkPhone } from '@/lib/phone';

const Schema = ContactRequest.omit({ turnstileToken: true });
type Field = 'name' | 'phone' | 'message';

/** "Sent!" stamp with the reference (also shown in /dev/ui). */
export function ContactSent({
  phone,
  reference,
  onAnother,
}: {
  phone: string;
  reference: string;
  onAnother: () => void;
}) {
  const t = useTranslations('contact.form');
  return (
    <div role="status" className="flex flex-col items-center gap-4 py-8 text-center">
      <Stamp tone="yellow" size="lg" animate>
        {t('sentStamp')}
      </Stamp>
      <p className="max-w-sm text-lg">
        {t.rich('sentBody', {
          phone: formatPkPhone(phone),
          ltr: (c) => <span dir="ltr">{c}</span>,
        })}
      </p>
      <p className="text-sm text-muted">
        {t.rich('reference', {
          reference,
          ltr: (c) => (
            <span dir="ltr" className="font-price text-lg tracking-[0.02em]">
              {c}
            </span>
          ),
        })}
      </p>
      <Button variant="ghost" onClick={onAnother}>
        {t('another')}
      </Button>
    </div>
  );
}

/** Contact form: Zod (the contract schema) + Turnstile. `?topic=data_deletion` preselects. */
export function ContactForm({ initialTopic }: { initialTopic?: ContactTopic }) {
  const t = useTranslations('contact.form');
  const message = useErrorMessage();
  const me = useMe().data ?? null;
  const send = useContact();
  const [topic, setTopic] = useState<ContactTopic>(initialTopic ?? 'feedback');
  const [nameDraft, setName] = useState<string | null>(null);
  const [phoneDraft, setPhone] = useState<string | null | undefined>(undefined);
  const [text, setText] = useState('');
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});
  const name = nameDraft ?? me?.name ?? '';
  const phone = phoneDraft === undefined ? (me?.phone ?? null) : phoneDraft;

  function submit() {
    const parsed = Schema.safeParse({ name, phone, topic, message: text });
    if (!parsed.success) {
      const bad = new Set(parsed.error.issues.map((i) => i.path[0]));
      setErrors({
        name: bad.has('name') ? t('nameError') : undefined,
        phone: bad.has('phone') ? t('phoneError') : undefined,
        message: bad.has('message') ? t('messageError') : undefined,
      });
      return;
    }
    setErrors({});
    send.mutate(parsed.data);
  }

  const err = send.error;
  const hardFail =
    err && isApiError(err) && (err.code === 'NETWORK_ERROR' || err.code === 'INTERNAL_ERROR');

  return (
    <Card id="contact-form" className="scroll-mt-24 p-5 md:p-7">
      <h2 className="mb-5 font-sticker text-2xl font-black uppercase">{t('title')}</h2>
      {send.data ? (
        <ContactSent
          phone={send.variables?.phone ?? ''}
          reference={send.data.reference}
          onAnother={() => {
            send.reset();
            setText('');
          }}
        />
      ) : hardFail ? (
        <ErrorState
          offline={err.code === 'NETWORK_ERROR'}
          body={err.code === 'NETWORK_ERROR' ? undefined : message(err)}
          onRetry={submit}
        />
      ) : (
        <form
          noValidate
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Input
            label={t('name')}
            autoComplete="name"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
            error={errors.name}
          />
          <PhoneInput value={phone} onChange={setPhone} error={errors.phone} />
          <ChoiceChips
            legend={t('topic')}
            value={topic}
            onChange={setTopic}
            options={ContactTopic.options.map((v) => ({ value: v, label: t(`topics.${v}`) }))}
          />
          {topic === 'data_deletion' && (
            <p className="rounded-input border-3 border-ink bg-blue-light p-3 text-sm">
              {t('deletionHint')}
            </p>
          )}
          <TextArea
            label={t('message')}
            placeholder={t('messagePlaceholder')}
            rows={5}
            maxLength={1000}
            value={text}
            onChange={(e) => setText(e.target.value)}
            error={errors.message}
          />
          <Turnstile />
          {err && (
            <p role="alert" className="flex gap-2 font-bold">
              <span aria-hidden="true" className="text-orange-deep">
                !
              </span>
              {message(err)}
            </p>
          )}
          <div>
            <Button type="submit" loading={send.isPending}>
              {t('send')}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
