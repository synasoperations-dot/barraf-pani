'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Logo } from '@/components/ui/Logo';
import { Drawer } from '@/components/ui/Dialog';
import { toast } from '@/components/ui/Toast';
import { LanguageToggle } from '@/components/site/LanguageToggle';
import { playBookingChime, unlockSound, useSoundUnlocked } from '@/features/admin/chime';
import { isManager, useLogout, useStaff, useStaffSettings } from '@/features/admin/session';
import { api } from '@/lib/api';
import { canOpen, sectionOf, type AdminSection } from '@/lib/admin-access';
import type { StaffRole } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';
import { ConfirmSheet } from './kit';
import { Icon, StickerIcon, type IconName } from './icons';

const NAV: { section: AdminSection; href: string; icon: IconName }[] = [
  { section: 'orders', href: '/admin/orders', icon: 'orders' },
  { section: 'bookings', href: '/admin/bookings', icon: 'bookings' },
  { section: 'kitchen', href: '/admin/kitchen', icon: 'kitchen' },
  { section: 'menu', href: '/admin/menu', icon: 'menu' },
  { section: 'deals', href: '/admin/deals', icon: 'deals' },
  { section: 'promos', href: '/admin/promos', icon: 'promos' },
  { section: 'zones', href: '/admin/zones', icon: 'zones' },
  { section: 'customers', href: '/admin/customers', icon: 'customers' },
  { section: 'refunds', href: '/admin/refunds', icon: 'refunds' },
  { section: 'riders', href: '/admin/riders', icon: 'riders' },
  { section: 'reviews', href: '/admin/reviews', icon: 'reviews' },
  { section: 'notifications', href: '/admin/notifications', icon: 'notifications' },
  { section: 'reports', href: '/admin/reports', icon: 'reports' },
  { section: 'settings', href: '/admin/settings', icon: 'settings' },
];

const COLLAPSE_KEY = 'bp-admin-sidebar';
const collapseListeners = new Set<() => void>();
const readCollapsed = () => {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === '1';
  } catch {
    return false;
  }
};
function writeCollapsed(on: boolean) {
  try {
    localStorage.setItem(COLLAPSE_KEY, on ? '1' : '0');
  } catch {}
  collapseListeners.forEach((l) => l());
}
const subscribeCollapsed = (cb: () => void) => {
  collapseListeners.add(cb);
  return () => void collapseListeners.delete(cb);
};

/** Badges: requested bookings (front of house) and dead outbox rows (managers). */
function useBadges(role: StaffRole | undefined) {
  const front = role === 'owner' || role === 'manager' || role === 'cashier';
  const bookings = useQuery({
    queryKey: ['admin', 'bookings', 'requested-count'],
    queryFn: () => api.admin.bookings(['requested']),
    enabled: front,
    refetchInterval: 15_000,
  });
  const dead = useQuery({
    queryKey: ['admin', 'outbox', 'dead-count'],
    queryFn: () => api.admin.outbox(['dead']),
    enabled: isManager(role),
    refetchInterval: 60_000,
  });
  // A new booking request plays the soft chime (once sound is unlocked) and announces it.
  const t = useTranslations('admin.shell');
  const count = bookings.data?.length ?? 0;
  const loaded = bookings.data !== undefined;
  const prev = useRef<number | null>(null);
  useEffect(() => {
    if (!loaded) return; // the first answer is the baseline, not "new"
    if (prev.current !== null && count > prev.current) {
      playBookingChime();
      toast(t('newBooking'));
    }
    prev.current = count;
  }, [count, loaded, t]);
  return { bookings: count, notifications: dead.data?.length ?? 0 } as Partial<
    Record<AdminSection, number>
  >;
}

