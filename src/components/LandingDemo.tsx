// src/components/LandingDemo.tsx
// The real shot tracker on the landing page, running on the built-in sample
// clip (src/lib/video/sampleClip.ts), so a visitor sees it work before signing
// up. The clip (3.6 MB) downloads only when play is pressed, as the promo does.
'use client';

import React from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { SAMPLE_POSTER, SAMPLE_RIM, SAMPLE_TRUTH, downloadSample } from '@/lib/video/sampleClip';
import { markFromDemo } from '@/lib/events';

// Browser-only (canvas and video frames), and most visitors never press play
const ShotTracker = dynamic(() => import('@/components/video/ShotTracker').then((m) => m.ShotTracker), {
  ssr: false,
  loading: () => (
    // eslint-disable-next-line @next/next/no-img-element -- a fixed local poster, no resizing wanted
    <img src={SAMPLE_POSTER} alt="" className="w-full rounded-2xl border border-zinc-800 opacity-40" />
  ),
});

export function LandingDemo({ signedIn }: { signedIn: boolean }) {
  // Under the verdict, not below the shot list: on a phone the list pushes
  // anything after it a long scroll away
  const cta = (
    <div className="rounded-2xl border border-orange-600/40 bg-gradient-to-br from-orange-600/15 to-transparent p-4">
      <p className="font-bold text-white">Now track your own shots</p>
      <p className="mt-1 text-sm text-zinc-300">
        Prop your phone up at any court, tap the two sides of the rim, and shoot. It&apos;s free to start.
      </p>
      <Link
        href={signedIn ? '/video' : '/signup'}
        onClick={signedIn ? undefined : markFromDemo}
        className="mt-3 flex h-12 items-center justify-center rounded-xl bg-orange-600 font-semibold text-white hover:bg-orange-500"
      >
        {signedIn ? 'Open the tracker' : 'Create a free account'}
      </Link>
    </div>
  );

  return <ShotTracker sample={{ src: downloadSample, poster: SAMPLE_POSTER, rim: SAMPLE_RIM, truth: SAMPLE_TRUTH, cta }} />;
}
