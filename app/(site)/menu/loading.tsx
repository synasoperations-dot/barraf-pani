import { MenuSkeleton } from '@/components/menu/boards';

/** Instant feedback while the server reads the menu (slow networks). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 pb-16">
      <MenuSkeleton />
    </div>
  );
}
