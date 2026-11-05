import { z } from 'zod';
import { Id, IsoDateTime, Locale, PhoneE164 } from './common';

/** The signed-in customer's own record. */
export const Customer = z.object({
  id: Id,
  phone: PhoneE164,
  name: z.string().max(80).nullable(),
  phoneVerified: z.boolean(),
  preferredLang: Locale,
  whatsappOptIn: z.boolean(),
  codAllowed: z.boolean(),
  createdAt: IsoDateTime,
});
export type Customer = z.infer<typeof Customer>;

export const UpdateCustomerRequest = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  preferredLang: Locale.optional(),
  whatsappOptIn: z.boolean().optional(),
});
export type UpdateCustomerRequest = z.infer<typeof UpdateCustomerRequest>;

export const OtpChannel = z.enum(['sms', 'whatsapp']);
export type OtpChannel = z.infer<typeof OtpChannel>;

export const OtpRequest = z.object({
  phone: PhoneE164,
  channel: OtpChannel,
  turnstileToken: z.string(),
});
export type OtpRequest = z.infer<typeof OtpRequest>;

export const OtpRequestResponse = z.object({
  expiresInSeconds: z.number().int().positive(),
  resendInSeconds: z.number().int().nonnegative(),
});
export type OtpRequestResponse = z.infer<typeof OtpRequestResponse>;

export const OtpVerify = z.object({
  phone: PhoneE164,
  code: z.string().regex(/^\d{6}$/),
});
export type OtpVerify = z.infer<typeof OtpVerify>;

export const OtpVerifyResponse = z.object({ customer: Customer, isNew: z.boolean() });
export type OtpVerifyResponse = z.infer<typeof OtpVerifyResponse>;
