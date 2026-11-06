import { adminMeta } from '@/components/admin/meta';
import { ReviewsAdmin } from '@/components/admin/ReviewsAdmin';

export const generateMetadata = adminMeta('reviews');

export default function Page() {
  return <ReviewsAdmin />;
}
