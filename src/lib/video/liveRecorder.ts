// src/lib/video/liveRecorder.ts
// Keeps a copy of a live-camera session on the phone while it is tracked.
//
// The live camera is the way most players use the tracker, and it was the one
// way that left nothing to look back at: no highlight reel, no way to watch a
// shot the tracker was unsure of, and no second chance when a slow phone
// scored too few frames to catch every shot. A recording gives all three. It
// never leaves the phone and is gone when the page is.
//
// Memory is the limit. A phone holds the recording until the session is saved
// or left, so it is capped by length and size, and stops quietly at the cap -
// the tracking itself carries on.
import { pickRecordingType } from './highlights';

/** Enough to see the ball and the net clearly at 1080p without filling a phone. */
export const RECORD_BITS_PER_SECOND = 3_000_000;
/** Recording stops here; tracking carries on. About 25 minutes at the bitrate above. */
export const MAX_RECORD_BYTES = 600 * 1024 * 1024;

export interface LiveRecording {
  file: File;
  /** When recording started, on the same clock as the tracking: shot times minus this are times in the file. */
  offsetMs: number;
  /** Stopped at the cap before the session ended. */
  capped: boolean;
}

export interface LiveRecorder {
  /** Stops and returns the recording, or null when nothing usable was recorded. */
  stop(): Promise<LiveRecording | null>;
  /** Abandons the recording. */
  discard(): void;
}

/**
 * Starts recording the stream, or returns null when this browser cannot.
 * `offsetMs` is the tracking clock at the moment recording starts.
 */
export function startLiveRecorder(stream: MediaStream, offsetMs: number): LiveRecorder | null {
  if (typeof MediaRecorder === 'undefined') return null;
  const type = pickRecordingType((t) => MediaRecorder.isTypeSupported(t));
  if (!type) return null;
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, { mimeType: type.mimeType, videoBitsPerSecond: RECORD_BITS_PER_SECOND });
  } catch {
    return null;
  }
  const chunks: Blob[] = [];
  let bytes = 0;
  let capped = false;
  recorder.ondataavailable = (e) => {
    if (!e.data.size) return;
    chunks.push(e.data);
    bytes += e.data.size;
    if (bytes >= MAX_RECORD_BYTES && recorder.state === 'recording') {
      capped = true;
      recorder.stop();
    }
  };
  const stopped = new Promise<void>((resolve) => recorder.addEventListener('stop', () => resolve(), { once: true }));
  try {
    // A chunk a second keeps the size check current and nothing big in flight
    recorder.start(1000);
  } catch {
    return null;
  }

  return {
    async stop() {
      if (recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // Already stopping
        }
      }
      await stopped;
      if (!chunks.length) return null;
      const blob = new Blob(chunks, { type: type.mimeType.split(';')[0] });
      chunks.length = 0;
      const file = new File([blob], `deadeye-session.${type.extension}`, { type: blob.type });
      return { file, offsetMs, capped };
    },
    discard() {
      chunks.length = 0;
      try {
        if (recorder.state !== 'inactive') recorder.stop();
      } catch {
        // Nothing to stop
      }
    },
  };
}

/**
 * Makes a browser work out the length of a recorded WebM, which MediaRecorder
 * leaves unset: Chrome reports Infinity until it has read to the end, and the
 * progress bar and the end of the clip both depend on it. Seeking far past
 * the end forces the read.
 */
export function resolveDuration(video: HTMLVideoElement): Promise<void> {
  if (Number.isFinite(video.duration)) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener('durationchange', check);
      video.currentTime = 0;
      resolve();
    };
    const check = () => {
      if (Number.isFinite(video.duration)) done();
    };
    video.addEventListener('durationchange', check);
    video.currentTime = 1e9;
    setTimeout(done, 3000);
  });
}
