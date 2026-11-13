// src/components/video/StreakFlame.tsx
'use client';

import React, { useEffect, useRef } from 'react';
import { drawFlame } from '@/lib/video/overlayArt';

/**
 * The flame beside the score on a hot streak (3 makes in a row and up). Its
 * own small canvas and animation loop, which only exist while the streak
 * does, so a cold session costs nothing. Drawn by the same code as the flame
 * in a saved video. Holds still for reduced motion.
 */
export function StreakFlame({ heat, className }: { heat: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || heat <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    const paint = (t: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
      if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      drawFlame(ctx, w / 2, h * 0.92, w * 0.9, h * 0.85, t, heat);
      if (!still) frame = requestAnimationFrame(paint);
    };
    if (still) paint(400);
    else frame = requestAnimationFrame(paint);
    return () => cancelAnimationFrame(frame);
  }, [heat]);

  if (heat <= 0) return null;
  return <canvas ref={ref} aria-hidden="true" className={className} />;
}
