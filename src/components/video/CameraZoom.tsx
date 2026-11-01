// src/components/video/CameraZoom.tsx
'use client';

import React from 'react';
import { ZoomIn } from 'lucide-react';
import type { ZoomRange } from '@/lib/video/cameraControls';

/**
 * The live camera's zoom, for phones that allow it from the browser (see
 * src/lib/video/cameraControls.ts). Shown only before the rim is tapped:
 * zooming moves the hoop in the picture, so taps made before it are wrong.
 */
export function CameraZoom({ range, value, onChange }: { range: ZoomRange; value: number; onChange: (zoom: number) => void }) {
  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
      <label htmlFor="camera-zoom" className="flex items-center justify-between gap-2 text-sm text-zinc-300">
        <span className="flex items-center gap-2">
          <ZoomIn className="h-4 w-4 text-orange-400" /> Zoom
        </span>
        <span className="font-semibold tabular-nums text-white">{value.toFixed(1)}×</span>
      </label>
      <input
        id="camera-zoom"
        type="range"
        min={range.min}
        max={range.max}
        step={range.step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-11 w-full accent-orange-500"
      />
      <p className="text-xs text-zinc-500">
        Zoom until the ring is big in the picture, with room above it for the ball coming down.
      </p>
    </div>
  );
}
