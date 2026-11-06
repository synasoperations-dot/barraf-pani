import 'server-only';
import { api } from '@/lib/api';

/**
 * Server Component reads (ARCHITECTURE §2.1). Menu and deals are cached with tag `menu` (the
 * backend calls revalidateTag('menu') on change); store status is short-cached (~30 s).
 * Each returns null instead of throwing so a page can fall back to the client fetch.
 */
export const getMenu = () => api.menu({ tags: ['menu'] }).catch(() => null);

export const getDealsEvents = () => api.dealsEvents({ tags: ['menu'] }).catch(() => null);

export const getStoreStatus = () => api.storeStatus({ revalidate: 30 }).catch(() => null);
