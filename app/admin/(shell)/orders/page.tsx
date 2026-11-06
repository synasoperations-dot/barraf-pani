import { adminMeta } from '@/components/admin/meta';
import { OrdersBoard } from '@/components/admin/OrdersBoard';

export const generateMetadata = adminMeta('orders');

export default function Page() {
  return <OrdersBoard />;
}
