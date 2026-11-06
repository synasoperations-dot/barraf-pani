import { Skeleton } from '@/components/ui/states';

/** Loading strip: header + four panel placeholders in the same grid (no layout jump). */
export function TrackingSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-11 w-64" />
          <Skeleton className="h-7 w-40 rounded-full" />
        </div>
        <Skeleton className="h-28 w-40 rounded-sticker" />
      </div>
      <div className="grid gap-5 md:grid-cols-2 md:gap-6">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-60 rounded-card" />
        ))}
      </div>
    </div>
  );
}
