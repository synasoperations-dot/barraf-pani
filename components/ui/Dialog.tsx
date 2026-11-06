'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, type ReactNode } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const LAYOUT = {
  // Bottom sheet on mobile, centered modal from md up.
  sheet: clsx(
    'mx-0 mt-auto mb-0 w-full max-w-none rounded-t-panel border-b-0',
    'md:m-auto md:max-w-lg md:rounded-panel md:border-b-3',
    'translate-y-0 starting:translate-y-full md:starting:translate-y-0 md:starting:scale-90',
  ),
  // Side drawer on the inline-end edge (flips in RTL).
  drawer: clsx(
    'ms-auto me-0 my-0 h-dvh max-h-none w-[min(420px,100vw)] max-w-none rounded-s-panel border-e-0',
    'translate-x-0 starting:translate-x-full rtl:starting:-translate-x-full',
  ),
} as const;

/**
 * Native <dialog> modal: inert background, focus moved in and restored on close, Esc closes.
 * Enter animation via @starting-style (no JS animation library).
 */
function BaseDialog({
  open,
  onClose,
  title,
  children,
  footer,
  className,
  layout,
}: DialogProps & { layout: keyof typeof LAYOUT }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const t = useTranslations('common');

  // The control that opened us. Native close() restores focus, but a sheet on an intercepted
  // route (item detail) unmounts before it can, so put focus back ourselves if it was dropped.
  const opener = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      d.showModal();
    }
    if (!open && d.open) d.close();
  }, [open]);
  useEffect(
    () => () => {
      const el = opener.current;
      requestAnimationFrame(() => {
        const dropped = !document.activeElement || document.activeElement === document.body;
        if (el?.isConnected && dropped) el.focus();
      });
    },
    [],
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className={clsx(
        'flex-col overflow-hidden border-3 border-ink bg-paper p-0 text-ink shadow-hard-lg open:flex',
        'transition-[translate,scale,opacity,display,overlay] transition-discrete duration-200 ease-out',
        'backdrop:bg-ink/60 backdrop:transition-opacity backdrop:duration-200 starting:backdrop:opacity-0',
        'max-h-[90dvh]',
        LAYOUT[layout],
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b-3 border-ink bg-white px-5 py-3">
        <h2 id={titleId} className="font-display text-2xl leading-tight">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('close')}
          className="grid size-11 press place-items-center rounded-chip border-2 border-ink bg-white text-2xl leading-none shadow-hard-sm [--press-x:3px] [--press-y:3px]"
        >
          ×
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5">{children}</div>
      {footer && <footer className="border-t-3 border-ink bg-white p-4">{footer}</footer>}
    </dialog>
  );
}

/** Bottom sheet on mobile, centered modal on desktop. */
export const Sheet = (props: DialogProps) => <BaseDialog layout="sheet" {...props} />;

/** Cart drawer: slides in from the inline-end edge. */
export const Drawer = (props: DialogProps) => <BaseDialog layout="drawer" {...props} />;
