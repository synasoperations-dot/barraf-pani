'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { api, isApiError } from '@/lib/api';
import type { Customer, OtpChannel } from '@/lib/contracts';

/**
 * Phone OTP (§7): request → enter 6 digits → verified (session cookie set by the server).
 * Exposes the resend countdown and the RATE_LIMITED Retry-After lockout as seconds left.
 * Used by checkout (first COD order) and Find my order. Test code in mocks: 123456.
 */
export function useOtpFlow() {
  const qc = useQueryClient();
  const [phone, setPhone] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [verified, setVerified] = useState<Customer | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const ticking = (resendAt ?? 0) > now || (lockedUntil ?? 0) > now;
  useEffect(() => {
    if (!ticking) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ticking]);

  const request = useMutation({
    mutationFn: (v: { phone: string; channel?: OtpChannel }) =>
      api.requestOtp({ phone: v.phone, channel: v.channel ?? 'sms' }),
    onSuccess: (res, v) => {
      setPhone(v.phone);
      setResendAt(Date.now() + res.resendInSeconds * 1000);
      setNow(Date.now());
    },
    onError: (e) => {
      if (isApiError(e) && e.code === 'RATE_LIMITED') {
        const secs = e.retryAfter ?? Number(e.details?.retryAfter ?? 60);
        setLockedUntil(Date.now() + secs * 1000);
        setNow(Date.now());
      }
    },
  });

  const verify = useMutation({
    mutationFn: (code: string) => api.verifyOtp({ phone: phone!, code }),
    onSuccess: (res) => {
      setVerified(res.customer);
      void qc.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (e) => {
      if (isApiError(e) && e.code === 'RATE_LIMITED') {
        setLockedUntil(Date.now() + (e.retryAfter ?? 60) * 1000);
        setNow(Date.now());
      }
    },
  });

  const secondsUntil = (t: number | null) => (t && t > now ? Math.ceil((t - now) / 1000) : 0);

  return {
    /** The phone the code was sent to (null until requested). */
    sentTo: phone,
    request,
    verify,
    verified,
    resendIn: secondsUntil(resendAt),
    lockedFor: secondsUntil(lockedUntil),
    reset: () => {
      setPhone(null);
      setResendAt(null);
      setVerified(null);
      request.reset();
      verify.reset();
    },
  };
}
