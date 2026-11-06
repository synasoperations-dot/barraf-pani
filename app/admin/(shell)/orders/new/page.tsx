import { adminMeta } from '@/components/admin/meta';
import { ManualOrder } from '@/components/admin/ManualOrder';

export const generateMetadata = adminMeta('newOrder');

export default function Page() {
  return <ManualOrder />;
}
