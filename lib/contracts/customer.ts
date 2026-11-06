import { z } from 'zod';
import { Id, IsoDateTime, Locale, PhoneE164 } from './common';

/** customers: the signed-in customer's own record. */
export const Customer = z.object({
  id: Id, // id
  phone: PhoneE164, // phone_e164
  name: z.string().max(80).nullable(), // name
  phoneVerifiedAt: IsoDateTime.nullable(), // phone_verified_at
  preferredLang: Locale, // preferred_lang
  whatsappOptIn: z.boolean(), // whatsapp_opt_in (default false)
  /** ADDITION: consent record (§5.4, §7): set by the server when whatsappOptIn turns on. */
  whatsappOptInAt: IsoDateTime.nullable(), // whatsapp_opt_in_at
  whatsappOptInSource: z.string().nullable(), // whatsapp_opt_in_source
  codAllowed: z.boolean(), // cod_allowed
  createdAt: IsoDateTime, // created_at
});
export type Customer = z.infer<typeof Customer>;

/** Where a WhatsApp opt-in was given (recorded with the time, §5.4). */
export const OptInSource = z.enum(['checkout', 'account', 'booking']);
export type OptInSource = z.infer<typeof OptInSource>;

export const UpdateCustomerRequest = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    preferredLang: Locale.optional(),
    whatsappOptIn: z.boolean().optional(),
    /** Required when turning whatsappOptIn on; the server stamps whatsapp_opt_in_at. */
    whatsappOptInSource: OptInSource.optional(),
  })
  .refine((b) => b.whatsappOptIn !== true || b.whatsappOptInSource !== undefined, {
    message: 'whatsappOptInSource is required when opting in',
    path: ['whatsappOptInSource'],
  });
export type UpdateCustomerRequest = z.infer<typeof UpdateCustomerRequest>;

export const OtpChannel = z.enum(['sms', 'whatsapp']);
export type OtpChannel = z.infer<typeof OtpChannel>;

/** POST /api/auth/otp/request (Turnstile; 3 per phone per 10 min). */
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

/** POST /api/auth/otp/verify */
export const OtpVerify = z.object({ phone: PhoneE164, code: z.string().regex(/^\d{6}$/) });
export type OtpVerify = z.infer<typeof OtpVerify>;

export const OtpVerifyResponse = z.object({ customer: Customer, isNew: z.boolean() });
export type OtpVerifyResponse = z.infer<typeof OtpVerifyResponse>;

/* ---------- Contact form (ADDITION) ---------- */

/** "Data deletion request" goes to staff, who anonymise the customer (§7). */
export const ContactTopic = z.enum(['feedback', 'complaint', 'data_deletion', 'other']);
export type ContactTopic = z.infer<typeof ContactTopic>;

/** POST /api/contact (Turnstile; rate-limited per phone and IP). */
export const ContactRequest = z.object({
  name: z.string().trim().min(1).max(80),
  phone: PhoneE164,
  topic: ContactTopic,
  message: z.string().trim().min(5).max(1000),
  turnstileToken: z.string(),
});
export type ContactRequest = z.infer<typeof ContactRequest>;

export const ContactResponse = z.object({ ok: z.literal(true), reference: z.string() });
export type ContactResponse = z.infer<typeof ContactResponse>;
