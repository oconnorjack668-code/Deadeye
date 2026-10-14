// src/app/(app)/admin/detector-bench/page.tsx
// Owner-only. Measures what the shot detector actually does on real footage,
// because its accuracy has never been checked against a labelled clip and the
// game-film feature should not be built on an assumption.
import React from 'react';
import { notFound } from 'next/navigation';
import { checkIsOwner } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { DetectorBench } from '@/components/video/DetectorBench';
import { Gauge } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Detector benchmark - Deadeye' };

export default async function DetectorBenchPage() {
  if (!(await checkIsOwner())) notFound();

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto">
        <PageHeader tone="hoops" icon={Gauge} title="Detector benchmark" subtitle="Measure shot detection on a real clip" />

        <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300 space-y-2">
          <p className="font-semibold text-white">How to get a useful number</p>
          <ol className="list-decimal space-y-1 pl-5 text-zinc-400">
            <li>Prop the phone on a tripod or against something solid. Do not hold it.</li>
            <li>Frame the whole hoop plus a few feet below it. Landscape.</li>
            <li>Take 10–20 shots, deliberately mixing makes and misses, and count them yourself.</li>
            <li>Load the clip, scrub to a frame showing the hoop, then press <strong>Set the rim</strong>.</li>
            <li>
              Tap the left and right edges of the ring — its widest points across, not the front and back.
              Those two taps set the detection crop and the make window, so a sloppy pair shows up as a bad
              detector. Playback stays paused while you do it.
            </li>
            <li>Run the benchmark, or the full-frame versus hoop-crop comparison.</li>
          </ol>
          <p className="text-zinc-400">
            The clip plays in real time while every frame is processed, so a two minute clip takes two minutes.
            Nothing leaves this device.
          </p>
        </div>

        <DetectorBench />
      </div>
    </div>
  );
}
