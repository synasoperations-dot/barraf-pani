import { adminMeta } from '@/components/admin/meta';
import { CustomersAdmin } from '@/components/admin/CustomersAdmin';

export const generateMetadata = adminMeta('customers');

export default function Page() {
  return <CustomersAdmin />;
}
