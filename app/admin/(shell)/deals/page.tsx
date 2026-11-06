import { adminMeta } from '@/components/admin/meta';
import { DealsAdmin } from '@/components/admin/DealsAdmin';

export const generateMetadata = adminMeta('deals');

export default function Page() {
  return <DealsAdmin />;
}