function StoreSwitch({ role }: { role: StaffRole }) {
  const t = useTranslations('admin.shell');
  const message = useErrorMessage();
  const qc = useQueryClient();
  const settings = useStaffSettings();
  const [open, setOpen] = useState(false);
  const pause = useMutation({
    mutationFn: (body: { paused: boolean; reason: string | null }) => api.admin.pause(body),
    onSuccess: (s) => {
      qc.setQueryData(['admin', 'settings'], s);
      void qc.invalidateQueries({ queryKey: ['store', 'status'] });
      setOpen(false);
      toast(s.isAcceptingOrders ? t('resumed') : t('pausedToast'));
    },
    onError: (e) => toast(message(e)),
  });
  const accepting = settings.data?.isAcceptingOrders ?? true;
  const canToggle = isManager(role);
  return (
    <>
      <button
        type="button"
        disabled={!canToggle || !settings.data}
        onClick={() => setOpen(true)}
        aria-label={accepting ? t('acceptingAction') : t('pausedAction')}
        className={clsx(
          'inline-flex min-h-14 press items-center gap-2 rounded-button border-3 border-ink px-3 font-bold shadow-hard-sm',
          accepting ? 'bg-whatsapp text-ink' : 'bg-orange text-ink',
          !canToggle && 'cursor-default shadow-none',
        )}
      >
        <span
          aria-hidden="true"
          className={clsx(
            'size-3 rounded-full border-2 border-ink',
            accepting ? 'bg-white' : 'bg-ink',
          )}
        />
        <span className="max-sm:sr-only">{accepting ? t('accepting') : t('paused')}</span>
      </button>
      <ConfirmSheet
        open={open}
        onClose={() => setOpen(false)}
        title={accepting ? t('pauseTitle') : t('resumeTitle')}
        body={accepting ? t('pauseBody') : t('resumeBody')}
        confirmLabel={accepting ? t('pauseConfirm') : t('resumeConfirm')}
        reason={
          accepting
            ? { label: t('pauseReason'), required: true, placeholder: t('pauseReasonHint') }
            : undefined
        }
        danger={accepting}
        loading={pause.isPending}
        onConfirm={(reason) =>
          pause.mutate({ paused: accepting, reason: accepting ? reason : null })
        }
      />
    </>
  );
}

function NavList({
  role,
  collapsed,
  badges,
  onNavigate,
}: {
  role: StaffRole;
  collapsed: boolean;
  badges: Partial<Record<AdminSection, number>>;
  onNavigate?: () => void;
}) {
  const t = useTranslations('admin.nav');
  const current = sectionOf(usePathname());
  const items = NAV.filter((n) => canOpen(role, n.section));
  return (
    <ul className="grid gap-1.5">
      {items.flatMap((n) => {
        const active = current === n.section;
        const badge = badges[n.section];
        const link = (
          <li key={n.section}>
            <Link
              href={n.href}
              onClick={onNavigate}
              aria-current={active ? 'page' : undefined}
              title={collapsed ? t(n.section) : undefined}
              className={clsx(
                'relative flex min-h-14 items-center gap-3 rounded-button border-2 px-2 font-bold',
                active ? 'border-ink bg-white shadow-hard-sm' : 'border-transparent hover:bg-white',
              )}
            >
              <StickerIcon name={n.icon} active={active} />
              <span className={clsx(collapsed && 'sr-only')}>{t(n.section)}</span>
              {!!badge && (
                <span
                  className={clsx(
                    'min-w-6 rounded-full border-2 border-ink bg-orange px-1 text-center font-price text-base leading-5 text-ink',
                    collapsed ? 'absolute start-8 -top-1' : 'ms-auto',
                  )}
                >
                  <span className="sr-only">{t('badge', { count: badge })}</span>
                  <span aria-hidden="true">{badge}</span>
                </span>
              )}
            </Link>
          </li>
        );
        // "+ New order" sits right under the orders board for front of house.
        return n.section === 'orders'
          ? [
              link,
              <li key="new">
                <Link
                  href="/admin/orders/new"
                  onClick={onNavigate}
                  title={collapsed ? t('newOrder') : undefined}
                  className="flex min-h-14 press items-center gap-3 rounded-button border-3 border-ink bg-orange px-2 font-bold text-ink shadow-hard-sm"
                >
                  <span className="grid size-10 place-items-center rounded-sticker border-2 border-ink bg-white">
                    <Icon name="plus" />
                  </span>
                  <span className={clsx(collapsed && 'sr-only')}>{t('newOrder')}</span>
                </Link>
              </li>,
            ]
          : [link];
      })}
    </ul>
  );
}

