import { adminMeta } from '@/components/admin/meta';
import { NotificationsAdmin } from '@/components/admin/NotificationsAdmin';

export const generateMetadata = adminMeta('notifications');

export default function Page() {
  return <NotificationsAdmin />;
}
