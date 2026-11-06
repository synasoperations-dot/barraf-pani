import { adminMeta } from '@/components/admin/meta';
import { ReportsAdmin } from '@/components/admin/ReportsAdmin';

export const generateMetadata = adminMeta('reports');

export default function Page() {
  return <ReportsAdmin />;
}
