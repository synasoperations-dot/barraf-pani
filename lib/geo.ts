import type { DeliveryZone, GeoPoint, LngLat } from '@/lib/contracts';

/** Ray-casting point-in-polygon on a [lng, lat] ring. */
export function inPolygon({ lat, lng }: GeoPoint, ring: LngLat[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Shoelace area in degrees² (only used to compare zones, so the unit doesn't matter). */
export function ringArea(ring: LngLat[]) {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
    a += (ring[j]![0] + ring[i]![0]) * (ring[j]![1] - ring[i]![1]);
  return Math.abs(a / 2);
}

/**
 * resolve_zone (§4.1, §5.9): active zones that cover the pin, ordered by priority (high first),
 * then the smallest area. The first one wins; the rest explain the decision in the admin.
 */
export function rankZones(point: GeoPoint, zones: DeliveryZone[]) {
  return zones
    .filter((z) => z.isActive && inPolygon(point, z.polygon))
    .sort((a, b) => b.priority - a.priority || ringArea(a.polygon) - ringArea(b.polygon));
}
