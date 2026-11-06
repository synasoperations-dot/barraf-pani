import { adminMeta } from '@/components/admin/meta';
import { SettingsAdmin } from '@/components/admin/SettingsAdmin';

export const generateMetadata = adminMeta('settings');

export default function Page() {
  return <SettingsAdmin />;
}
