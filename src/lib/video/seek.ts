// src/lib/video/seek.ts
// Moving a video element to a given time, without the ways that hang.
//
// Three places stepped through footage by setting currentTime and awaiting the
// "seeked" event, and two of them did it with no timeout and no error
// listener. A clip the browser cannot seek in - a stream with no index, a
// partly written file, a decode failure - never fires "seeked", so the promise
// never settles and the analysis sits there forever with no error and no end.
// Form check and the jump test could both hang that way.
//
// Resolving false rather than rejecting is deliberate: these are awaited inside
// loops in async functions that mostly have no catch around them, and an
// unhandled rejection would replace a visible hang with an invisible one.

/** Long enough for a slow decode, short enough that a stuck clip gives up. */
export const SEEK_TIMEOUT_MS = 5000;

/**
 * Moves `video` to `seconds` and waits for it to land.
 *
 * Returns true when the seek completed, false when it timed out or the element
 * reported an error. Both listeners and the timer are cleared on every path, so
 * a long run cannot accumulate handlers on the element.
 */
export function seekTo(video: HTMLVideoElement, seconds: number, timeoutMs = SEEK_TIMEOUT_MS): Promise<boolean> {
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok: boolean) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      resolve(ok);
    };
    const onSeeked = () => done(true);
    const onError = () => done(false);
    // Declared before the listeners are attached so `done` can always clear it
    const timer = setTimeout(() => done(false), timeoutMs);

    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    // Clamped inside the clip: seeking past the end on some browsers lands
    // without ever firing "seeked"
    video.currentTime = Math.max(0, Math.min(seconds, (video.duration || seconds) - 0.01));
  });
}
