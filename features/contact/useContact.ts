'use client';

import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { ContactRequest } from '@/lib/contracts';

/** Contact form (lib/api injects the Turnstile token). */
export const useContact = () =>
  useMutation({ mutationFn: (body: Omit<ContactRequest, 'turnstileToken'>) => api.contact(body) });
