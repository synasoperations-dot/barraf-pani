import assert from 'node:assert/strict';
import { describe, it } from 'vitest';
import { PhoneE164 } from './contracts';
import { formatPkPhone, formatPkPhoneInput, normalizePkPhone } from './phone';

describe('phone normalisation', () => {
  it('accepts every common Pakistani mobile format', () => {
    for (const input of [
      '03001234567',
      '0300 1234567',
      '0300-1234567',
      '+923001234567',
      '+92 300 1234567',
      '923001234567',
      '00923001234567',
      '3001234567',
      ' (0300) 123-4567 ',
    ]) {
      assert.equal(normalizePkPhone(input), '+923001234567', input);
    }
  });

  it('rejects landlines, short numbers and junk', () => {
    for (const input of [
      '0471234567',
      '030012345',
      '030012345678',
      '+14155550123',
      'abc',
      '',
      '+92 47 1234567',
    ]) {
      assert.equal(normalizePkPhone(input), null, input);
    }
  });

  it('produces values the contract accepts', () => {
    assert.ok(PhoneE164.safeParse(normalizePkPhone('0321 7654321')).success);
  });

  it('formats for display and while typing', () => {
    assert.equal(formatPkPhone('+923001234567'), '0300 1234567');
    assert.equal(formatPkPhoneInput('0300123'), '0300 123');
    assert.equal(formatPkPhoneInput('+92 300 1234567999'), '0300 1234567');
    assert.equal(formatPkPhoneInput('03'), '03');
  });
});
