// src/lib/video/mediapipe.ts
// Lazily loads MediaPipe models in the browser. Everything runs on the player's
// device; video frames are never uploaded.
import { FilesetResolver, ObjectDetector, PoseLandmarker } from '@mediapipe/tasks-vision';

const VERSION = '1.0.1'; // keep in step with package.json
const WASM_URL = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${VERSION}/wasm`;
const BALL_MODEL =
  'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite';
const POSE_MODEL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';

let filesetPromise: ReturnType<typeof FilesetResolver.forVisionTasks> | null = null;
let posePromise: Promise<PoseLandmarker> | null = null;

function fileset() {
  return (filesetPromise ??= FilesetResolver.forVisionTasks(WASM_URL));
}

let activeDelegate: 'GPU' | 'CPU' | null = null;

/** Which delegate the last successful model creation used, for diagnostics. */
export function getActiveDelegate(): 'GPU' | 'CPU' | null {
  return activeDelegate;
}

/** Tries the GPU first (much faster on phones) and falls back to the CPU. */
async function withDelegate<T>(create: (delegate: 'GPU' | 'CPU') => Promise<T>): Promise<T> {
  try {
    const gpu = await create('GPU');
    activeDelegate = 'GPU';
    return gpu;
  } catch {
    const cpu = await create('CPU');
    activeDelegate = 'CPU';
    return cpu;
  }
}

/**
 * An unfiltered detector, for working out what the model actually sees.
 *
 * createBallDetector() restricts results to the COCO "sports ball" class, so a
 * label mismatch, a model that cannot resolve a small fast ball, and a broken
 * inference pipeline are indistinguishable - all three show up as zero
 * detections. This one keeps every class at a very low threshold so the
 * benchmark can report which is happening. Not cached: diagnostics only.
 */
export async function createDiagnosticDetector(): Promise<ObjectDetector> {
  const vision = await fileset();
  return withDelegate((delegate) =>
    ObjectDetector.createFromOptions(vision, {
      baseOptions: { modelAssetPath: BALL_MODEL, delegate },
      runningMode: 'VIDEO',
      scoreThreshold: 0.05,
      maxResults: 10,
    })
  );
}

/**
 * A ball detector, for the benchmark only.
 *
 * The live tracker no longer uses this. Measured against a real clip it found
 * the ball in 7.1% of frames at a median confidence of 0.246, because a
 * motion-blurred ball in dim light is outside what a model trained on sharp,
 * mostly orange balls recognises; src/lib/video/motionBall.ts replaced it and
 * reached 10 of 10 attempts on the same footage. It is kept so the bench can
 * still run the comparison, and so that claim can be re-checked rather than
 * taken on trust.
 *
 * Never cached. MediaPipe's VIDEO mode requires strictly increasing timestamps
 * per instance, and anything that replays a file from the start restarts its
 * clock - a shared instance aborted the whole graph with
 * "Packet timestamp mismatch ... expected 27441001 but received 1000".
 */
export async function createBallDetector(): Promise<ObjectDetector> {
  const vision = await fileset();
  return withDelegate((delegate) => ObjectDetector.createFromOptions(vision, ballOptions(delegate)));
}

function ballOptions(delegate: 'GPU' | 'CPU') {
  return {
    baseOptions: { modelAssetPath: BALL_MODEL, delegate },
    runningMode: 'VIDEO' as const,
    // A basketball in flight is small and motion-blurred relative to the COCO
    // training images this general-purpose model learned from, so confidence
    // scores run lower than for e.g. a person or a car. 0.25 was dropping most
    // genuine balls; ShotTracker already picks the single highest-scoring
    // candidate per frame, so a lower floor trades some false positives (which
    // the player reviews and can delete) for far fewer missed true positives.
    scoreThreshold: 0.12,
    maxResults: 5,
    categoryAllowlist: ['sports ball'],
  };
}

/**
 * Throws away the shared pose landmarker so the next getPoseLandmarker() builds
 * a fresh one. A graph that has failed once (a timestamp error, a lost GPU
 * context) stays failed, so every later call on it fails too; callers drop it
 * when detectForVideo throws, and a retry then has something to work with.
 */
export function resetPoseLandmarker(): void {
  const old = posePromise;
  posePromise = null;
  old?.then((p) => p.close()).catch(() => undefined);
}

export function getPoseLandmarker(): Promise<PoseLandmarker> {
  return (posePromise ??= (async () => {
    const vision = await fileset();
    return withDelegate((delegate) =>
      PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: POSE_MODEL, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.5,
      })
    );
  })());
}
