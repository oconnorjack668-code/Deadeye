// src/components/video/DetectorBench.tsx
'use client';

import React, { useRef, useState } from 'react';
import { createBallDetector, createDiagnosticDetector, getActiveDelegate } from '@/lib/video/mediapipe';
import type { Detection, ObjectDetector } from '@mediapipe/tasks-vision';
import {
  ShotDetector,
  rimFromEdges,
  rimTapProblem,
  rimYAt,
  rimTiltDegrees,
  type DetectedShot,
  type Rim,
} from '@/lib/video/shotDetector';
import { sampleTimesMs, seekMadeProgress } from '@/lib/video/frameStep';
import { findBall, expectedBallDiameter } from '@/lib/video/motionBall';
import { cropRectFor, ballCentreInFrame, magnification, CROP_CANVAS_PX } from '@/lib/video/crop';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { FileVideo, Play, Search, Crosshair } from 'lucide-react';

/** Mirrors LOST_BALL_MS in shotDetector: a gap longer than this turns an armed
 *  shot into a miss, so gaps are the statistic that predicts false misses. */
const LOST_BALL_MS = 1500;

/** How a single pass over the clip ended. Anything but 'ended' is partial. */
type SweepEnd = 'ended' | 'paused' | 'stalled';

/** No frame for this long means the pass is stuck and will never finish. */
const STALL_MS = 8000;

/** How long to wait for one seek before giving up on the clip. */
const SEEK_TIMEOUT_MS = 5000;

/**
 * Resolves once the video has settled on `timeSec`.
 *
 * Both listeners are removed on every path, and a timeout rejects rather than
 * leaving the pass waiting forever: a clip the browser cannot seek in - a
 * stream with no index, a partly written file - otherwise hangs on the first
 * sample with no error and no end.
 */
function seekTo(video: HTMLVideoElement, timeSec: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = (fail?: Error) => {
      clearTimeout(timer);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      if (fail) reject(fail);
      else resolve();
    };
    const onSeeked = () => done();
    const onError = () => done(new Error('The clip could not be decoded at that point.'));
    // Declared after done, which closes over it: nothing calls done until the
    // seek is under way, by which point this is assigned.
    const timer = setTimeout(() => done(new Error('Seeking timed out.')), SEEK_TIMEOUT_MS);
    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = timeSec;
  });
}

interface Report {
  durationS: number;
  wallClockS: number;
  frames: number;
  framesWithBall: number;
  scores: number[];
  maxGapMs: number;
  gapsOverLimit: number;
  shots: DetectedShot[];
  /** Recorded so two runs on one clip can be told apart afterwards. */
  mode: 'every-frame' | 'realtime';
  detector: 'coco' | 'motion';
}

interface Diagnosis {
  frames: number;
  delegate: string;
  videoSize: string;
  /** Every COCO class seen on the full frame, with frame counts and best score. */
  classes: ClassStat[];
  /** The same, measured on the hoop crop. Null when no rim was set. */
  cropClasses: ClassStat[] | null;
  magnify: number | null;
  framesWithAnything: number;
}

interface ClassStat {
  label: string;
  frames: number;
  best: number;
}

