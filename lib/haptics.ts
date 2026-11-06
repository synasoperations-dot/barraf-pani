/**
 * A short buzz on supporting phones (Android Chrome; iOS Safari ignores it). Used on
 * add-to-cart and order placed. Skipped under "reduce motion".
 */
export function haptic(pattern: number | number[] = 12) {
  if (typeof navigator === 'undefined' || !('vibrate' in navigator)) return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  try {
    navigator.vibrate(pattern);
  } catch {}
}
