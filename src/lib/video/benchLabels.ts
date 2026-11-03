// src/lib/video/benchLabels.ts
// Turns a checked session into a labelled clip for the tracker's test bench
// (scripts/bench-suite.mjs), so the owner's ordinary sessions become test
// clips without labelling anything by hand.
//
// The labels are the shot list as corrected in review: the tracker's calls
// with every wrong one fixed. A shot the tracker never saw, added by hand, has
// no time in the video (it is stamped with the end of the run), so it is left
// out and counted; its time can be added to the file by watching the clip.
// Owner-only, and the owner's own footage: players' videos never leave their
// phones.
import type { Rim } from './shotDetector';
import { rimYAt } from './shotDetector';

export interface BenchClip {
  id: string;
  file: string;
  note: string;
  /** The two rim taps, x,y,x,y as fractions of the frame. */
  rim: [number, number, number, number];
  /** Seconds into the video. */
  makes: number[];
  attempts: number[];
  /** Shots added by hand, with no time in the video. */
  untimed: number;
}

export function benchClip({
  shots,
  rim,
  toVideoMs,
  id,
  extension,
  note,
}: {
  shots: ReadonlyArray<{ t: number; made: boolean; called: unknown }>;
  rim: Rim;
  /** A shot's time as its time in the video (ShotTracker's inVideo). */
  toVideoMs: (t: number) => number;
  /** A name for the clip, e.g. "owner-2026-11-03-1830". */
  id: string;
  extension: string;
  note: string;
}): BenchClip {
  const timed = shots.filter((s) => s.called !== null);
  const sec = (t: number) => Math.round(Math.max(0, toVideoMs(t)) / 50) / 20;
  const left = rim.x - rim.width / 2;
  const right = rim.x + rim.width / 2;
  const r4 = (v: number) => Math.round(v * 10000) / 10000;
  return {
    id,
    file: `${id}.${extension}`,
    note,
    rim: [r4(left), r4(rimYAt(rim, left)), r4(right), r4(rimYAt(rim, right))],
    makes: timed.filter((s) => s.made).map((s) => sec(s.t)),
    attempts: timed.map((s) => sec(s.t)),
    untimed: shots.length - timed.length,
  };
}
