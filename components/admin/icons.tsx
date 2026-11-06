import clsx from 'clsx';

/** 24×24 stroke icons for the staff apps (ink, 2.2px). */
const PATHS = {
  orders: 'M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6M9 12h6M9 16h4',
  plus: 'M12 5v14M5 12h14',
  bookings: 'M4 6h16v14H4V6Zm0 4h16M8 3v5M16 3v5M8 14h3v3H8v-3Z',
  kitchen: 'M6 21V11M4 4v5a2 2 0 0 0 4 0V4M6 4v5M16 21V4c2.5 1 4 3.5 4 7h-4',
  menu: 'M4 5h16v14H4V5Zm4 4h8M8 13h8M8 17h5',
  deals:
    'M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v2a2 2 0 0 0 0 4v2a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-2a2 2 0 0 0 0-4V7Zm6-1v14',
  promos: 'M4 12 12 4h8v8l-8 8-8-8Zm11-4h.01',
  zones: 'M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15',
  customers:
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-6 10a6 6 0 0 1 12 0M17 11a3 3 0 1 0 0-6M21 21a5 5 0 0 0-4-5',
  refunds: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4M12 8v4l3 2',
  riders:
    'M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM9 17h6l2-7h-4M13 6h3l1 4',
  reviews: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z',
  notifications: 'M6 16V11a6 6 0 1 1 12 0v5l2 2H4l2-2Zm4 4h4',
  reports: 'M4 20V10m6 10V4m6 16v-7m4 7H3',
  settings:
    'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.3l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-2.2-1.3L14.4 3h-4l-.4 2.4a7.4 7.4 0 0 0-2.2 1.3l-2.4-1-2 3.4 2 1.6a7.4 7.4 0 0 0 0 2.6l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 2.2 1.3l.4 2.4h4l.4-2.4a7.4 7.4 0 0 0 2.2-1.3l2.4 1 2-3.4-2-1.6c.1-.4.1-.9.1-1.3Z',
  rider:
    'M5 17a2 2 0 1 0 4 0 2 2 0 0 0-4 0Zm10 0a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM9 17h6l2-7h-4M13 6h3l1 4',
  logout: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11',
  collapse: 'M15 6l-6 6 6 6',
  phone:
    'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z',
  chat: 'M4 19.5 5.5 15A8 8 0 1 1 9 18.5L4 19.5Z',
  print: 'M7 9V3h10v6M7 17H4v-7h16v7h-3M7 14h10v7H7v-7Z',
  map: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm5-2 5 5',
  sound: 'M4 9v6h4l5 4V5L8 9H4Zm12 0a4 4 0 0 1 0 6m2-9a8 8 0 0 1 0 12',
  flag: 'M5 21V4h12l-2 4 2 4H5',
  drag: 'M9 5h.01M9 12h.01M9 19h.01M15 5h.01M15 12h.01M15 19h.01',
  up: 'M12 19V5m-6 6 6-6 6 6',
  down: 'M12 5v14m6-6-6 6-6-6',
  trash: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13',
  edit: 'M4 20h4L19 9l-4-4L4 16v4Zm10-14 4 4',
  copy: 'M8 8h12v12H8V8Zm-4 8V4h12',
  cash: 'M3 7h18v10H3V7Zm9 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 10v4m12-4v4',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={clsx('size-5 shrink-0', className)}>
      <path
        d={PATHS[name]}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Icon on a small white sticker (sidebar). */
export function StickerIcon({ name, active }: { name: IconName; active?: boolean }) {
  return (
    <span
      className={clsx(
        'grid size-10 shrink-0 place-items-center rounded-sticker border-2 border-ink',
        active ? 'bg-yellow' : 'bg-white',
      )}
    >
      <Icon name={name} />
    </span>
  );
}
