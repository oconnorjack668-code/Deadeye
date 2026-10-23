// src/lib/video/sampleClip.ts
// The built-in tracker clip, shared by the welcome sample (/welcome/sample)
// and the landing page demo.
import { rimFromEdges } from '@/lib/video/shotDetector';

export const SAMPLE_URL = '/samples/tracker-sample.mp4';
export const SAMPLE_POSTER = '/samples/tracker-sample-poster.jpg';

/**
 * The first 34 seconds of bench clip 16606 (README, clip bench), re-encoded to
 * 1280 wide H.264 so every phone can play it - the original is HEVC. The rim is
 * the bench's near tap and the ring's far edge: the bench's far tap
 * (0.5865, 0.1991) sat on the bracket, and the marker showed it. The far edge
 * is 0.79 of the way between those taps, the same point the promo's rim line
 * was moved to (docs/handoffs/2026-10-21-promo-rim-line-fix.md). Labels:
 * makes at 4.1, 13.9, 20.3 and 25.2s, misses at 8.5 and 31.1s. Through the
 * bench the way the app runs it (DEADEYE_BENCH_APP=1) on 2026-10-23, this file
 * was called 5 of 5 right, with the 20.3s make never called - the same as with
 * the old taps, and the makes now cross nearer the ring's centre.
 */
export const SAMPLE_RIM = rimFromEdges({ x: 0.5253, y: 0.2194 }, { x: 0.5736, y: 0.2034 });
export const SAMPLE_TRUTH = { makes: 4, attempts: 6 };

let download: Promise<string> | null = null;

/**
 * The whole clip, downloaded before it is played, as an object URL. Streamed
 * from the site, playback stuttered around the first make (4s in) and the
 * tracker missed it: in phone-sized test runs on 21 Oct 2026 the live site
 * called 3/5 in three runs of four, while the same clip served locally was
 * right four times out of four. Played from memory there is nothing to wait
 * for. Fetched once per page; streaming is the fallback.
 */
export function downloadSample(): Promise<string> {
  download ??= fetch(SAMPLE_URL)
    .then((res) => (res.ok ? res.blob() : Promise.reject(new Error(String(res.status)))))
    .then((blob) => URL.createObjectURL(blob))
    .catch(() => SAMPLE_URL);
  return download;
}
