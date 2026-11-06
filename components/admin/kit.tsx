'use client';

/**
 * Staff-app building blocks: same tokens and sticker outlines as the site, calmer and denser.
 * Data areas sit on plain `paper` (no grid paper); 56px touch targets for tablets.
 */
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Dialog';
import { Input, TextArea } from '@/components/ui/form';
import { formatAmount } from '@/lib/format';
import type { ConnectionStatus } from '@/lib/realtime';

/* ---------- Page frame ---------- */

export function AdminPage({
  title,
  actions,
  children,
  className,
}: {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('mx-auto w-full max-w-7xl px-4 py-5 md:px-6', className)}>
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {/* Lilita One for page titles only. */}
        <h1 className="font-display text-3xl leading-tight md:text-4xl">{title}</h1>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </header>
      {children}
    </div>
  );
}

/** White data panel. */
export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={clsx('rounded-card border-3 border-ink bg-white p-4 shadow-hard-md', className)}
    >
      {children}
    </section>
  );
}

/** Rs 1,095 in Bebas, Western digits in both locales. */
export function Money({ value, className }: { value: number; className?: string }) {
  const t = useTranslations('price');
  return (
    <span dir="ltr" className={clsx('font-price tracking-[0.02em] tabular-nums', className)}>
      {t('rs', { amount: formatAmount(value) })}
    </span>
  );
}

/* ---------- Tabs (WAI-ARIA tabs: arrow keys move, Enter not needed) ---------- */

