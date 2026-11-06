import { adminMeta } from '@/components/admin/meta';
import { PromosAdmin } from '@/components/admin/PromosAdmin';

export const generateMetadata = adminMeta('promos');

export default function Page() {
  return <PromosAdmin />;
}
