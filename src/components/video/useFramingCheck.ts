// src/components/video/useFramingCheck.ts
'use client';

import { useEffect, useState } from 'react';
import { rimFromEdges, type Rim } from '@/lib/video/shotDetector';
import { cropRectFor } from '@/lib/video/crop';
import { checkFraming, type FramingCheck } from '@/lib/video/framing';
import type { Point } from '@/lib/video/rimAdjust';

/** Side of the small hoop picture the check reads, px. */
const CHECK_PX = 160;
/** Wait for the ends to stop moving before looking, ms. */
const SETTLE_MS = 350;
/** Gap between the two looks that tell a steady phone from a moving one, ms. */
const STEADY_GAP_MS = 600;

interface Grab {
  pixels: Uint8ClampedArray;
  rim: Rim;
  w: number;
  h: number;
}

function grab(video: HTMLVideoElement | null, edges: [Point, Point]): Grab | null {
  if (!video?.videoWidth) return null;
  const rim = rimFromEdges(edges[0], edges[1]);
  const crop = cropRectFor(rim, video.videoWidth, video.videoHeight);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = CHECK_PX;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(video, crop.sx, crop.sy, crop.side, crop.side, 0, 0, CHECK_PX, CHECK_PX);
  return { pixels: ctx.getImageData(0, 0, CHECK_PX, CHECK_PX).data, rim, w: video.videoWidth, h: video.videoHeight };
}

/**
 * The framing check (src/lib/video/framing.ts) on the picture as set up, once
 * the rim is marked: null while looking, or not looking. On the live camera
 * it looks twice, a moment apart, to see whether the phone is steady.
 */
export function useFramingCheck(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  edges: [Point, Point] | null,
  active: boolean,
  live: boolean
): FramingCheck[] | null {
  const [result, setResult] = useState<{ for: [Point, Point]; checks: FramingCheck[] } | null>(null);

  useEffect(() => {
    if (!active || !edges) return;
    let cancelled = false;
    let second: ReturnType<typeof setTimeout> | null = null;
    const first = setTimeout(() => {
      const a = grab(videoRef.current, edges);
      if (!a || cancelled) return;
      const done = (later: Uint8ClampedArray | null) => {
        if (!cancelled) {
          setResult({ for: edges, checks: checkFraming({ rim: a.rim, videoWidth: a.w, videoHeight: a.h, crop: a.pixels, cropPx: CHECK_PX, later }) });
        }
      };
      if (live) second = setTimeout(() => done(grab(videoRef.current, edges)?.pixels ?? null), STEADY_GAP_MS);
      else done(null);
    }, SETTLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(first);
      if (second) clearTimeout(second);
    };
  }, [videoRef, edges, active, live]);

  // A result for ends that have since moved is stale: say "checking" instead
  return active && result && edges && result.for === edges ? result.checks : null;
}
