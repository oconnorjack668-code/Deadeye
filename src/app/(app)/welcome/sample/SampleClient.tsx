// src/app/(app)/welcome/sample/SampleClient.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShotTracker } from '@/components/video/ShotTracker';
import { SAMPLE_POSTER, SAMPLE_RIM, SAMPLE_TRUTH, downloadSample } from '@/lib/video/sampleClip';
import { SAMPLE_TRIED_KEY, writeFlag } from '@/lib/starter';
import { track } from '@/lib/events';

export function SampleClient() {
  const [watched, setWatched] = useState(false);
  // Downloaded as soon as the page opens: a player who came here came to watch
  // it. See downloadSample for why it is not streamed.
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    downloadSample().then((url) => !cancelled && setSrc(url));
    return () => {
      cancelled = true;
    };
  }, []);

  function finished() {
    writeFlag(SAMPLE_TRIED_KEY);
    track('sample_finished');
    setWatched(true);
  }

  return (
    <div className="space-y-4">
      {src ? (
        <ShotTracker
          sample={{ src, poster: SAMPLE_POSTER, rim: SAMPLE_RIM, truth: SAMPLE_TRUTH, onStarted: () => track('sample_played'), onFinished: finished }}
        />
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element -- a fixed local poster, no resizing wanted */}
          <img src={SAMPLE_POSTER} alt="" className="w-full opacity-40" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-1.5 text-sm font-semibold text-white">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
              Loading the sample…
            </span>
          </span>
        </div>
      )}
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
