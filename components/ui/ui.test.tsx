// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useState, type ReactNode } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import en from '@/lib/i18n/messages/en';
import { OrderStatus, OrderSource } from '@/lib/contracts';
import { Sheet } from './Dialog';
import { RadioCards } from './form';
import { OtpInput } from './OtpInput';
import { PriceChip } from './PriceChip';
import { SourceTag, StatusTag } from './StatusTag';
import { Stepper } from './Stepper';

const wrap = (ui: ReactNode) =>
  render(
    <NextIntlClientProvider locale="en" messages={en} timeZone="Asia/Karachi">
      {ui}
    </NextIntlClientProvider>,
  );

beforeAll(() => {
  // jsdom has no <dialog> modal API or WAAPI; stub the bits the components call.
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '');
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open');
  };
  Element.prototype.animate = vi.fn() as never;
  window.matchMedia = ((q: string) => ({
    matches: false,
    media: q,
    addEventListener() {},
    removeEventListener() {},
  })) as never;
});
afterEach(cleanup);

describe('PriceChip', () => {
  it('shows a whole-rupee price, reports selection, and calls onClick', () => {
    const onClick = vi.fn();
    wrap(<PriceChip price={1095} label="L" selected onClick={onClick} />);
    const btn = screen.getByRole('button', { name: /L\s*1,095/ });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe('Stepper', () => {
  function Harness() {
    const [n, setN] = useState(1);
    return <Stepper value={n} onChange={setN} min={1} max={3} />;
  }
  it('has labelled buttons, a polite live value, and stops at min / max', () => {
    wrap(<Harness />);
    const minus = screen.getByRole('button', { name: 'Decrease quantity' });
    const plus = screen.getByRole('button', { name: 'Increase quantity' });
    expect(minus).toHaveProperty('disabled', true);
    fireEvent.click(plus);
    fireEvent.click(plus);
    expect(screen.getByRole('status').textContent).toBe('3');
    expect(plus).toHaveProperty('disabled', true);
    expect(screen.getByRole('group', { name: 'Quantity' })).toBeTruthy();
  });
});

describe('OtpInput', () => {
  function Harness({ onComplete }: { onComplete: (c: string) => void }) {
    const [v, setV] = useState('');
    return <OtpInput value={v} onChange={setV} onComplete={onComplete} />;
  }
  it('auto-advances, fills from a paste, and completes with 6 digits', () => {
    const done = vi.fn();
    wrap(<Harness onComplete={done} />);
    const first = screen.getByLabelText('Digit 1 of 6') as HTMLInputElement;
    fireEvent.change(first, { target: { value: '1' } });
    expect(document.activeElement).toBe(screen.getByLabelText('Digit 2 of 6'));
    fireEvent.paste(first, { clipboardData: { getData: () => '123456' } });
    expect(done).toHaveBeenCalledWith('123456');
    expect(first.getAttribute('autocomplete')).toBe('one-time-code');
  });
});

describe('RadioCards', () => {
  it('uses native radios with a legend and reports changes', () => {
    const onChange = vi.fn();
    wrap(
      <RadioCards
        legend="How will you pay?"
        value="cod"
        onChange={onChange}
        options={[
          { value: 'cod', label: 'Cash' },
          { value: 'jazzcash', label: 'JazzCash' },
          { value: 'easypaisa', label: 'Easypaisa', disabled: true },
        ]}
      />,
    );
    expect(screen.getByRole('group', { name: 'How will you pay?' })).toBeTruthy();
    expect((screen.getByRole('radio', { name: 'Cash' }) as HTMLInputElement).checked).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: 'JazzCash' }));
    expect(onChange).toHaveBeenCalledWith('jazzcash');
    expect(screen.getByRole('radio', { name: 'Easypaisa' })).toHaveProperty('disabled', true);
  });
});

describe('StatusTag / SourceTag', () => {
  it('every status and source has a text label and an icon, never colour alone', () => {
    for (const s of OrderStatus.options) {
      const { container, unmount } = wrap(<StatusTag status={s} />);
      expect(container.textContent).toBe(en.status[s]);
      expect(container.querySelector('svg[aria-hidden="true"]')).toBeTruthy();
      unmount();
    }
    for (const s of OrderSource.options) {
      const { container, unmount } = wrap(<SourceTag source={s} />);
      expect(container.textContent).toBe(en.source[s]);
      expect(container.querySelector('svg')).toBeTruthy();
      unmount();
    }
  });
});

describe('Sheet', () => {
  it('is a labelled modal dialog; Esc (cancel) and the close button call onClose', () => {
    const onClose = vi.fn();
    wrap(
      <Sheet open onClose={onClose} title="Pick a size">
        <button type="button">Inside</button>
      </Sheet>,
    );
    const dialog = screen.getByRole('dialog', { name: 'Pick a size' });
    expect(dialog.hasAttribute('open')).toBe(true);
    fireEvent(dialog, new Event('cancel', { cancelable: true }));
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
