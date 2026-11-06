import { adminMeta } from '@/components/admin/meta';
import { BookingsAdmin } from '@/components/admin/BookingsAdmin';

export const generateMetadata = adminMeta('bookings');

export default function Page() {
  return <BookingsAdmin />;
}