function SoundButton() {
  const t = useTranslations('admin.board');
  const on = useSoundUnlocked();
  if (on) return null;
  return (
    <button
      type="button"
      onClick={() => void unlockSound()}
      className="inline-flex min-h-14 -rotate-2 press items-center gap-2 rounded-sticker border-3 border-ink bg-yellow px-3 font-bold shadow-hard-sm"
    >
      <Icon name="sound" />
      {t('enableSound')}
    </button>
  );
}

/** Sidebar (collapsible) + top bar with the store switch, sound unlock, user menu. */
export function AdminShell({ children }: { children: ReactNode }) {
  const t = useTranslations('admin');
  const staff = useStaff();
  const logout = useLogout();
  const role = staff.data?.role;
  const badges = useBadges(role);
  const collapsed = useSyncExternalStore(subscribeCollapsed, readCollapsed, () => false);
  const [drawer, setDrawer] = useState(false);
  const toggle = () => writeCollapsed(!collapsed);

  return (
    <div className="flex min-h-dvh bg-paper">
      <a
        href="#admin-main"
        className="sr-only z-50 rounded-button border-3 border-ink bg-yellow px-4 py-2 font-bold focus:not-sr-only focus:fixed focus:start-3 focus:top-3"
      >
        {t('shell.skip')}
      </a>
      <aside
        aria-label={t('nav.label')}
        className={clsx(
          'sticky top-0 hidden h-dvh shrink-0 flex-col gap-4 overflow-y-auto border-e-3 border-ink bg-blue-light/40 p-3 md:flex',
          collapsed ? 'w-20' : 'w-64',
        )}
      >
        <div className="flex items-center justify-between gap-2">
          {!collapsed && <Logo size={56} />}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}
            className="grid size-14 press place-items-center rounded-button border-3 border-ink bg-white shadow-hard-sm"
          >
            <Icon name="collapse" className={clsx(collapsed && 'rotate-180', 'rtl:-scale-x-100')} />
          </button>
        </div>
        {role && <NavList role={role} collapsed={collapsed} badges={badges} />}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-2 border-b-3 border-ink bg-white px-3 py-2 md:px-5">
          <button
            type="button"
            onClick={() => setDrawer(true)}
            className="grid size-14 press place-items-center rounded-button border-3 border-ink bg-white shadow-hard-sm md:hidden"
            aria-label={t('nav.open')}
          >
            <Icon name="menu" />
          </button>
          {role && <StoreSwitch role={role} />}
          <SoundButton />
          <div className="ms-auto flex items-center gap-2">
            <LanguageToggle />
            {staff.data && (
              <details className="relative">
                <summary className="flex min-h-14 press cursor-pointer list-none items-center gap-2 rounded-button border-3 border-ink bg-white px-3 font-bold shadow-hard-sm">
                  <span className="max-w-40 truncate">{staff.data.name}</span>
                  <span className="rounded-chip border-2 border-ink bg-yellow px-1.5 text-sm">
                    {t(`roles.${staff.data.role}`)}
                  </span>
                </summary>
                <div className="absolute end-0 z-40 mt-2 grid w-64 gap-2 rounded-card border-3 border-ink bg-white p-3 shadow-hard-md">
                  <p className="text-sm text-muted" dir="ltr">
                    {staff.data.email}
                  </p>
                  <button
                    type="button"
                    onClick={() => logout.mutate()}
                    className="flex min-h-14 press items-center gap-2 rounded-button border-3 border-ink bg-ink px-3 font-bold text-white shadow-hard-orange"
                  >
                    <Icon name="logout" className="rtl:-scale-x-100" />
                    {t('shell.logout')}
                  </button>
                </div>
              </details>
            )}
          </div>
        </header>
        <main id="admin-main" className="min-w-0 flex-1">
          {children}
        </main>
      </div>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title={t('nav.label')}>
        {role && (
          <NavList
            role={role}
            collapsed={false}
            badges={badges}
            onNavigate={() => setDrawer(false)}
          />
        )}
      </Drawer>
    </div>
  );
}