export interface TabDef<T extends string> {
  value: T;
  label: ReactNode;
  count?: number;
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idBase,
}: {
  tabs: TabDef<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  /** Pass the same base to TabPanel. */
  idBase: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: KeyboardEvent, i: number) => {
    const dir = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    // Arrow keys follow reading direction (flipped in RTL).
    const rtl = getComputedStyle(e.currentTarget).direction === 'rtl';
    const next = (i + (rtl ? -dir : dir) + tabs.length) % tabs.length;
    refs.current[next]?.focus();
    onChange(tabs[next]!.value);
  };
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap gap-2">
      {tabs.map((tab, i) => {
        const on = tab.value === value;
        return (
          <button
            key={tab.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            role="tab"
            type="button"
            id={`${idBase}-tab-${tab.value}`}
            aria-selected={on}
            aria-controls={`${idBase}-panel`}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={clsx(
              'inline-flex min-h-14 press items-center gap-2 rounded-button border-3 border-ink px-4 font-bold',
              on ? 'bg-ink text-white shadow-hard-orange' : 'bg-white text-ink shadow-hard-sm',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={clsx(
                  'min-w-7 rounded-full border-2 px-1.5 font-price text-lg leading-6',
                  on ? 'border-white bg-yellow text-ink' : 'border-ink bg-paper',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export function TabPanel({
  idBase,
  active,
  children,
  className,
}: {
  idBase: string;
  active: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      role="tabpanel"
      id={`${idBase}-panel`}
      aria-labelledby={`${idBase}-tab-${active}`}
      className={className}
    >
      {children}
    </div>
  );
}

/* ---------- Connection dot (live / polling / offline) ---------- */

export function ConnectionDot({
  status,
  online = true,
}: {
  status: ConnectionStatus;
  online?: boolean;
}) {
  const t = useTranslations('admin.common');
  const state = !online ? 'offline' : status;
  return (
    <span
      role="status"
      className="inline-flex min-h-10 items-center gap-2 rounded-full border-2 border-ink bg-white px-3 text-sm font-bold"
    >
      <span
        aria-hidden="true"
        className={clsx(
          'size-3 rounded-full border-2 border-ink',
          state === 'live' && 'bg-whatsapp',
          state === 'polling' && 'bg-yellow',
          state === 'offline' && 'bg-orange',
        )}
      />
      {t(`connection.${state}`)}
    </span>
  );
}

/* ---------- Toggle switch (native checkbox, role=switch) ---------- */

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  className,
}: {
  checked: boolean;
  onChange: (on: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <label
      className={clsx(
        'flex min-h-14 cursor-pointer items-center justify-between gap-4',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
    >
      <span>
        <span className="block font-bold">{label}</span>
        {description && <span className="block text-sm text-muted">{description}</span>}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={clsx(
          'relative h-9 w-16 shrink-0 rounded-full border-3 border-ink shadow-hard-sm transition-colors',
          'peer-focus-visible:ring-4 peer-focus-visible:ring-yellow peer-focus-visible:outline-3 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ink',
          checked ? 'bg-whatsapp' : 'bg-grid-line',
        )}
      >
        <span
          className={clsx(
            'absolute top-0.5 size-6 rounded-full border-2 border-ink bg-white transition-[inset-inline-start]',
            checked ? 'start-8' : 'start-0.5',
          )}
        />
      </span>
    </label>
  );
}

/* ---------- Confirm sheet: optional required reason, optional typed confirmation ---------- */

export function ConfirmSheet({
  open,
  onClose,
  title,
  body,
  confirmLabel,
  onConfirm,
  reason,
  typed,
  danger,
  loading,
  blocked,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  body?: ReactNode;
  confirmLabel: string;
  onConfirm: (reason: string) => void;
  /** Ask for a reason. `required` blocks the button until one is typed. */
  reason?: { label: string; required?: boolean; placeholder?: string };
  /** Typed confirmation: the button unlocks only when this exact text is typed. */
  typed?: string;
  danger?: boolean;
  loading?: boolean;
  /** Extra condition the caller owns (e.g. "I checked the ±40% change" ticked). */
  blocked?: boolean;
  children?: ReactNode;
}) {
  const t = useTranslations('admin.common');
  const [text, setText] = useState('');
  const [check, setCheck] = useState('');
  const formId = useId();
  const reasonOk = !reason?.required || text.trim().length >= 3;
  const typedOk = (!typed || check.trim() === typed) && !blocked;
  const close = () => {
    setText('');
    setCheck('');
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={close}
      title={title}
      footer={
        <div className="flex gap-3">
          <Button variant="ghost" size="lg" className="flex-1" onClick={close}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            form={formId}
            size="lg"
            variant={danger ? 'dark' : 'primary'}
            className="flex-1"
            disabled={!reasonOk || !typedOk}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </div>
      }
    >
      <form
        id={formId}
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!reasonOk || !typedOk) return;
          onConfirm(text.trim());
          setText('');
          setCheck('');
        }}
      >
        {body && <div className="text-base">{body}</div>}
        {children}
        {reason && (
          <TextArea
            label={reason.label}
            value={text}
            placeholder={reason.placeholder}
            onChange={(e) => setText(e.target.value)}
            required={reason.required}
            maxLength={200}
            rows={3}
            hint={reason.required ? t('reasonRequired') : undefined}
          />
        )}
        {typed && (
          <Input
            label={t('typeToConfirm', { text: typed })}
            value={check}
            onChange={(e) => setCheck(e.target.value)}
            autoComplete="off"
            dir="ltr"
          />
        )}
      </form>
    </Sheet>
  );
}

/* ---------- Print slot: renders a ticket into #print-root, prints, clears ---------- */

/**
 * `print(node)` puts the node into #print-root (the only thing visible in print, see
 * globals.css), opens the print dialog, then clears it. KOT tickets add `print-kot` (80mm page).
 */
export function usePrint() {
  const [node, setNode] = useState<ReactNode>(null);
  const print = (n: ReactNode) => {
    setNode(n);
    // Let React commit the ticket before the dialog snapshots the page.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        window.print();
        setNode(null);
      }),
    );
  };
  const slot =
    node && typeof document !== 'undefined'
      ? createPortal(node, document.getElementById('print-root') ?? document.body)
      : null;
  return { print, slot };
}

/* ---------- Small text helpers ---------- */

export function Muted({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx('text-sm text-muted', className)}>{children}</p>;
}

/** Definition rows for detail panels. */
export function Facts({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
      {rows.map(([k, v], i) => (
        <div key={i} className="contents">
          <dt className="font-bold">{k}</dt>
          <dd className="min-w-0 break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
