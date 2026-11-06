import { adminMeta } from '@/components/admin/meta';
import { ZonesAdmin } from '@/components/admin/ZonesAdmin';

export const generateMetadata = adminMeta('zones');

export default function Page() {
  return <ZonesAdmin />;
}