function median(xs: number[]): number {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function pct(n: number, d: number): string {
  return d > 0 ? `${Math.round((n / d) * 1000) / 10}%` : '–';
}

/**
 * The top `limit` classes, always including "sports ball".
 *
 * The crop list was a plain slice(0, 8), and on a good crop the ball ranks
 * below eight other classes - the backboard reads as a refrigerator, the
 * shooter as a person - so the one class this whole page exists to measure was
 * the one hidden. The summary above said 7.5% while the list appeared to show
 * no ball at all.
 */
function withBall(classes: ClassStat[], limit: number): ClassStat[] {
  const top = classes.slice(0, limit);
  if (top.some((c) => c.label === 'sports ball')) return top;
  const ball = classes.find((c) => c.label === 'sports ball');
  return ball ? [...top.slice(0, limit - 1), ball] : top;
}

export function DetectorBench() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [rim, setRim] = useState<Rim | null>(null);
  const [firstEdge, setFirstEdge] = useState<{ x: number; y: number } | null>(null);
  /** True while the player is tapping the two rim edges. */
  const [marking, setMarking] = useState(false);
  // Named phases, because the model download and the measurement take very
  // different amounts of time and one spinner for both made a 30-second CDN
  // fetch look identical to a hang.
  const [phase, setPhase] = useState<'idle' | 'loading' | 'measuring'>('idle');
  const [progress, setProgress] = useState<{ sec: number; total: number } | null>(null);
  /**
   * Which pass to run. Frame-by-frame is the default because it is the one
   * worth measuring; real time is kept so the two can be compared on the same
   * clip, which is the only way to show what the change bought.
   */
  const [mode, setMode] = useState<'every-frame' | 'realtime'>('every-frame');
  /**
   * Which way of finding the ball to measure. Both run through the same crop,
   * the same ShotDetector and the same report, so the numbers are comparable.
   */
  const [detectorKind, setDetectorKind] = useState<'coco' | 'motion'>('motion');
  const cancelRef = useRef(false);
  /** Throttles the progress readout to once per second of footage. */
  const lastReportedSec = useRef(-1);
  const [report, setReport] = useState<Report | null>(null);
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null);
  const [magnify, setMagnify] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const running = phase !== 'idle';
  const phaseLabel =
    phase === 'loading'
      ? 'Loading model…'
      : progress
        ? `Measuring ${progress.sec}s of ${progress.total}s…`
        : 'Measuring…';

  // Ground truth, typed in by whoever shot the clip
  const [trueAttempts, setTrueAttempts] = useState('');
  const [trueMakes, setTrueMakes] = useState('');

  function pick(file: File) {
    setHasVideo(true);
    setReport(null);
    setDiagnosis(null);
    setRim(null);
    setFirstEdge(null);
    setMarking(false);
    setError(null);
    requestAnimationFrame(() => {
      if (videoRef.current) videoRef.current.src = URL.createObjectURL(file);
    });
  }

  /** Freeze the frame, then take the two rim taps. */
  function startMarking() {
    videoRef.current?.pause();
    setFirstEdge(null);
    setRim(null);
    setMarking(true);
  }

  function tapRim(e: React.MouseEvent<HTMLButtonElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const point = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };
    if (!firstEdge) {
      setFirstEdge(point);
      return;
    }
    // Same check the tracker makes: measuring a benchmark against a rim that had
    // to be clamped would blame the detector for a bad measurement.
    const problem = rimTapProblem(firstEdge, point);
    if (problem) {
      setError(problem);
      setFirstEdge(null);
      return;
    }
    setError(null);
    setRim(rimFromEdges(firstEdge, point));
    setFirstEdge(null);
    setMarking(false);
  }

  /**
   * Plays the clip through once, handing each frame to `onFrame`, and reports
   * how the pass ended. Shared so the benchmark and the diagnosis measure
   * identical conditions.
   *
   * The end of a pass has to come from an event, not from the frame callback.
   * requestVideoFrameCallback only fires while new frames are being presented
   * for composition, and at the end of a clip none are - so a resolve that
   * lived only inside the callback never ran. Every benchmark deadlocked on its
   * final frame: the promise never settled, the finally never closed the
   * detector, and the button span forever while the numbers never arrived.
   * Playing the clip again just fed a second pass into the same tally.
   */
  async function sweep(
    onFrame: (video: HTMLVideoElement, videoMs: number, ts: number) => void
  ): Promise<SweepEnd> {
    const video = videoRef.current;
    if (!video) return 'stalled';
    let lastTs = 0;
    let lastSec = -1;
    let settled = false;
    let lastFrameAt = performance.now();
    let watchdog: ReturnType<typeof setInterval> | undefined;

    video.currentTime = 0;
    video.playbackRate = 1;

    return new Promise<SweepEnd>((resolve, reject) => {
      const cleanup = () => {
        if (watchdog !== undefined) clearInterval(watchdog);
        video.removeEventListener('ended', onEnded);
        video.removeEventListener('pause', onPaused);
      };
      const finish = (how: SweepEnd) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(how);
      };
      const onEnded = () => finish('ended');
      const onPaused = () => finish(video.ended ? 'ended' : 'paused');

      video.addEventListener('ended', onEnded);
      video.addEventListener('pause', onPaused);

      // Backgrounding the tab or scrolling the video out of view also stops the
      // frame callback, and so does a stalled download, none of which fire an
      // event. Without this the same deadlock comes back by another route.
      watchdog = setInterval(() => {
        if (performance.now() - lastFrameAt > STALL_MS) finish('stalled');
      }, 500);

      const step = () => {
        if (settled) return;
        if (video.paused || video.ended) {
          finish(video.ended ? 'ended' : 'paused');
          return;
        }
        lastFrameAt = performance.now();
        const videoMs = video.currentTime * 1000;
        const ts = Math.max(lastTs + 1, Math.round(videoMs));
        lastTs = ts;
        onFrame(video, videoMs, ts);
        // Once per second of footage, not once per frame: 60 re-renders a
        // second would compete with inference for the main thread.
        const sec = Math.floor(videoMs / 1000);
        if (sec !== lastSec) {
          lastSec = sec;
          setProgress({ sec, total: Math.round(video.duration || 0) });
        }
        const v = video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
        if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(step);
        else requestAnimationFrame(step);
      };

      video.play().then(
        () => {
          setPhase('measuring');
          step();
        },
        (e) => {
          cleanup();
          reject(e);
        }
      );
    });
  }

  /**
   * Walks the clip by seeking to each sample time, handing every one to
   * `onFrame`. The alternative to sweep(), which plays at 1x and sees only the
   * frames inference keeps up with.
   *
   * Slower than the clip by design: a pass costs a seek, a decode and an
   * inference per sample, so it runs for as long as that takes rather than for
   * the clip's length. What it buys is that the number of frames analysed stops
   * depending on how fast the device is.
   */
  async function stepFrames(
    onFrame: (video: HTMLVideoElement, videoMs: number, ts: number) => void
  ): Promise<SweepEnd> {
    const video = videoRef.current;
    if (!video) return 'stalled';
    video.pause();
    const times = sampleTimesMs((video.duration || 0) * 1000);
    if (times.length === 0) return 'stalled';

    setPhase('measuring');
    let lastTs = 0;
    let stuck = 0;

    for (let i = 0; i < times.length; i++) {
      if (cancelRef.current) return 'paused';
      const before = video.currentTime * 1000;
      try {
        await seekTo(video, times[i] / 1000);
      } catch {
        return 'stalled';
      }
      const videoMs = video.currentTime * 1000;
      // A step finer than the clip's real frame interval lands back on the frame
      // just done. One or two is normal; a run of them means the clip will not
      // advance and the loop would spin to the end for nothing.
      if (i > 0 && !seekMadeProgress(before, videoMs)) {
        if (++stuck > 10) return 'stalled';
        continue;
      }
      stuck = 0;
      const ts = Math.max(lastTs + 1, Math.round(videoMs));
      lastTs = ts;
      onFrame(video, videoMs, ts);
      const sec = Math.floor(videoMs / 1000);
      if (sec !== lastReportedSec.current) {
        lastReportedSec.current = sec;
        setProgress({ sec, total: Math.round(video.duration || 0) });
      }
    }
    return 'ended';
  }

  /** Warns when numbers came from a pass that did not reach the end. */
  function warnIfPartial(how: SweepEnd) {
    if (how === 'ended') return;
    setWarning(
      how === 'paused'
        ? 'The clip was paused before the end, so these numbers cover only the part that played.'
        : 'The clip stopped sending frames before the end - usually a backgrounded tab or the video scrolled out of view. These numbers cover only the part that played, so run it again with the page in front of you.'
    );
  }

  /** Adds one frame's detections into a running tally of classes. */
  function tally(seen: Map<string, { frames: number; best: number }>, detections: Detection[]) {
    const thisFrame = new Set<string>();
    for (const d of detections) {
      const cat = d.categories[0];
      if (!cat) continue;
      const label = cat.categoryName || `#${cat.index}`;
      const prev = seen.get(label) || { frames: 0, best: 0 };
      seen.set(label, {
        frames: prev.frames + (thisFrame.has(label) ? 0 : 1),
        best: Math.max(prev.best, cat.score || 0),
      });
      thisFrame.add(label);
    }
  }

  const sorted = (seen: Map<string, { frames: number; best: number }>) =>
    [...seen.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.frames - a.frames);

  /**
   * Runs the model with no class filter, to find out what it can see at all -
   * on the full frame AND on the hoop crop, in the same pass, so the two are
   * directly comparable. Running it without a rim only measures the full frame,
   * which is what the tracker already struggled with, so it answers nothing.
   */
  async function diagnose() {
    const video = videoRef.current;
    if (!video) return;
    setPhase('loading');
    setProgress(null);
    setError(null);
    setWarning(null);
    setDiagnosis(null);
    cancelRef.current = false;
    lastReportedSec.current = -1;
    // Closed in the finally below: these are per-run instances, and without
    // closing them each run leaks its WASM model into the tab.
    let full: ObjectDetector | null = null;
    let cropped: ObjectDetector | null = null;
    try {
      [full, cropped] = await Promise.all([createDiagnosticDetector(), createDiagnosticDetector()]);
      // Non-null bindings: the outer lets exist only so finally can close them,
      // and TypeScript cannot see through the sweep callback to narrow them.
      const fullDetector = full;
      const cropDetector = cropped;
      const seenFull = new Map<string, { frames: number; best: number }>();
      const seenCrop = new Map<string, { frames: number; best: number }>();
      let frames = 0;
      let framesWithAnything = 0;
      let gain: number | null = null;

      const canvas = document.createElement('canvas');
      canvas.width = CROP_CANVAS_PX;
      canvas.height = CROP_CANVAS_PX;
      const ctx = canvas.getContext('2d');

      const pass = mode === 'every-frame' ? stepFrames : sweep;
      const how = await pass((v, _videoMs, ts) => {
        frames += 1;
        const detections = fullDetector.detectForVideo(v, ts).detections || [];
        if (detections.length) framesWithAnything += 1;
        tally(seenFull, detections);

        if (rim && ctx) {
          const crop = cropRectFor(rim, v.videoWidth, v.videoHeight);
          gain = magnification(crop, v.videoWidth);
          ctx.drawImage(v, crop.sx, crop.sy, crop.side, crop.side, 0, 0, CROP_CANVAS_PX, CROP_CANVAS_PX);
          tally(seenCrop, cropDetector.detectForVideo(canvas, ts).detections || []);
        }
      });
      warnIfPartial(how);

      setDiagnosis({
        frames,
        delegate: getActiveDelegate() || 'unknown',
        videoSize: `${video.videoWidth}x${video.videoHeight}`,
        framesWithAnything,
        classes: sorted(seenFull),
        cropClasses: rim ? sorted(seenCrop) : null,
        magnify: gain,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Diagnosis failed.');
    } finally {
      full?.close();
      cropped?.close();
      setPhase('idle');
      setProgress(null);
    }
  }

  async function run() {
    const video = videoRef.current;
    if (!video || !rim) return;
    setPhase('loading');
    setProgress(null);
    setError(null);
    setWarning(null);
    setReport(null);
    cancelRef.current = false;
    lastReportedSec.current = -1;

    let detector: ObjectDetector | null = null;
    try {
      // Its own instance, not the shared one: this replays the clip from the
      // start every run, so its timestamps restart and would go backwards on a
      // detector the live tracker had already advanced. Skipped entirely for
      // the motion tracker, which needs no model and should not wait on a
      // 10MB download to measure that.
      detector = detectorKind === 'coco' ? await createBallDetector() : null;
      const ballDetector = detector;
      const shotDetector = new ShotDetector(rim);
      const scores: number[] = [];
      let frames = 0;
      let framesWithBall = 0;
      let maxGapMs = 0;
      let gapsOverLimit = 0;
      let lastBallMs: number | null = null;
      const startedAt = performance.now();

      // Video time, not wall clock: the detector reasons in milliseconds and
      // this keeps the gap measurements true to the footage.
      const canvas = document.createElement('canvas');
      canvas.width = CROP_CANVAS_PX;
      canvas.height = CROP_CANVAS_PX;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Could not get a 2d canvas context.');
      let gain = 1;

      // Previous crop, for the motion tracker. Null on the first frame, which
      // is why it reports nothing there - there is no motion in one frame.
      let prevPixels: Uint8ClampedArray | null = null;

      const pass = mode === 'every-frame' ? stepFrames : sweep;
      const how = await pass((v, videoMs, ts) => {
        // Same hoop crop the tracker uses, so the benchmark measures the real thing
        const crop = cropRectFor(rim, v.videoWidth, v.videoHeight);
        gain = magnification(crop, v.videoWidth);
        ctx.drawImage(v, crop.sx, crop.sy, crop.side, crop.side, 0, 0, CROP_CANVAS_PX, CROP_CANVAS_PX);

        let box: { originX: number; originY: number; width: number; height: number } | null = null;
        let score = 0;

        if (ballDetector) {
          const result = ballDetector.detectForVideo(canvas, ts);
          const best = [...(result.detections || [])].sort(
            (a, b) => (b.categories[0]?.score || 0) - (a.categories[0]?.score || 0)
          )[0];
          box = best?.boundingBox ?? null;
          score = best?.categories[0]?.score || 0;
        } else {
          const pixels = ctx.getImageData(0, 0, CROP_CANVAS_PX, CROP_CANVAS_PX).data;
          if (prevPixels) {
            // The rim is measured in frame pixels; the tracker works in the
            // crop canvas, so carry the scale across rather than guessing a size
            const rimOnCanvas = rim.width * v.videoWidth * (CROP_CANVAS_PX / crop.side);
            const found = findBall(prevPixels, pixels, CROP_CANVAS_PX, CROP_CANVAS_PX, {
              expectedDiameter: expectedBallDiameter(rimOnCanvas),
            });
            if (found) {
              box = {
                originX: found.x - found.diameter / 2,
                originY: found.y - found.diameter / 2,
                width: found.diameter,
                height: found.diameter,
              };
              score = found.score;
            }
          }
          prevPixels = pixels;
        }
        frames += 1;

        if (box) {
          framesWithBall += 1;
          scores.push(score);
          if (lastBallMs !== null) {
            const gap = videoMs - lastBallMs;
            if (gap > maxGapMs) maxGapMs = gap;
            if (gap > LOST_BALL_MS) gapsOverLimit += 1;
          }
          lastBallMs = videoMs;
        }

        shotDetector.push({
          t: videoMs,
          ball: box ? ballCentreInFrame(box, crop, v.videoWidth, v.videoHeight) : null,
        });
      });
      warnIfPartial(how);
      setMagnify(gain);

      setReport({
        durationS: video.duration || 0,
        wallClockS: (performance.now() - startedAt) / 1000,
        frames,
        framesWithBall,
        scores,
        maxGapMs,
        gapsOverLimit,
        shots: shotDetector.shots,
        mode,
        detector: detectorKind,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Detection failed.');
    } finally {
      detector?.close();
      setPhase('idle');
      setProgress(null);
    }
  }

  const detectedAttempts = report?.shots.length ?? 0;
  const detectedMakes = report?.shots.filter((s) => s.made).length ?? 0;
  const ta = Number(trueAttempts);
  const tm = Number(trueMakes);
  const truthEntered = trueAttempts !== '' && trueMakes !== '' && Number.isFinite(ta) && Number.isFinite(tm);
  // You cannot make more than you take. Without this the comparison accepted
  // "5 attempts, 10 makes" - two numbers typed into the wrong boxes - and
  // reported the detector as 8 makes short of an impossible target.
  const truthImpossible = truthEntered && (tm > ta || ta < 0 || tm < 0);
  const haveTruth = truthEntered && !truthImpossible;

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" title="Detection failed">{error}</Alert>}

      {!hasVideo ? (
        <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 cursor-pointer hover:bg-zinc-900">
          <FileVideo className="h-6 w-6 text-cyan-400" />
          <div>
            <div className="font-semibold text-white">Choose a test clip</div>
            <div className="text-xs text-zinc-500">Runs on this device. Nothing is uploaded.</div>
          </div>
          <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        </label>
      ) : (
        <>
          <div className="relative">
            {/* Native controls are off while marking the rim. With them on, the
                browser's own play/pause owns every click on the video and the
                taps never land. They are also off during a run: replaying the
                clip mid-sweep feeds a second pass into the same tally. */}
            <video
              ref={videoRef}
              controls={!marking && !running}
              playsInline
              muted
              className="w-full rounded-2xl bg-black"
            />
            {marking && (
              <button
                type="button"
                onClick={tapRim}
                aria-label={
                  firstEdge
                    ? 'Tap the opposite edge of the ring, straight across'
                    : 'Tap the left or right edge of the ring, at its widest'
                }
                className="absolute inset-0 cursor-crosshair touch-manipulation"
              />
            )}
            {firstEdge && (
              /* A crosshair, not a blob. The old 12px dot covered the rim edge it
                 was meant to mark, so you could not see what you had hit - and the
                 rim width it produces feeds the crop and the crossing test. Thin
                 lines locate the point; the 4px centre keeps it visible. */
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${firstEdge.x * 100}%`, top: `${firstEdge.y * 100}%` }}
              >
                <div className="absolute left-1/2 top-1/2 h-px w-6 -translate-x-1/2 -translate-y-1/2 bg-white/80" />
                <div className="absolute left-1/2 top-1/2 h-6 w-px -translate-x-1/2 -translate-y-1/2 bg-white/80" />
                <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500 ring-1 ring-white" />
              </div>
            )}
            {rim && (
              /* Drawn as an SVG in normalised coordinates rather than a rotated
                 div: x is a fraction of width and y a fraction of height, so a
                 CSS rotation would need the element's aspect ratio folded in to
                 land on the rim. preserveAspectRatio="none" maps the two
                 straight onto the box, and the non-scaling stroke keeps the
                 line one pixel wide instead of stretching with the viewBox. */
              <svg
                viewBox="0 0 1 1"
                preserveAspectRatio="none"
                className="pointer-events-none absolute inset-0 h-full w-full"
              >
                <line
                  x1={rim.x - rim.width / 2}
                  y1={rimYAt(rim, rim.x - rim.width / 2)}
                  x2={rim.x + rim.width / 2}
                  y2={rimYAt(rim, rim.x + rim.width / 2)}
                  stroke="#f97316"
                  strokeWidth={3}
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            )}
          </div>

          {marking ? (
            <div className="rounded-xl border border-orange-500/40 bg-orange-500/10 p-3">
              <p className="text-sm font-semibold text-orange-200">
                {firstEdge
                  ? 'Now tap the opposite side, straight across the ring.'
                  : 'Tap the left and right edges of the ring — its widest points across, not the front and back.'}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Playback is paused and the video controls are off, so your taps land on the frame instead of
                starting the video.
              </p>
              <button
                type="button"
                onClick={() => {
                  setMarking(false);
                  setFirstEdge(null);
                }}
                className="mt-2 text-xs text-zinc-400 underline"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" size="sm" onClick={startMarking}>
                <Crosshair className="mr-1.5 h-4 w-4" />
                {rim ? 'Set the rim again' : 'Set the rim'}
              </Button>
              <span className="text-sm text-zinc-400">
                {rim
                  ? `Rim measured: ${(rim.width * 100).toFixed(1)}% of frame width, tilt ${rimTiltDegrees(rim).toFixed(0)}°.`
                  : 'Scrub to a frame showing the hoop first, then set the rim.'}
              </span>
            </div>
          )}

          {!running && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">How to find the ball</p>
              <div className="mt-2 space-y-2">
                {(
                  [
                    [
                      'motion',
                      'Motion and shape',
                      'The camera does not move, so differencing frames leaves the player and the ball. Assumes no colour, and sizes the ball from the rim.',
                    ],
                    [
                      'coco',
                      'Object model',
                      'MediaPipe looking for a "sports ball". Found it in 7.1% of frames on the test clip, median confidence 0.246.',
                    ],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label key={value} className="flex gap-2 text-sm text-zinc-200">
                    <input
                      type="radio"
                      name="bench-detector"
                      value={value}
                      checked={detectorKind === value}
                      onChange={() => setDetectorKind(value)}
                      className="mt-1 accent-red-500"
                    />
                    <span className="min-w-0">
                      <span className="font-semibold">{label}</span>
                      <span className="block text-xs text-zinc-500">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">How to analyse</p>
              <div className="mt-2 space-y-2">
                {(
                  [
                    [
                      'every-frame',
                      'Every frame',
                      'Seeks frame by frame. Slower than the clip, and what the detector sees stops depending on how fast this device is.',
                    ],
                    [
                      'realtime',
                      'At playback speed',
                      'Plays at 1x and takes whatever frames inference keeps up with. Measured 14.3 fps on a 30 fps clip, so under half of them.',
                    ],
                  ] as const
                ).map(([value, label, hint]) => (
                  <label key={value} className="flex gap-2 text-sm text-zinc-200">
                    <input
                      type="radio"
                      name="bench-mode"
                      value={value}
                      checked={mode === value}
                      onChange={() => setMode(value)}
                      className="mt-1 accent-red-500"
                    />
                    <span className="min-w-0">
                      <span className="font-semibold">{label}</span>
                      <span className="block text-xs text-zinc-500">{hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Button variant="primary" size="lg" className="w-full gap-2" disabled={!rim} isLoading={running} onClick={() => void run()}>
            <Play className="h-4 w-4" /> {running ? phaseLabel : 'Run benchmark'}
          </Button>

          <Button variant="secondary" size="lg" className="w-full gap-2" isLoading={running} onClick={() => void diagnose()}>
            <Search className="h-4 w-4" /> {running ? phaseLabel : `What can the model see?${rim ? ' (full frame vs hoop crop)' : ''}`}
          </Button>

          {phase === 'loading' && (
            <p className="text-xs text-zinc-400">
              Fetching the detector model and runtime (about 10 MB, from two CDNs). Only the first run pays
              for this; after that the browser has them cached.
            </p>
          )}
          {phase === 'measuring' && (
            <p className="text-xs text-zinc-400">
              {mode === 'every-frame'
                ? 'Seeking to every frame in turn, so this takes longer than the clip. It can run in a background tab.'
                : 'The clip plays at normal speed, so the detector sees frames the way the live tracker does. Keep this page in front of you - a backgrounded tab stops sending frames.'}
            </p>
          )}
          {running && mode === 'every-frame' && (
            <button
              type="button"
              onClick={() => {
                cancelRef.current = true;
              }}
              className="text-xs text-zinc-400 underline"
            >
              Stop and keep what has been measured
            </button>
          )}
          {warning && (
            <Alert variant="warning" title="Partial pass">
              {warning}
            </Alert>
          )}
          {!rim && (
            <p className="text-xs text-amber-400">
              Set the rim first. Without it this only measures the full frame, which is the case that already
              fails - it cannot tell you whether cropping to the hoop helps.
            </p>
          )}

          {diagnosis && (
            <div className="space-y-3 rounded-2xl border border-amber-600/40 bg-amber-600/10 p-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300">Everything the model detected</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-zinc-400">Frames</span>
                <span className="text-right font-semibold text-white">{diagnosis.frames}</span>
                <span className="text-zinc-400">Frames with any object</span>
                <span className="text-right font-semibold text-white">
                  {diagnosis.framesWithAnything} ({pct(diagnosis.framesWithAnything, diagnosis.frames)})
                </span>
                <span className="text-zinc-400">Video size</span>
                <span className="text-right font-semibold text-white">{diagnosis.videoSize}</span>
                <span className="text-zinc-400">Running on</span>
                <span className="text-right font-semibold text-white">{diagnosis.delegate}</span>
              </div>

              {/* The answer, stated rather than left to be read off two lists */}
              {diagnosis.cropClasses ? (
                (() => {
                  const ballFull = diagnosis.classes.find((c) => c.label === 'sports ball');
                  const ballCrop = diagnosis.cropClasses.find((c) => c.label === 'sports ball');
                  const pctFull = ((ballFull?.frames || 0) / diagnosis.frames) * 100;
                  const pctCrop = ((ballCrop?.frames || 0) / diagnosis.frames) * 100;
                  const better = pctCrop > pctFull * 1.5 || (ballCrop?.best || 0) > (ballFull?.best || 0) * 1.5;
                  return (
                    <div className={`rounded-xl p-3 ${better ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}>
                      <div className={`text-sm font-bold ${better ? 'text-emerald-300' : 'text-red-300'}`}>
                        {better
                          ? 'The hoop crop helps. Worth building on.'
                          : 'The hoop crop does not help. The model cannot resolve this ball.'}
                      </div>
                      <div className="mt-1 grid grid-cols-3 gap-2 text-xs text-zinc-300">
                        <span />
                        <span className="font-semibold">Full frame</span>
                        <span className="font-semibold">Hoop crop</span>
                        <span className="text-zinc-400">Ball found in</span>
                        <span>{pctFull.toFixed(1)}%</span>
                        <span>{pctCrop.toFixed(1)}%</span>
                        <span className="text-zinc-400">Best score</span>
                        <span>{(ballFull?.best || 0).toFixed(3)}</span>
                        <span>{(ballCrop?.best || 0).toFixed(3)}</span>
                      </div>
                      {diagnosis.magnify && (
                        <div className="mt-1 text-xs text-zinc-500">
                          Crop magnified the ball {diagnosis.magnify.toFixed(1)}x
                        </div>
                      )}
                    </div>
                  );
                })()
              ) : null}

              {diagnosis.cropClasses && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">On the hoop crop</h4>
                  <div className="space-y-1 text-sm">
                    {withBall(diagnosis.cropClasses, 8).map((c) => (
                      <div key={c.label} className="flex items-center justify-between gap-2">
                        <span className={c.label === 'sports ball' ? 'font-bold text-emerald-400' : 'text-zinc-300'}>
                          {c.label}
                        </span>
                        <span className="text-zinc-400">
                          {c.frames} ({pct(c.frames, diagnosis.frames)}) · best {c.best.toFixed(3)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-500">On the full frame</h4>
              {diagnosis.classes.length === 0 ? (
                <p className="text-sm font-semibold text-red-400">
                  The model returned nothing at all, for any class. That is a broken pipeline, not a hard-to-see ball.
                </p>
              ) : (
                <div className="space-y-1 text-sm">
                  {diagnosis.classes.map((c) => (
                    <div key={c.label} className="flex items-center justify-between gap-2">
                      <span className={c.label === 'sports ball' ? 'font-bold text-emerald-400' : 'text-zinc-300'}>
                        {c.label}
                      </span>
                      <span className="text-zinc-400">
                        {c.frames} frames ({pct(c.frames, diagnosis.frames)}) · best {c.best.toFixed(3)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-zinc-400">
                If &ldquo;sports ball&rdquo; is absent but other classes are present, the model works and simply cannot
                resolve the ball. If it is present here but the benchmark above finds nothing, the score threshold or
                the class filter is wrong.
              </p>
            </div>
          )}

          {report && (
            <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Ball detection
                  <span className="ml-2 font-normal normal-case tracking-normal text-zinc-500">
                    {report.detector === 'motion' ? 'motion and shape' : 'object model'} ·{' '}
                    {report.mode === 'every-frame' ? 'every frame' : 'at playback speed'}
                  </span>
                </h3>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  <span className="text-zinc-400">
                    {report.mode === 'every-frame' ? 'Frames analysed' : 'Frames processed'}
                  </span>
                  <span className="text-right font-semibold text-white">{report.frames}</span>
                  <span className="text-zinc-400">Ball found in</span>
                  <span className="text-right font-semibold text-white">
                    {report.framesWithBall} ({pct(report.framesWithBall, report.frames)})
                  </span>
                  {/* Not the same quantity across detectors: the model reports
                      how sure it is that this is a sports ball, the tracker how
                      ball-like a moving blob's shape and size were. Comparable
                      within a detector, not between them. */}
                  <span className="text-zinc-400">
                    Median {report.detector === 'motion' ? 'ball-likeness' : 'confidence'}
                  </span>
                  <span className="text-right font-semibold text-white">{median(report.scores).toFixed(3)}</span>
                  <span className="text-zinc-400">Best {report.detector === 'motion' ? 'ball-likeness' : 'confidence'}</span>
                  <span className="text-right font-semibold text-white">
                    {report.scores.length ? Math.max(...report.scores).toFixed(3) : '–'}
                  </span>
                  <span className="text-zinc-400">Hoop crop magnification</span>
                  <span className="text-right font-semibold text-white">{magnify.toFixed(1)}x</span>
                  <span className="text-zinc-400">Longest gap with no ball</span>
                  <span className="text-right font-semibold text-white">{Math.round(report.maxGapMs)} ms</span>
                  <span className="text-zinc-400">Gaps over {LOST_BALL_MS} ms</span>
                  <span className="text-right font-semibold text-white">{report.gapsOverLimit}</span>
                  {/* Coverage and throughput are the same number at playback
                      speed and come apart frame by frame, where the clip is no
                      longer the clock. Coverage is the one that decides whether
                      a crossing can be seen. */}
                  <span className="text-zinc-400">Frames per second of footage</span>
                  <span className="text-right font-semibold text-white">
                    {(report.frames / Math.max(report.durationS, 0.001)).toFixed(1)}
                  </span>
                  <span className="text-zinc-400">Inference rate</span>
                  <span className="text-right font-semibold text-white">
                    {(report.frames / Math.max(report.wallClockS, 0.001)).toFixed(1)} fps
                  </span>
                  <span className="text-zinc-400">Took</span>
                  <span className="text-right font-semibold text-white">
                    {report.wallClockS.toFixed(0)}s for {report.durationS.toFixed(0)}s of clip
                  </span>
                </div>
                <p className="mt-2 text-xs text-zinc-500">
                  Gaps matter most: an armed shot with the ball unseen for {LOST_BALL_MS} ms is scored a miss, so a high
                  gap count predicts makes being called misses.
                </p>
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Shots called ({detectedMakes}/{detectedAttempts})
                </h3>
                {report.shots.length === 0 ? (
                  <p className="text-sm text-zinc-500">No shots detected.</p>
                ) : (
                  <div className="max-h-48 space-y-1 overflow-y-auto text-sm">
                    {report.shots.map((s, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-12 tabular-nums text-xs text-zinc-500">{(s.t / 1000).toFixed(1)}s</span>
                        <span className={s.made ? 'font-semibold text-emerald-400' : 'font-semibold text-red-400'}>
                          {s.made ? 'MAKE' : 'MISS'}
                        </span>
                        {!s.confident && <span className="text-[10px] uppercase text-amber-500">inferred</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400 mb-2">Against what really happened</h3>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    inputMode="numeric"
                    value={trueAttempts}
                    onChange={(e) => setTrueAttempts(e.target.value)}
                    placeholder="Actual attempts"
                    aria-label="Actual attempts"
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
                  />
                  <input
                    inputMode="numeric"
                    value={trueMakes}
                    onChange={(e) => setTrueMakes(e.target.value)}
                    placeholder="Actual makes"
                    aria-label="Actual makes"
                    className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white"
                  />
                </div>
                {truthImpossible && (
                  <p className="mt-2 text-xs font-semibold text-amber-400">
                    That is more makes than attempts, so the comparison is hidden. Attempts goes in the left
                    box, makes in the right.
                  </p>
                )}
                {haveTruth && (
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-zinc-400">Attempts</span>
                    <span className="text-right font-semibold text-white">
                      {detectedAttempts} vs {ta} ({detectedAttempts - ta >= 0 ? '+' : ''}
                      {detectedAttempts - ta})
                    </span>
                    <span className="text-zinc-400">Makes</span>
                    <span className="text-right font-semibold text-white">
                      {detectedMakes} vs {tm} ({detectedMakes - tm >= 0 ? '+' : ''}
                      {detectedMakes - tm})
                    </span>
                    <span className="text-zinc-400">Attempts found</span>
                    <span className="text-right font-semibold text-white">{pct(Math.min(detectedAttempts, ta), ta)}</span>
                  </div>
                )}
                <p className="mt-2 text-xs text-zinc-500">
                  Counts only. Matching each detected shot to the right real one needs the review UI; this is enough to
                  tell whether the detector is worth building on.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
