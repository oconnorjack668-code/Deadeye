// src/app/(app)/welcome/sample/SampleClient.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ShotTracker, type TrackerSample } from '@/components/video/ShotTracker';
import { rimFromEdges } from '@/lib/video/shotDetector';
import { SAMPLE_TRIED_KEY, writeFlag } from '@/lib/starter';

/**
 * The first 34 seconds of bench clip 16606 (README, clip bench), re-encoded to
 * 1280 wide H.264 so every phone can play it - the original is HEVC. The rim is
 * the bench's own taps. Run through the bench the way the app runs it
 * (DEADEYE_BENCH_APP=1) on 2026-10-21, this file was called 6 of 6 right:
 * makes at 4.1, 13.9, 20.3 and 25.2s, misses at 8.5 and 31.1s.
 */
const SAMPLE: Omit<TrackerSample, 'onFinished'> = {
  src: '/samples/tracker-sample.mp4',
  poster: '/samples/tracker-sample-poster.jpg',
  rim: rimFromEdges({ x: 0.5253, y: 0.2194 }, { x: 0.5865, y: 0.1991 }),
  truth: { makes: 4, attempts: 6 },
};

export function SampleClient() {
  const [watched, setWatched] = useState(false);

  function finished() {
    writeFlag(SAMPLE_TRIED_KEY);
    setWatched(true);
  }

  return (
    <div className="space-y-4">
      <ShotTracker sample={{ ...SAMPLE, onFinished: finished }} />
      {watched && (
        <div className="rounded-2xl border border-orange-600/40 bg-gradient-to-br from-orange-600/15 to-transparent p-4">
          <p className="font-bold text-white">Now try it on your own shots</p>
          <p className="mt-1 text-sm text-zinc-300">Next time you&apos;re at a court, open Track with the camera and set the phone down.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/video" className="rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500">
              Open the tracker
            </Link>
            <Link href="/dashboard" className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-900">
              Back to my dashboard
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
