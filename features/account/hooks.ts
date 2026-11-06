'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, isApiError } from '@/lib/api';
import type {
  Address,
  AddressInput,
  AddressPatch,
  Locale,
  UpdateCustomerRequest,
} from '@/lib/contracts';
import { MY_ORDERS_KEY } from '@/features/tracking/hooks';

export { useAddresses, useMe } from '@/features/checkout/useProfile';

const ADDRESSES_KEY = ['me', 'addresses'] as const;

/** PATCH /api/me. The server stamps whatsapp_opt_in_at when opting in (source required). */
export function useUpdateMe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: UpdateCustomerRequest) => api.updateMe(body),
    onSuccess: (me) => qc.setQueryData(['me'], me),
  });
}

/** Add or edit an address; `isDefault` moves the default (one per customer). */
export function useSaveAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string | null; body: AddressInput | AddressPatch }) =>
      id ? api.updateAddress(id, body) : api.addAddress(body as AddressInput),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADDRESSES_KEY }),
  });
}

export function useDeleteAddress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteAddress(id),
    onMutate: (id) =>
      qc.setQueryData<Address[]>(ADDRESSES_KEY, (list) => list?.filter((a) => a.id !== id)),
    onSettled: () => qc.invalidateQueries({ queryKey: ADDRESSES_KEY }),
  });
}

/** Zone check before saving (§5.4): OUTSIDE_ZONE is a warning here, the address still saves. */
export async function checkZone(location: AddressInput['location']) {
  try {
    return { zone: await api.deliveryQuote({ location }), outside: false as const };
  } catch (e) {
    if (isApiError(e) && e.code === 'OUTSIDE_ZONE') return { zone: null, outside: true as const };
    throw e;
  }
}

/** Log out: the server clears the session cookie; drop everything cached about the customer. */
export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      qc.setQueryData(['me'], null);
      qc.removeQueries({ queryKey: ['me', 'addresses'] });
      qc.removeQueries({ queryKey: MY_ORDERS_KEY });
    },
  });
}

/** Language toggle → preferred_lang when logged in (guests: cookie only). Never blocks the toggle. */
export const syncPreferredLang = (preferredLang: Locale) =>
  api.updateMe({ preferredLang }).catch(() => null);

/** Only same-site paths as a post-login redirect (no `//evil.com`, no `/\evil.com`). */
export const safeNext = (next: string | null | undefined) =>
  next && next.startsWith('/') && !/^\/[/\\]/.test(next) && !next.startsWith('/login')
    ? next
    : '/account';
