import { TrackFrame } from '@/components/tracking/TrackingView';
import { TrackingSkeleton } from '@/components/tracking/TrackingSkeleton';

export default function Loading() {
  return (
    <TrackFrame>
      <TrackingSkeleton />
    </TrackFrame>
  );
}
