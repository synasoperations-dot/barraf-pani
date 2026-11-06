'use client';

import { useMutation } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { UPLOAD_MAX_BYTES, UPLOAD_TYPES } from '@/lib/contracts';
import { useErrorMessage } from '@/lib/errors';

/** Client-side pre-check only (§7 Uploads); the server checks MIME + signature and re-encodes. */
export function checkFile(file: { size: number; type: string }) {
  if (!(UPLOAD_TYPES as readonly string[]).includes(file.type)) return 'type' as const;
  if (file.size > UPLOAD_MAX_BYTES) return 'size' as const;
  return null;
}

/**
 * Pick → crop to the site ratio (1:1 menu cards, 4:3 event posters) with zoom + offset →
 * upload. The output is re-drawn on a canvas, which also strips EXIF before it leaves the device.
 */
export function ImageUpload({
  value,
  onChange,
  ratio = 1,
  label,
}: {
  value: string | null;
  onChange: (path: string | null) => void;
  /** width / height */
  ratio?: number;
  label: string;
}) {
  const t = useTranslations('admin.upload');
  const message = useErrorMessage();
  const id = useId();
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const canvas = useRef<HTMLCanvasElement>(null);
  const img = useRef<HTMLImageElement | null>(null);
  const W = 800;
  const H = Math.round(W / ratio);

  // Draw the crop preview whenever the framing changes.
  useEffect(() => {
    const c = canvas.current;
    const i = img.current;
    if (!c || !i || !src) return;
    const ctx = c.getContext('2d')!;
    const scale = Math.max(W / i.naturalWidth, H / i.naturalHeight) * zoom;
    const w = i.naturalWidth * scale;
    const h = i.naturalHeight * scale;
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(i, ((W - w) * x) / 100, ((H - h) * y) / 100, w, h);
  }, [src, zoom, x, y, W, H]);

  const upload = useMutation({
    mutationFn: (dataUrl: string) => api.admin.upload({ fileName: `upload.webp`, dataUrl }),
    onSuccess: ({ path }) => {
      onChange(path);
      setSrc(null);
    },
    onError: (e) => setError(message(e)),
  });

  const pick = (file: File | undefined) => {
    setError(null);
    if (!file) return;
    const bad = checkFile(file);
    if (bad) return setError(t(bad === 'type' ? 'badType' : 'tooBig'));
    const reader = new FileReader();
    reader.onload = () => {
      const i = new Image();
      i.onload = () => {
        img.current = i;
        setZoom(1);
        setX(50);
        setY(50);
        setSrc(String(reader.result));
      };
      i.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="grid gap-2">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <p className="text-sm text-muted">{t('rules', { mb: UPLOAD_MAX_BYTES / 1024 / 1024 })}</p>
      <input
        id={id}
        type="file"
        accept={UPLOAD_TYPES.join(',')}
        onChange={(e) => pick(e.target.files?.[0])}
        className="min-h-14 rounded-input border-3 border-dashed border-ink bg-paper p-3 text-sm file:me-3 file:min-h-11 file:rounded-button file:border-2 file:border-ink file:bg-yellow file:px-3 file:font-bold"
      />
      {error && (
        <p role="alert" className="text-sm font-bold">
          {error}
        </p>
      )}
      {src && (
        <div className="grid gap-3 rounded-input border-3 border-ink bg-white p-3">
          <canvas
            ref={canvas}
            width={W}
            height={H}
            className="w-full rounded-sticker border-2 border-ink"
            aria-label={t('preview')}
          />
          <label className="grid gap-1 text-sm font-bold">
            {t('zoom')}
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            {t('horizontal')}
            <input
              type="range"
              min={0}
              max={100}
              value={x}
              onChange={(e) => setX(Number(e.target.value))}
            />
          </label>
          <label className="grid gap-1 text-sm font-bold">
            {t('vertical')}
            <input
              type="range"
              min={0}
              max={100}
              value={y}
              onChange={(e) => setY(Number(e.target.value))}
            />
          </label>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setSrc(null)}>
              {t('cancel')}
            </Button>
            <Button
              className="flex-1"
              loading={upload.isPending}
              onClick={() =>
                canvas.current && upload.mutate(canvas.current.toDataURL('image/webp', 0.85))
              }
            >
              {t('use')}
            </Button>
          </div>
        </div>
      )}
      {value && !src && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element -- local data/storage preview, not a page image */}
          <img
            src={value}
            alt=""
            className="size-20 rounded-sticker border-2 border-ink object-cover"
          />
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            {t('remove')}
          </Button>
        </div>
      )}
    </div>
  );
}
