'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { api, isApiError } from '@/lib/api';
import { canOpen, ROLE_HOME, type AdminSection } from '@/lib/admin-access';
import type { StaffRole } from '@/lib/contracts';

export const staffKey = ['admin', 'me'] as const;

/**
 * The logged-in staff member. proxy.ts already redirects guests and wrong roles; this is the
 * client-side twin for a session that expired while the screen was open.
 */
export function useStaff(section?: AdminSection) {
  const router = useRouter();
  const query = useQuery({
    queryKey: staffKey,
    queryFn: () => api.admin.me(),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const role = query.data?.role;

  useEffect(() => {
    if (isApiError(query.error) && query.error.code === 'UNAUTHENTICATED')
      router.replace(`/admin/login?next=${encodeURIComponent(window.location.pathname)}`);
    else if (role && section && !canOpen(role, section)) router.replace(ROLE_HOME[role]);
  }, [query.error, role, section, router]);

  return query;
}

export function useLogout() {
  const qc = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: () => api.admin.logout(),
    onSettled: () => {
      qc.clear();
      router.replace('/admin/login');
    },
  });
}

/** Store timings every staff screen needs (auto-reject, manager alert, pre-order release). */
export function useStaffSettings() {
  return useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: () => api.admin.settings(),
    staleTime: 60_000,
  });
}

export const isManager = (role: StaffRole | undefined) => role === 'owner' || role === 'manager';
