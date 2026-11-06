import { redirect } from 'next/navigation';

/** proxy.ts sends each role to its home; this is the fallback. */
export default function AdminIndex() {
  redirect('/admin/orders');
}
