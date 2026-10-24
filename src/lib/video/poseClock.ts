// src/lib/video/poseClock.ts
// Timestamps for the shared pose landmarker.
//
// MediaPipe's VIDEO mode needs strictly increasing timestamps per instance, and
// getPoseLandmarker() hands every caller the same one. The callers used to send
// performance.now() plus a counter that restarted at 0 on each analysis. A run
// ends with its stamps ahead of the real clock (the counter adds 20ms or more a
// frame while the seeks take less), so a second run started soon after - a
// retry, or the jump test after the form check - could begin below the last
// stamp. The whole graph then aborts with "Packet timestamp mismatch" on
// norm_rect, and stays broken until the page is reloaded.

let last = 0;

/**
 * The next stamp: at least `stepMs` after the previous one from anywhere, and
 * never behind the real clock. `now` is a parameter for tests.
 */
export function nextPoseTimestamp(stepMs: number, now: number = performance.now()): number {
  last = Math.max(last + Math.max(1, Math.round(stepMs)), Math.round(now));
  return last;
}

/** For tests. */
export function resetPoseClock(): void {
  last = 0;
}
