import { LegalPage, legalMetadata } from '@/components/legal/LegalPage';

export const generateMetadata = () => legalMetadata('refunds');

export default function Page() {
  return <LegalPage doc="refunds" />;
}
