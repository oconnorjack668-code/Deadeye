// src/components/video/RimAdjuster.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Play, RotateCcw, AlertTriangle } from 'lucide-react';
import {
  zoomRegionFor,
  toZoom,
  fromZoom,
  nudge,
  rimPixels,
  SMALL_RIM_PX,
  type Point,
  type ZoomRegion,
} from '@/lib/video/rimAdjust';

/** Pixels in the magnified canvas's own drawing buffer; it is shown at the width of the page. */
const ZOOM_PX = 480;

/**
 * A magnified view of the hoop with the two rim taps on it, to drag or nudge
 * onto the edges of the ring before tracking starts. See src/lib/video/rimAdjust.ts
 * for why the taps are worth getting exactly right.
 */
export function RimAdjuster({
  videoRef,
  edges,
  onChange,
  onStart,
  onRedo,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Left end first. */
  edges: [Point, Point];
  onChange: (edges: [Point, Point]) => void;
  onStart: () => void;
  onRedo: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Fixed when the view opens: a picture that moved under a dragging finger
  // could not be aimed in
  const [region, setRegion] = useState<ZoomRegion | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const [selected, setSelected] = useState<0 | 1>(0);
  const dragging = useRef<0 | 1 | null>(null);
  // Read by the drawing loop, which runs outside React's render
  const edgesRef = useRef(edges);
  const selectedRef = useRef(selected);
  useEffect(() => {
    edgesRef.current = edges;
    selectedRef.current = selected;
  }, [edges, selected]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    setSize({ w: video.videoWidth, h: video.videoHeight });
    setRegion(zoomRegionFor(edges[0], edges[1], video.videoWidth, video.videoHeight));
    // Only when the view opens: see the note on `region`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redrawn every frame so the live camera stays live in here too
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !region || !size) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    const paint = () => {
      ctx.drawImage(video, region.sx, region.sy, region.side, region.side, 0, 0, ZOOM_PX, ZOOM_PX);
      const [a, b] = edgesRef.current.map((p) => toZoom(p, region, size.w, size.h, ZOOM_PX));
      // The rim line the tracker will measure against
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      [a, b].forEach((p, i) => {
        const on = i === selectedRef.current;
        // A ring with a hole, so the edge being marked stays visible inside it
        ctx.strokeStyle = on ? '#f97316' : 'rgba(255,255,255,0.85)';
        ctx.lineWidth = on ? 3 : 2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(p.x - 22, p.y);
        ctx.lineTo(p.x - 6, p.y);
        ctx.moveTo(p.x + 6, p.y);
        ctx.lineTo(p.x + 22, p.y);
        ctx.moveTo(p.x, p.y - 22);
        ctx.lineTo(p.x, p.y - 6);
        ctx.moveTo(p.x, p.y + 6);
        ctx.lineTo(p.x, p.y + 22);
        ctx.stroke();
      });
      frame = requestAnimationFrame(paint);
    };
    paint();
    return () => cancelAnimationFrame(frame);
  }, [videoRef, region, size]);

  function canvasPoint(e: React.PointerEvent<HTMLCanvasElement>): Point {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * ZOOM_PX, y: ((e.clientY - rect.top) / rect.height) * ZOOM_PX };
  }

  function move(which: 0 | 1, to: Point) {
    const next: [Point, Point] = [edges[0], edges[1]];
    next[which] = to;
    onChange(next);
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!region || !size) return;
    const c = canvasPoint(e);
    // Whichever end is nearer is the one being moved, and it jumps to the
    // finger: the picture is big enough that a tap is already close
    const [a, b] = edges.map((p) => toZoom(p, region, size.w, size.h, ZOOM_PX));
    const which: 0 | 1 = Math.hypot(c.x - a.x, c.y - a.y) <= Math.hypot(c.x - b.x, c.y - b.y) ? 0 : 1;
    dragging.current = which;
    setSelected(which);
    e.currentTarget.setPointerCapture(e.pointerId);
    move(which, fromZoom(c, region, size.w, size.h, ZOOM_PX));
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (dragging.current === null || !region || !size) return;
    move(dragging.current, fromZoom(canvasPoint(e), region, size.w, size.h, ZOOM_PX));
  }

  function onPointerUp() {
    dragging.current = null;
  }

  function step(dx: number, dy: number) {
    if (!size) return;
    move(selected, nudge(edges[selected], dx, dy, size.w, size.h));
  }

  const across = size ? Math.round(rimPixels(edges[0], edges[1], size.w)) : null;

  return (
    <div className="space-y-3">
      <p className="text-sm text-zinc-300">
        Drag each circle onto the <strong>outside edge of the metal ring</strong>, at its widest point. Use the arrows to
        move one a pixel at a time.
      </p>

      <canvas
        ref={canvasRef}
        width={ZOOM_PX}
        height={ZOOM_PX}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="Magnified view of the hoop. Drag the circles onto the edges of the ring."
        aria-busy={!region}
        className="mx-auto block aspect-square w-full max-w-sm touch-none rounded-2xl bg-black ring-1 ring-zinc-800"
      />

      <div className="flex items-center justify-between gap-2">
        <div className="flex rounded-xl bg-zinc-900 p-1" role="group" aria-label="Which end to move">
          {(['Left', 'Right'] as const).map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setSelected(i as 0 | 1)}
              aria-pressed={selected === i}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${selected === i ? 'bg-orange-600 text-white' : 'text-zinc-400'}`}
            >
              {label} end
            </button>
          ))}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {(
            [
              [ChevronLeft, -1, 0, 'Move left'],
              [ChevronRight, 1, 0, 'Move right'],
              [ChevronUp, 0, -1, 'Move up'],
              [ChevronDown, 0, 1, 'Move down'],
            ] as const
          ).map(([Icon, dx, dy, label]) => (
            <button
              key={label}
              type="button"
              onClick={() => step(dx, dy)}
              aria-label={label}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800 text-zinc-100 active:bg-zinc-700"
            >
              <Icon className="h-5 w-5" />
            </button>
          ))}
        </div>
      </div>

      {across !== null && across < SMALL_RIM_PX && (
        <div className="flex gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-400" />
          <span>
            The hoop is small in this video, only about {across} pixels across. Some makes and misses may be called wrong,
            so check them at the end. Next time, film closer so the hoop fills more of the picture.
          </span>
        </div>
      )}

      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Button variant="secondary" size="lg" onClick={onRedo} className="gap-2">
          <RotateCcw className="h-4 w-4" /> Tap again
        </Button>
        <Button variant="primary" size="lg" onClick={onStart} className="gap-2">
          <Play className="h-4 w-4" /> Start tracking
        </Button>
      </div>
    </div>
  );
}
