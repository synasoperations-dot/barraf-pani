import { adminMeta } from '@/components/admin/meta';
import { RefundsAdmin } from '@/components/admin/RefundsAdmin';

export const generateMetadata = adminMeta('refunds');

export default function Page() {
  return <RefundsAdmin />;
}
