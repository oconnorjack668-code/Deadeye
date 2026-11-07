// src/lib/video/trackerPipeline.ts
// One frame of the hoop crop in, the ball and any shot call out.
//
// This is everything the tracker does to a frame after it has been drawn, in
// one place, so that the three things that run it run the same code: the
// worker the phone uses (tracker.worker.ts), the same thing on the main
// thread where a worker cannot start, and the headless clip bench. Before, the
// bench kept its own copy of this loop and had to be kept in step with
// ShotTracker by hand; a measurement is only worth something if it measures
// what ships.
//
// Pure apart from the state it carries from frame to frame: no DOM, no React,
// nothing a worker lacks.
import { createBallTracker, type BallTracker } from './ballTracker';
import { expectedBallDiameter } from './motionBall';
import { cropRectFor, ballCentreInFrame, netBoxOnCanvas, type CropRect } from './crop';
import { ShotDetector, type DetectedShot, type Rim } from './shotDetector';
import { createCameraShiftWatcher, type Shift } from './cameraShift';

export interface PipelineConfig {
  rim: Rim;
  videoWidth: number;
  videoHeight: number;
  /** Learn the ball's colour as the run goes (the app always does). */
  learn?: boolean;
  /** Watch the net for makes (the app always does; the bench can turn it off to measure what it adds). */
  watchNet?: boolean;
  /** Bench only: where the net box starts, see NetBox.from. */
  netFrom?: number;
}

export interface PipelineFrame {
  /** The moment scored: the middle of the three frames, in ms. */
  t: number;
  /** False for the first two frames of a run, before there is a middle frame to score. */
  ready: boolean;
  /** The ball's box in frame fractions, or null. */
  ball: { x: number; y: number; w: number; h: number } | null;
  /** Its centre in frame fractions, or null. */
  centre: { x: number; y: number } | null;
  /** The raw find on the crop canvas, for the bench's trace. */
  found: { x: number; y: number; diameter: number; score: number } | null;
  netMotion: number | null;
  /** A shot decided on this frame. */
  shot: DetectedShot | null;
  /** Set on the frame that settles the camera has moved, once per move. */
  moved: Shift | null;
  /** Mean brightness of the hoop crop, 0..255, when it was measured on this frame. */
  light: number | null;
}

export interface TrackerPipeline {
  frame(pixels: Uint8ClampedArray, px: number, now: number): PipelineFrame;
  /** Calls a shot still being judged when the run ends. */
  finish(): DetectedShot | null;
  shots(): readonly DetectedShot[];
  readonly crop: CropRect;
  /** The ball tracker for the current canvas size, for the bench's diagnostics. */
  tracker(): BallTracker | null;
  /** The camera watcher starts again from the picture as it is now. */
  resetShift(): void;
}

export function createPipeline(config: PipelineConfig): TrackerPipeline {
  const { rim, videoWidth, videoHeight } = config;
  const watchNet = config.watchNet ?? true;
  const crop = cropRectFor(rim, videoWidth, videoHeight);
  const detector = new ShotDetector(rim, { aspect: videoHeight / videoWidth });
  const watcher = createCameraShiftWatcher();

  // Three-frame differencing: the frame being scored is the middle one, so
  // the newest frame is held back a turn. Measured on a real clip, two-frame
  // counted one shot twice 1.3s apart where three-frame called 10 of the 10
  // actually taken.
  let older: Uint8ClampedArray | null = null;
  let held: { pixels: Uint8ClampedArray; t: number } | null = null;
  // Built for a canvas size, and rebuilt if the workload changes it: the
  // expected ball size and the net box are in canvas pixels
  let tracker: BallTracker | null = null;
  let trackerPx = 0;

  return {
    crop,
    frame(pixels, px, now) {
      if (!tracker || trackerPx !== px) {
        const rimOnCanvas = rim.width * videoWidth * (px / crop.side);
        const net = netBoxOnCanvas(rim, crop, videoWidth, videoHeight, px);
        tracker = createBallTracker({
          expectedDiameter: expectedBallDiameter(rimOnCanvas),
          learn: config.learn ?? true,
          net: config.netFrom ? { ...net, from: config.netFrom } : net,
        });
        trackerPx = px;
        // A new size means new pixels to compare, so the frames held for
        // differencing start again too
        older = null;
        held = null;
      }

      const ready = Boolean(older && held);
      const found = older && held ? tracker.track(older, held.pixels, px, px, pixels, held.t) : null;
      const t = held ? held.t : now;
      older = held?.pixels ?? null;
      held = { pixels, t: now };

      const moved = watcher.push(pixels, px, px, now);
      const light = watcher.lastLight();

      // Crop pixels back to whole-frame fractions, which is the space the
      // shot detector and everything after it work in
      const scale = crop.side / px;
      let ball: PipelineFrame['ball'] = null;
      let centre: PipelineFrame['centre'] = null;
      if (found) {
        const box = { originX: found.x - found.diameter / 2, originY: found.y - found.diameter / 2, width: found.diameter, height: found.diameter };
        centre = ballCentreInFrame(box, crop, videoWidth, videoHeight, px);
        const w = (found.diameter * scale) / videoWidth;
        const h = (found.diameter * scale) / videoHeight;
        ball = { w, h, x: centre.x - w / 2, y: centre.y - h / 2 };
      }

      const netMotion = tracker.netMotion();
      // Nothing has been scored until three frames have arrived
      const shot = ready
        ? detector.push({
            t,
            ball: centre,
            net: watchNet ? (netMotion ?? undefined) : undefined,
            under: watchNet ? tracker.underNet() : undefined,
            id: tracker.ballId(),
          })
        : null;

      return {
        t,
        ready,
        ball,
        centre,
        found: found ? { x: found.x, y: found.y, diameter: found.diameter, score: found.score } : null,
        netMotion,
        shot,
        moved,
        light,
      };
    },
    finish: () => detector.finish(),
    shots: () => detector.shots,
    tracker: () => tracker,
    resetShift: () => watcher.reset(),
  };
}
