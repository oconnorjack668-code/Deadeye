// src/lib/video/frameStep.ts
// Picks the video times to sample when analysing a clip frame by frame instead
// of playing it.
//
// Playing at 1x and inferring on whatever frames arrive measured 14.3 fps on
// real footage, so on 30 fps video less than half the frames were ever looked
// at. Near the rim that left about three frames per shot - too few to watch the
// ball cross it, which is why every call in that run came back "inferred"
// rather than seen. Seeking to each time in turn decouples how many frames get
// analysed from how fast inference runs: it takes longer than the clip, and
// sees everything.

/** 30 fps: the common case for phone video, and the step everything else rounds to. */
export const DEFAULT_STEP_MS = 1000 / 30;

/**
 * Most samples one pass will take.
 *
 * Each sample is a seek plus a decode plus an inference, so a long clip at full
 * rate would run for many minutes. Past this the step widens instead, which
 * degrades the measurement rather than hanging the page - and a player who fed
 * in a half-hour recording still gets a result.
 */
export const MAX_SAMPLES = 3000;

/**
 * The times to sample, in milliseconds from the start.
 *
 * Sampling at a fixed 30 fps rather than the clip's own frame rate is
 * deliberate: the rate is not reliably exposed by HTMLVideoElement, and the aim
 * is more samples than real-time playback managed, not exact frame alignment.
 * On 60 fps footage this sees every other frame, still far more than before; on
 * 24 fps it lands on some frames twice, which costs an inference and changes
 * nothing, because ShotDetector reasons in time rather than frame counts.
 */
export function sampleTimesMs(durationMs: number, stepMs: number = DEFAULT_STEP_MS): number[] {
  if (!Number.isFinite(durationMs) || durationMs <= 0) return [];
  if (!Number.isFinite(stepMs) || stepMs <= 0) return [];
  // Widen the step if a full-rate pass would run past the cap
  const step = Math.max(stepMs, durationMs / MAX_SAMPLES);
  const times: number[] = [];
  for (let t = 0; t < durationMs && times.length < MAX_SAMPLES; t += step) {
    times.push(t);
  }
  return times;
}

/** How long a pass will take, given a measured seconds-per-sample. */
export function estimatedPassMs(samples: number, msPerSample: number): number {
  return samples * msPerSample;
}

/**
 * Whether a seek failed to move the playhead on.
 *
 * A browser serves `currentTime = t` from the nearest decodable position, so a
 * step finer than the clip's real frame interval can land back on the frame
 * just processed. Harmless once, but a loop that waits for progress that never
 * comes would hang the pass, so the caller counts these and stops.
 */
export function seekMadeProgress(beforeMs: number, afterMs: number): boolean {
  return afterMs > beforeMs + 0.5;
}
