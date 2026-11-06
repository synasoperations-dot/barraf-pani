import { adminMeta } from '@/components/admin/meta';
import { MenuAdmin } from '@/components/admin/MenuAdmin';

export const generateMetadata = adminMeta('menu');

export default function Page() {
  return <MenuAdmin />;
}
