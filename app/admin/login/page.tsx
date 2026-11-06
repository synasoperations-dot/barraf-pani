import { adminMeta } from '@/components/admin/meta';
import { Suspense } from 'react';
import { StaffLogin } from '@/components/admin/StaffLogin';

export const generateMetadata = adminMeta('login');

export default function StaffLoginPage() {
  return (
    <Suspense>
      <StaffLogin />
    </Suspense>
  );
}
