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
import { ShotDetector, type BallObservation, type DetectedShot, type Rim } from './shotDetector';
import { createCameraShiftWatcher, type Shift } from './cameraShift';
import { createStabiliser } from './stabilise';

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
  /** Line each frame up with the first before scoring it, for a camera that wobbles (stabilise.ts). On unless turned off. */
  steady?: boolean;
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
  /**
   * A shot decided on this frame. The shot detector runs HOLD_FRAMES behind
   * the frames scored, so it is decided from frames a little older than this
   * one; the shot's own `t` says when it happened.
   */
  shot: DetectedShot | null;
  /** Set on the frame that settles the camera has moved, once per move. */
  moved: Shift | null;
  /** Mean brightness of the hoop crop, 0..255, when it was measured on this frame. */
  light: number | null;
  /**
   * How far, in canvas pixels, the picture has slid from where it started, and
   * whether this frame was slid back to hold the hoop still (`applied`); null
   * when frames are not being lined up.
   */
  steadied: { dx: number; dy: number; applied: boolean; ax: number; ay: number } | null;
}

export interface TrackerPipeline {
  frame(pixels: Uint8ClampedArray, px: number, now: number): PipelineFrame;
  /** Judges the frames still held and calls a shot still being judged when the run ends: what that decided, oldest first. */
  finish(): DetectedShot[];
  shots(): readonly DetectedShot[];
  readonly crop: CropRect;
  /** The ball tracker for the current canvas size, for the bench's diagnostics. */
  tracker(): BallTracker | null;
  /** The camera watcher starts again from the picture as it is now. */
  resetShift(): void;
}

/**
 * Frames the shot detector is held behind the ball tracker.
 *
 * The tracker reports something as the ball only once it has been followed
 * moving like one for three frames, and the first two were thrown away. At
 * 30 frames a second that cost the first two sightings of a shot coming in
 * from the top of the picture; at 10 it cost all of them, since the ball is
 * above the ring for a frame or two and then in the net. On the bench's
 * 10 fps clips most makes were never called at all (9 Nov 2026). Held back
 * two frames, those sightings are handed to the detector in their place once
 * the tracker settles that it was the ball. Two frames is 67ms at 30 a
 * second, 200ms at 10, long before anyone looks at a call.
 */
export const HOLD_FRAMES = 2;

export function createPipeline(config: PipelineConfig): TrackerPipeline {
  const { rim, videoWidth, videoHeight } = config;
  const watchNet = config.watchNet ?? true;
  const crop = cropRectFor(rim, videoWidth, videoHeight);
  const detector = new ShotDetector(rim, { aspect: videoHeight / videoWidth });
  const watcher = createCameraShiftWatcher();
  const stabiliser = config.steady === false ? null : createStabiliser();

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
  // Observations scored and not yet given to the detector: see HOLD_FRAMES
  const held2: BallObservation[] = [];

  return {
    crop,
    frame(raw, px, now) {
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
        stabiliser?.reset();
      }

      // A wobbling camera's frame is slid back to where the hoop was, so the
      // differencing, the net, the rim line and the camera watcher all see a
      // still one. The watcher then reports only a move too big to follow.
      const steadied = stabiliser?.push(raw, px, px) ?? null;
      const pixels = steadied ? steadied.pixels : raw;

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
      let shot: DetectedShot | null = null;
      // Nothing has been scored until three frames have arrived
      if (ready) {
        const id = tracker.ballId();
        // The ball's earlier sightings, on held frames that had none, are
        // given back to those frames. Only where nothing else was reported,
        // so nothing the detector would have seen is taken away.
        if (found && id !== null) {
          for (const s of tracker.recent()) {
            const q = held2.find((o) => o.t === s.t);
            if (!q || q.ball) continue;
            const box = { originX: s.x - s.diameter / 2, originY: s.y - s.diameter / 2, width: s.diameter, height: s.diameter };
            q.ball = ballCentreInFrame(box, crop, videoWidth, videoHeight, px);
            q.id = id;
          }
        }
        held2.push({
          t,
          ball: centre,
          net: watchNet ? (netMotion ?? undefined) : undefined,
          under: watchNet ? tracker.underNet() : undefined,
          id,
        });
        while (held2.length > HOLD_FRAMES) shot = detector.push(held2.shift()!) ?? shot;
      }

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
        steadied: steadied ? { dx: steadied.dx, dy: steadied.dy, applied: steadied.moved, ax: steadied.ax, ay: steadied.ay } : null,
      };
    },
    finish: () => {
      const decided: DetectedShot[] = [];
      while (held2.length) {
        const s = detector.push(held2.shift()!);
        if (s) decided.push(s);
      }
      const last = detector.finish();
      if (last) decided.push(last);
      return decided;
    },
    shots: () => detector.shots,
    tracker: () => tracker,
    resetShift: () => {
      watcher.reset();
      stabiliser?.reset();
    },
  };
}
