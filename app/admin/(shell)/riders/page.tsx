import { adminMeta } from '@/components/admin/meta';
import { RidersAdmin } from '@/components/admin/RidersAdmin';

export const generateMetadata = adminMeta('riders');

export default function Page() {
  return <RidersAdmin />;
}
