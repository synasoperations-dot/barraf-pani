'use client';

import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import type { DeliveryZone, GeoPoint, LngLat } from '@/lib/contracts';

/**
 * The interface any map provider must satisfy (Google Maps / Mapbox later, §10). The SVG canvas
 * below is the mock implementation: equirectangular, fine at city scale.
 */
export interface ZoneMapProps {
  zones: DeliveryZone[];
  /** Zone whose ring is being edited (vertices draggable; click the map to add one). */
  editingId: string | null;
  /** Closed ring ([lng, lat], first = last). */
  onRingChange: (ring: LngLat[]) => void;
  /** Pin from "Check an address". */
  probe?: GeoPoint | null;
  className?: string;
}

const W = 640;
const H = 480;
const PAD = 0.01;

export function SvgZoneMap({ zones, editingId, onRingChange, probe, className }: ZoneMapProps) {
  const t = useTranslations('admin.zones');
  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const all = zones.flatMap((z) => z.polygon);
  const lngs = all.map((p) => p[0]);
  const lats = all.map((p) => p[1]);
  const box = {
    minLng: Math.min(...lngs, probe?.lng ?? Infinity) - PAD,
    maxLng: Math.max(...lngs, probe?.lng ?? -Infinity) + PAD,
    minLat: Math.min(...lats, probe?.lat ?? Infinity) - PAD,
    maxLat: Math.max(...lats, probe?.lat ?? -Infinity) + PAD,
  };
  const x = (lng: number) => ((lng - box.minLng) / (box.maxLng - box.minLng)) * W;
  const y = (lat: number) => H - ((lat - box.minLat) / (box.maxLat - box.minLat)) * H;
  const toLngLat = (cx: number, cy: number): LngLat => {
    const r = svg.current!.getBoundingClientRect();
    const px = ((cx - r.left) / r.width) * W;
    const py = ((cy - r.top) / r.height) * H;
    const round = (n: number) => Math.round(n * 1e5) / 1e5;
    return [
      round(box.minLng + (px / W) * (box.maxLng - box.minLng)),
      round(box.minLat + ((H - py) / H) * (box.maxLat - box.minLat)),
    ];
  };
  const editing = zones.find((z) => z.id === editingId) ?? null;
  const open = editing ? editing.polygon.slice(0, -1) : []; // vertices without the closing repeat
  const close = (pts: LngLat[]) => [...pts, pts[0]!];

  return (
    <svg
      ref={svg}
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={t('mapLabel')}
      className={clsx('w-full touch-none rounded-card border-3 border-ink grid-paper', className)}
      onPointerMove={(e) => {
        if (drag === null || !editing) return;
        const next = [...open];
        next[drag] = toLngLat(e.clientX, e.clientY);
        onRingChange(close(next));
      }}
      onPointerUp={() => setDrag(null)}
      onClick={(e) => {
        if (!editing || drag !== null || e.target !== e.currentTarget) return;
        onRingChange(close([...open, toLngLat(e.clientX, e.clientY)]));
      }}
    >
      {[...zones]
        .sort((a, b) => a.priority - b.priority)
        .map((z) => (
          <g key={z.id}>
            <polygon
              points={z.polygon.map(([lng, lat]) => `${x(lng)},${y(lat)}`).join(' ')}
              className={clsx(
                'stroke-ink',
                z.id === editingId
                  ? 'fill-yellow/50'
                  : z.isActive
                    ? 'fill-blue-light/50'
                    : 'fill-grid-line/50',
              )}
              strokeWidth={z.id === editingId ? 4 : 2.5}
              strokeDasharray={z.isActive ? undefined : '8 6'}
              pointerEvents="none"
            />
            <text
              x={x(z.polygon[0]![0]) + 8}
              y={y(z.polygon[0]![1]) - 8}
              className="fill-ink text-sm font-bold"
              pointerEvents="none"
            >
              {z.name}
            </text>
          </g>
        ))}
      {editing &&
        open.map(([lng, lat], i) => (
          <circle
            key={i}
            cx={x(lng)}
            cy={y(lat)}
            r={11}
            className="cursor-grab fill-white stroke-ink"
            strokeWidth={3}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.target as Element).setPointerCapture(e.pointerId);
              setDrag(i);
            }}
            onDoubleClick={(e) => {
              e.stopPropagation();
              if (open.length > 3) onRingChange(close(open.filter((_, j) => j !== i)));
            }}
          />
        ))}
      {probe && (
        <g pointerEvents="none">
          <circle
            cx={x(probe.lng)}
            cy={y(probe.lat)}
            r={10}
            className="fill-orange stroke-ink"
            strokeWidth={3}
          />
          <circle cx={x(probe.lng)} cy={y(probe.lat)} r={3} className="fill-ink" />
        </g>
      )}
    </svg>
  );
}
