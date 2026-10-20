// src/components/video/ShotTracker.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ShotDetector, rimFromEdges, rimTapProblem, rimYAt, type DetectedShot, type Rim } from '@/lib/video/shotDetector';
import { expectedBallDiameter } from '@/lib/video/motionBall';
import { announceShot, loadSound, DEFAULT_SOUND, type SoundSettings } from '@/lib/video/trackerSound';
import { SoundStatus } from './SoundPicker';
import { createBallTracker, type BallTracker } from '@/lib/video/ballTracker';
import {
  loadSavedRims,
  storeSavedRims,
  touchSavedRim,
  withSavedRim,
  withoutSavedRim,
  MAX_RIM_NAME,
  type SavedRim,
} from '@/lib/video/rimMemory';
import { cropRectFor, ballCentreInFrame, netBoxOnCanvas } from '@/lib/video/crop';
import { createWorkload, isRepeat } from '@/lib/video/workload';
import { localDateString } from '@/lib/dates';
import { ZONE_LABELS, ZONE_SPOTS, type CourtZone } from '@/lib/court';
import type { ShootingSummary } from '@/components/video/VideoAIFeedback';
import { HighlightReel } from '@/components/video/HighlightReel';
import { ReportProblem } from '@/components/ReportProblem';
import { RimAdjuster } from '@/components/video/RimAdjuster';
import { leftFirst, type Point } from '@/lib/video/rimAdjust';
import { Camera, FileVideo, Crosshair, Square, Trash2, Plus, Activity } from 'lucide-react';

type Step = 'source' | 'calibrate' | 'tracking' | 'review';
type Source = 'camera' | 'file';


export interface TrackedShot extends DetectedShot {
  id: number;
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function ShotTracker({
  onCheckForm,
  onSummary,
}: {
  onCheckForm?: (file: File, shotTimeMs: number) => void;
  onSummary?: (summary: ShootingSummary | null) => void;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // The chosen clip is held twice on purpose: the ref for the tracking loop,
  // which reads it outside React's render, and state for the JSX below. Reading
  // fileRef.current during render is a refs-in-render violation that bails the
  // React Compiler out of this component, and the bailout reports itself as
  // unrelated impure-render errors elsewhere in the file.
  const fileRef = useRef<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const stopRef = useRef(false);
  // Offscreen: the hoop crop is drawn here and handed to the model, never shown.
  // Created when tracking starts, not during render - document.createElement is
  // impure and would run on every render.
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const [step, setStep] = useState<Step>('source');
  const [source, setSource] = useState<Source>('file');
  const [rim, setRim] = useState<Rim | null>(null);
  const [shots, setShots] = useState<TrackedShot[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [zone, setZone] = useState<CourtZone | 'all-around'>('all-around');
  const [saving, setSaving] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Live HUD state. The player is usually several metres away with the phone on a
  // tripod, so the overlay has to answer "is this working?" and "did that count?"
  // at a glance, without them walking over to look.
  const [ballVisible, setBallVisible] = useState(false);
  // id forces a fresh element per shot, so the flash animation restarts on a
  // quick second make rather than sitting there already finished.
  const [flash, setFlash] = useState<{ id: number; made: boolean; confident: boolean; makes: number; attempts: number } | null>(null);
  const [sound, setSound] = useState<SoundSettings>(DEFAULT_SOUND);
  const ballVisibleRef = useRef(false);
  const lastElapsedPushRef = useRef(0);

  // How well the run actually went, counted in refs so counting cannot cause a
  // re-render on a device already doing pixel work every frame, and snapshotted
  // into state once at the end.
  //
  // This exists because the tracker was replaced with code that runs on the main
  // thread instead of the GPU, and every measurement of it so far has been made
  // on a laptop from a file. A phone filming live is the path most players
  // actually use and the one nobody has numbers for. It is also worth showing
  // them: counts from a run that only managed 8 frames a second deserve less
  // trust than counts from one that managed 30, and only the app knows which
  // happened.
  const analysedRef = useRef(0);
  const ballSeenRef = useRef(0);
  /** Removes the clip-ended listener; see startTracking. */
  const endedCleanupRef = useRef<(() => void) | null>(null);
  /** The run's shot detector, so finish() can call a shot still being judged. */
  const detectorRef = useRef<ShotDetector | null>(null);
  const [quality, setQuality] = useState<{ fps: number; ballSeenPct: number; frames: number } | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Release the camera, screen lock and any pending flash timer when leaving
  useEffect(
    () => () => {
      stopRef.current = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      lockRef.current?.release().catch(() => undefined);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    },
    []
  );

  // Share the reviewed shots with the AI feedback panel
  useEffect(() => {
    if (step !== 'review' || shots.length === 0) {
      onSummary?.(null);
      return;
    }
    onSummary?.({
      makes: shots.filter((x) => x.made).length,
      attempts: shots.length,
      zone,
      minutes: Math.round(elapsedMs / 60000),
    });
  }, [step, shots, zone, elapsedMs, onSummary]);

  async function openCamera() {
    setError(null);

    // iOS Safari (and most browsers) only expose the camera on a secure origin.
    // Without this check, navigator.mediaDevices is simply undefined on iPhone
    // when the app is opened over plain http://, and the generic catch below
    // used to show a misleading "allow camera access" message for that case.
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setError('Your camera needs a secure connection. Open Deadeye at its https:// address to use the camera.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('This browser does not support camera access here. Try the latest Safari or Chrome, or use "Video from your phone" instead.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        // `ideal` (not a hard constraint) so devices/browsers that can't satisfy an
        // exact match for the rear camera still return a usable stream instead of
        // throwing OverconstrainedError.
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      setSource('camera');
      startCalibrating();
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => undefined);
        }
      });
    } catch (err) {
      const name = err instanceof DOMException ? err.name : null;
      if (name === 'NotAllowedError') {
        setError('Camera access was blocked. Allow the camera for Deadeye in your browser or phone Settings, then try again.');
      } else if (name === 'NotFoundError') {
        setError('No camera was found on this device.');
      } else if (name === 'NotReadableError') {
        setError('The camera is already in use by another app. Close other camera apps and try again.');
      } else {
        setError('Could not open the camera. Try "Video from your phone" instead, or reload and try again.');
      }
    }
  }

  function openFile(file: File) {
    fileRef.current = file;
    setVideoFile(file);
    setSource('file');
    startCalibrating();
    requestAnimationFrame(() => {
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(file);
        videoRef.current.currentTime = 0.1;
      }
    });
  }

  // Tap the ring's left and right edges, then fine-tune both in a magnified
  // view before tracking starts. Tracking used to start on the second tap, with
  // nothing to adjust - and on a clip where the ring was 18 points wide on the
  // screen, where the taps landed moved the count between 22 and 31 shots
  // right out of 31. See src/lib/video/rimAdjust.ts.
  const [calibrating, setCalibrating] = useState(false);
  const [firstEdge, setFirstEdge] = useState<{ x: number; y: number } | null>(null);
  const [edges, setEdges] = useState<[Point, Point] | null>(null);

  // Hoops measured before, so a returning player taps nothing. Read when the
  // calibrate step opens rather than on mount: localStorage does not exist while
  // this renders on the server, and seeding state from it would hydrate to a
  // different list than the server sent.
  const [savedRims, setSavedRims] = useState<SavedRim[]>([]);
  /** Name being typed in the review step to remember the rim just used. */
  const [rimName, setRimName] = useState('');
  const [rimSaved, setRimSaved] = useState(false);

  function startCalibrating() {
    // Read here rather than on mount: localStorage does not exist while this
    // renders on the server, and seeding state from it would hydrate to a
    // different value than the server sent.
    setSound(loadSound());
    setSavedRims(loadSavedRims());
    setRimSaved(false);
    setRimName('');
    setFirstEdge(null);
    setEdges(null);
    setStep('calibrate');
  }

  /**
   * Skips both taps: this hoop was measured on this device already.
   *
   * Takes the event and reads the id off a data attribute, rather than the
   * tidier `onClick={() => startFromSavedRim(s)}`. Called from a closure built
   * during render, the React Compiler analyses this body - and everything it
   * calls, which includes startTracking - as render code, and rejects the
   * Date.now() below and the performance.now() in there as impure calls during
   * render. Handed to onClick directly, as tapRim is, it is understood as an
   * event handler. Keep it a direct reference.
   *
   * Not named useSavedRim either: the hooks lint rule reads any `use` prefix as
   * a hook, and calling a hook from a callback is its own error.
   */
  function startFromSavedRim(e: React.MouseEvent<HTMLButtonElement>) {
    const entry = savedRims.find((s) => s.id === e.currentTarget.dataset.rimId);
    if (!entry) return;
    const next = touchSavedRim(savedRims, entry.id, Date.now());
    setSavedRims(next);
    storeSavedRims(next);
    setRim(entry.rim);
    setFirstEdge(null);
    setCalibrating(true);
    startTracking(entry.rim).finally(() => setCalibrating(false));
  }

  function saveCurrentRim() {
    if (!rim || !rimName.trim()) return;
    const next = withSavedRim(savedRims, rimName, rim, Date.now());
    setSavedRims(next);
    storeSavedRims(next);
    setRimSaved(true);
  }

  function forgetRim(id: string) {
    const next = withoutSavedRim(savedRims, id);
    setSavedRims(next);
    storeSavedRims(next);
  }

  function tapRim(e: React.MouseEvent<HTMLCanvasElement>) {
    // While adjusting, the magnified view below is where the ends move
    if (step !== 'calibrate' || calibrating || edges) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const point = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };

    if (!firstEdge) {
      setFirstEdge(point);
      return;
    }

    setError(null);
    setEdges(leftFirst(firstEdge, point));
    setFirstEdge(null);
  }

  /** Starts tracking on the ends as adjusted in the magnified view. */
  function confirmEdges() {
    if (!edges) return;
    // Checked before anything starts: a clamped rim is the worst thing that can
    // happen to detection accuracy, and starting a whole session on one wastes
    // the player's time far more than asking for the ends to be moved.
    const problem = rimTapProblem(edges[0], edges[1]);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const measured = rimFromEdges(edges[0], edges[1]);
    setRim(measured);
    setEdges(null);
    // Pass the measured rim directly instead of relying on the `rim` state,
    // which would still read null on this render (state is not synchronous).
    setCalibrating(true);
    startTracking(measured).finally(() => setCalibrating(false));
  }

  function redoEdges() {
    setEdges(null);
    setFirstEdge(null);
    setError(null);
  }

  // Draws a small, fixed marker at the rim (while tracking) and the detected ball
  function draw(ball?: { x: number; y: number; w: number; h: number } | null) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // The first edge marker is a DOM overlay, not canvas: draw() runs from the
    // tracking loop and would read a stale firstEdge from its closure.
    if (rim) {
      // The measured rim, drawn as the span between the two taps so the player
      // can see what was actually captured rather than trusting a dot.
      // Follows the rim's tilt, so what is drawn is the line the crossing test
      // actually uses. Each end's height comes from rimYAt at that end's x.
      const leftX = rim.x - rim.width / 2;
      const rightX = rim.x + rim.width / 2;
      const ends: Array<[number, number]> = [
        [leftX * canvas.width, rimYAt(rim, leftX) * canvas.height],
        [rightX * canvas.width, rimYAt(rim, rightX) * canvas.height],
      ];
      ctx.strokeStyle = '#f97316';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(ends[0][0], ends[0][1]);
      ctx.lineTo(ends[1][0], ends[1][1]);
      ctx.stroke();
      ctx.fillStyle = '#f97316';
      for (const [ex, ey] of ends) {
        ctx.beginPath();
        ctx.arc(ex, ey, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (ball) {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.strokeRect(ball.x * canvas.width, ball.y * canvas.height, ball.w * canvas.width, ball.h * canvas.height);
    }
  }

  async function startTracking(calibratedRim: Rim) {
    const video = videoRef.current;
    if (!video) return;
    setError(null);
    // No model to fetch any more: the tracker is pixel maths, so tracking can
    // start the instant the rim is set, offline, with nothing downloaded.
    setStatus(null);
    setShots([]);
    setStep('tracking');
    setFlash(null);
    setBallVisible(false);
    ballVisibleRef.current = false;
    lastElapsedPushRef.current = 0;
    analysedRef.current = 0;
    ballSeenRef.current = 0;
    setQuality(null);
    stopRef.current = false;

    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => (lockRef.current = l)).catch(() => undefined);

    // The canvas is sized per frame from the workload below
    if (!cropCanvasRef.current) cropCanvasRef.current = document.createElement('canvas');

    const startedAt = performance.now();
    let nextId = 1;

    // Three-frame differencing: the frame being scored is the middle one, so
    // the newest frame is held back a turn. Measured on a real clip, two-frame
    // counted one shot twice 1.3s apart where three-frame called 10 of the 10
    // actually taken.
    let older: Uint8ClampedArray | null = null;
    let held: { pixels: Uint8ClampedArray; t: number } | null = null;
    // Built on the first frame that has real dimensions: videoWidth is 0 until
    // metadata loads, and the expected ball size and the frame's shape are
    // derived from it. The tracker is rebuilt if the canvas changes size.
    let ballTracker: BallTracker | null = null;
    let trackerCanvas = 0;
    let shotDetector: ShotDetector | null = null;

    if (source === 'file') {
      video.currentTime = 0;
      // Always real time: never faster (see the note where the 2x selector
      // used to be), and never slower either - see src/lib/video/workload.ts
      video.playbackRate = 1;
      await video.play().catch(() => undefined);
    }

    // The end of a clip is an event, and has to be listened for.
    // requestVideoFrameCallback below only fires while new frames are being
    // presented for composition; once a clip ends none are, so nothing ever
    // schedules processFrame again and the video.ended check inside it is
    // never reached. The run then sat there, finished but not finishing, until
    // the player pressed "Stop early and review" - which looked exactly like
    // the analysis being slow. Same deadlock the benchmark had, left behind
    // here when that one was fixed.
    if (source === 'file') {
      endedCleanupRef.current?.();
      const onEnded = () => finish();
      video.addEventListener('ended', onEnded);
      endedCleanupRef.current = () => video.removeEventListener('ended', onEnded);
    }

    // Thins 60 fps to the 30 the tracker was measured at, and gives a device
    // that cannot keep up a smaller picture to work on instead of slowing the
    // clip (src/lib/video/workload.ts). The camera is live, so the same applies.
    const workload = createWorkload();

    /** Scores one presented frame. Returns early, without scoring, for frames that are not wanted. */
    const scoreFrame = (meta?: { mediaTime?: number }) => {
      // mediaTime is the time of the frame actually presented, where
      // currentTime can already have moved on to the next one
      const now = source === 'file' ? (meta?.mediaTime ?? video.currentTime) * 1000 : performance.now() - startedAt;
      // 60 fps is thinned to 30 before any pixel work is done
      if (!workload.wants(now)) return;

      // Work on a crop around the hoop rather than the whole frame: it is
      // what makes the ball big enough to measure, and it keeps the pixel
      // work to a small square however large the footage is.
      const crop = cropRectFor(calibratedRim, video.videoWidth, video.videoHeight);
      const px = workload.canvas();
      const canvas = cropCanvasRef.current;
      if (!canvas) return;
      if (canvas.width !== px) {
        canvas.width = px;
        canvas.height = px;
      }
      // willReadFrequently because the tracker calls getImageData on this
      // canvas every single frame. A 2d context is GPU-backed by default and
      // each read forces a readback across that boundary; this asks for a
      // CPU-backed one instead, which is the cheap half of keeping the pixel
      // work inside a phone's frame budget.
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, crop.sx, crop.sy, crop.side, crop.side, 0, 0, px, px);

      if (!ballTracker || trackerCanvas !== px) {
        // A new size means new pixels to compare, so the frames held for
        // differencing start again too
        const rimOnCanvas = calibratedRim.width * video.videoWidth * (px / crop.side);
        ballTracker = createBallTracker({
          expectedDiameter: expectedBallDiameter(rimOnCanvas),
          net: netBoxOnCanvas(calibratedRim, crop, video.videoWidth, video.videoHeight, px),
        });
        trackerCanvas = px;
        older = null;
        held = null;
      }
      if (!shotDetector) {
        shotDetector = new ShotDetector(calibratedRim, { aspect: video.videoHeight / video.videoWidth });
        detectorRef.current = shotDetector;
      }

      const pixels = ctx.getImageData(0, 0, px, px).data;
      // A frame shown twice has no motion in it to find, and comparing
      // against the copy would hide the ball on exactly that frame
      if (held && isRepeat(pixels, held.pixels)) return;
      workload.scored(now);
      const ready = Boolean(older && held);
      const found = older && held ? ballTracker.track(older, held.pixels, px, px, pixels, held.t) : null;
      // The moment just scored is the middle frame's, not this one's
      const t = held ? held.t : now;
      older = held?.pixels ?? null;
      held = { pixels, t: now };

      // Crop pixels back to whole-frame fractions, so everything downstream
      // keeps working in the coordinate space it always used.
      const scale = crop.side / px;
      const box = found
        ? {
            originX: found.x - found.diameter / 2,
            originY: found.y - found.diameter / 2,
            width: found.diameter,
            height: found.diameter,
          }
        : null;
      const centre = box ? ballCentreInFrame(box, crop, video.videoWidth, video.videoHeight, px) : null;
      const ball =
        box && centre
          ? {
              w: (box.width * scale) / video.videoWidth,
              h: (box.height * scale) / video.videoHeight,
              x: centre.x - (box.width * scale) / video.videoWidth / 2,
              y: centre.y - (box.height * scale) / video.videoHeight / 2,
            }
          : null;
      // Nothing has been scored until three frames have arrived
      const shot = ready
        ? shotDetector.push({
            t,
            ball: centre,
            net: ballTracker.netMotion() ?? undefined,
            under: ballTracker.underNet(),
            id: ballTracker.ballId(),
          })
        : null;
      if (shot) {
        setShots((cur) => [...cur, { ...shot, id: nextId++ }]);
        navigator.vibrate?.(shot.made ? 40 : [20, 50, 20]);
        // Big transient MAKE/MISS badge: a tripod phone's buzz is useless from
        // the arc, so the confirmation has to be visual.
        //
        // Counted from the detector rather than from `shots` state, which has
        // not re-rendered yet, and rather than from the id counter, which is
        // incremented inside a state updater React may replay.
        const attempts = shotDetector.shots.length;
        const made = shotDetector.shots.filter((s) => s.made).length;
        setFlash({ id: attempts, made: shot.made, confident: shot.confident, makes: made, attempts });
        // A phone on a tripod is metres away and the player is usually facing
        // the hoop, so sound is the part of the confirmation that reaches
        // them. Silent unless they asked for it.
        announceShot(sound, shot.made, made, attempts);
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        flashTimerRef.current = setTimeout(() => setFlash(null), 1400);
      }
      draw(ball);

      // Only re-render on the edge, not every frame - this runs at up to 60fps
      // on a phone that is also doing ball detection on each frame.
      const seen = ball !== null;
      // Only frames that were actually scored: the first two of a run have no
      // middle frame to measure, and counting them would flatter the rate.
      if (ready) {
        analysedRef.current += 1;
        if (seen) ballSeenRef.current += 1;
      }
      if (seen !== ballVisibleRef.current) {
        ballVisibleRef.current = seen;
        setBallVisible(seen);
      }
      if (t - lastElapsedPushRef.current > 250) {
        lastElapsedPushRef.current = t;
        setElapsedMs(t);
      }
      if (source === 'file' && video.duration) setProgress(video.currentTime / video.duration);
    };

    const processFrame = (_now?: number, meta?: { mediaTime?: number }) => {
      if (stopRef.current) return;
      if (source === 'file' && video.ended) {
        finish();
        return;
      }
      if (video.readyState >= 2 && video.videoWidth > 0) scoreFrame(meta);
      const v = video as HTMLVideoElement & {
        requestVideoFrameCallback?: (cb: (now: number, meta: { mediaTime?: number }) => void) => number;
      };
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(processFrame);
      else requestAnimationFrame(processFrame);
    };
    processFrame();
  }

  function finish() {
    // Guarded because two things now call this: the ended listener and the
    // stop button. Without it a clip that ends while the player is reaching
    // for stop would run the whole teardown twice.
    if (stopRef.current) return;
    stopRef.current = true;
    endedCleanupRef.current?.();
    endedCleanupRef.current = null;
    // A shot can still be being judged when the clip ends - the call waits on
    // what the net does next - and without this the last shot was dropped
    const last = detectorRef.current?.finish();
    detectorRef.current = null;
    if (last) setShots((cur) => [...cur, { ...last, id: (cur.at(-1)?.id ?? 0) + 1 }]);
    // Snapshot how the run went before anything is torn down. Seconds come from
    // the clip for a file and from the clock for the camera, which is the same
    // distinction the tracking loop makes.
    const video = videoRef.current;
    const seconds =
      source === 'file' && video?.duration
        ? Math.min(video.currentTime, video.duration)
        : elapsedMs / 1000;
    const frames = analysedRef.current;
    if (frames > 0 && seconds > 0.5) {
      setQuality({
        frames,
        fps: frames / seconds,
        ballSeenPct: (ballSeenRef.current / frames) * 100,
      });
    }
    videoRef.current?.pause();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    lockRef.current?.release().catch(() => undefined);
    setStep('review');
  }

  function toggleShot(id: number) {
    setShots((cur) => cur.map((s) => (s.id === id ? { ...s, made: !s.made, confident: true } : s)));
  }

  function addShot(made: boolean) {
    setShots((cur) => [...cur, { id: Date.now(), t: elapsedMs, made, confident: true }]);
  }

  async function saveSession() {
    if (shots.length === 0) {
      setError('There are no shots to save.');
      return;
    }
    setSaving(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push('/login');
      return;
    }
    const makes = shots.filter((s) => s.made).length;
    const minutes = Math.min(360, Math.max(5, Math.round(elapsedMs / 60000)));
    const date = localDateString();

    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .insert({
        user_id: user.id,
        session_date: date,
        session_type: 'shooting',
        duration_minutes: minutes,
        intensity_rpe: 6,
        perceived_quality: 3,
        notes: `Tracked with Deadeye video shot tracking (${source === 'camera' ? 'live camera' : 'video'})`,
        // The one place this is ever set. It records that a camera watched
        // these shots, not that the count is right - the player has just
        // corrected it by hand on the screen before this, which is rather the
        // point.
        verified_by_video: true,
      })
      .select('id')
      .single();
    if (sessionError || !session) {
      setError(`Could not save the session: ${sessionError?.message || 'unknown error'}`);
      setSaving(false);
      return;
    }
    const { data: drill, error: drillError } = await supabase
      .from('session_drills')
      .insert({ session_id: session.id, user_id: user.id, drill_name: 'Video shot tracking', drill_category: 'shooting', duration_minutes: minutes })
      .select('id')
      .single();
    const { error: entryError } = drill
      ? await supabase.from('shooting_entries').insert({ drill_id: drill.id, user_id: user.id, shot_zone: zone, makes, attempts: shots.length })
      : { error: drillError };
    if (drillError || entryError) {
      await supabase.from('training_sessions').delete().eq('id', session.id);
      setError('Could not save your shots. Nothing was saved, please try again.');
      setSaving(false);
      return;
    }
    await supabase.from('video_analyses').insert({
      user_id: user.id,
      kind: 'shot_tracking',
      session_id: session.id,
      summary: { source, zone, makes, attempts: shots.length, shots: shots.map((s) => ({ t: Math.round(s.t), made: s.made })) },
    });
    router.push(`/basketball/${session.id}`);
  }

  const makes = shots.filter((s) => s.made).length;
  const unresolved = shots.filter((s) => !s.confident).length;

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" title="Check this">{error}</Alert>}
      {status && <p className="text-sm text-zinc-400">{status}</p>}

      {step === 'source' && (
        <div className="space-y-3">
          {/* Where the phone is matters more than anything the tracker does
              afterwards. Each of these was a measured cause of wrong calls on
              the test sessions: a hoop too small in the picture, a camera
              side-on and low, bright windows behind the ring, and a copy of the
              video at half the resolution of the original. */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="mb-2 text-sm font-semibold text-white">For the most accurate count</p>
            <ul className="space-y-1.5 text-sm text-zinc-300">
              <li>• Phone on a tripod or propped up, not in your hand</li>
              <li>• 3 to 6 metres from the hoop, at an angle rather than side-on, at head height or higher</li>
              <li>• The whole ring and net in shot, big in the picture, with room above for the ball</li>
              <li>• Not facing bright windows or the sun</li>
              <li>• Upload the original video, not a screen recording or one sent through a messaging app</li>
            </ul>
            <p className="mt-2 text-xs text-zinc-500">Your video stays on your phone.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button type="button" onClick={openCamera} className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-left hover:bg-zinc-900">
              <Camera className="h-6 w-6 text-orange-400" />
              <div>
                <div className="font-semibold text-white">Live camera</div>
                <div className="text-xs text-zinc-500">Counts shots as you shoot, any length</div>
              </div>
            </button>
            <label className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 cursor-pointer hover:bg-zinc-900">
              <FileVideo className="h-6 w-6 text-orange-400" />
              <div>
                <div className="font-semibold text-white">Video from your phone</div>
                <div className="text-xs text-zinc-500">Analysed on your phone, any size</div>
              </div>
              <input type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && openFile(e.target.files[0])} />
            </label>
          </div>
        </div>
      )}

      {step !== 'source' && step !== 'review' && (
        <div className="relative w-full overflow-hidden rounded-2xl bg-black">
          <video ref={videoRef} playsInline muted className="w-full h-auto" />
          <canvas ref={canvasRef} onClick={tapRim} className="absolute inset-0 h-full w-full touch-manipulation" />
          {step === 'calibrate' &&
            (edges ?? (firstEdge ? [firstEdge] : [])).map((edge, i) => (
              /* A crosshair rather than a 14px dot, which covered the rim edge it
                 was marking. These set the rim width and tilt, which feed the
                 detection crop and the crossing test, so hitting the edge
                 precisely is worth more than a marker you can see from afar. */
              <div
                key={i}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${edge.x * 100}%`, top: `${edge.y * 100}%` }}
              >
                <div className="absolute left-1/2 top-1/2 h-px w-7 -translate-x-1/2 -translate-y-1/2 bg-white/80" />
                <div className="absolute left-1/2 top-1/2 h-7 w-px -translate-x-1/2 -translate-y-1/2 bg-white/80" />
                <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500 ring-1 ring-white" />
              </div>
            ))}
          {step === 'tracking' && (
            <>
              {/* Scrim so the readout stays legible against a bright gym or sky */}
              <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent" />

              {/* Primary readout: sized to be read from the three-point line */}
              <div className="pointer-events-none absolute left-3 top-2 text-white" aria-live="polite" aria-atomic="true">
                <div className="flex items-end gap-2">
                  <span className="text-5xl sm:text-6xl font-black leading-none tabular-nums drop-shadow-lg">
                    {makes}
                    <span className="text-3xl sm:text-4xl text-zinc-300">/{shots.length}</span>
                  </span>
                  <span className="mb-1 text-2xl sm:text-3xl font-black leading-none text-orange-400 tabular-nums drop-shadow-lg">
                    {shots.length ? Math.round((makes / shots.length) * 100) : 0}%
                  </span>
                </div>
                <div className="mt-1 text-sm font-semibold tabular-nums text-zinc-300 drop-shadow">{clock(elapsedMs)}</div>
              </div>

              {/* Is it actually tracking? Answered without walking back to the phone. */}
              <div
                className={`pointer-events-none absolute right-3 top-3 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-sm ${
                  ballVisible ? 'bg-emerald-500/90 text-white' : 'bg-amber-500/90 text-black'
                }`}
              >
                <span className={`h-2 w-2 rounded-full bg-current ${ballVisible ? '' : 'animate-pulse'}`} />
                {ballVisible ? 'Ball tracked' : 'Looking for ball'}
              </div>

              {/* Last 8 results, newest on the right */}
              {shots.length > 0 && (
                <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5">
                  {shots.slice(-8).map((s) => (
                    <span
                      key={s.id}
                      className={`h-2.5 w-2.5 rounded-full ring-1 ring-black/40 ${s.made ? 'bg-emerald-400' : 'bg-red-400'}`}
                    />
                  ))}
                </div>
              )}

              {/* Confirmation a shot registered, read from the arc rather than
                  up close: a tinted wash of the whole frame carries at a
                  distance where a centred box does not, and leaves the hoop
                  visible underneath instead of covering it. The old version
                  was a solid slab in the middle of the picture. */}
              {flash && (
                <div
                  key={flash.id}
                  className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center deadeye-flash ${
                    flash.made ? 'bg-emerald-500/25' : 'bg-red-500/20'
                  }`}
                >
                  <span
                    className={`text-6xl font-black uppercase tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] sm:text-7xl ${
                      flash.made ? 'text-emerald-300' : 'text-red-300'
                    }`}
                  >
                    {flash.made ? 'Make' : 'Miss'}
                  </span>
                  <span className="mt-1 text-2xl font-black tabular-nums text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                    {flash.makes}/{flash.attempts}
                  </span>
                  {!flash.confident && (
                    <span className="mt-1 rounded-full bg-amber-500/90 px-2.5 py-0.5 text-xs font-bold uppercase text-zinc-950">
                      check this one
                    </span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {step === 'calibrate' && edges && !calibrating && (
        <RimAdjuster videoRef={videoRef} edges={edges} onChange={setEdges} onStart={confirmEdges} onRedo={redoEdges} />
      )}

      {step === 'calibrate' && !edges && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-300 flex items-center gap-2">
            <Crosshair className="h-4 w-4 flex-shrink-0 text-orange-400" />
            {calibrating
              ? 'Starting…'
              : firstEdge
                ? 'Now tap the right-hand edge, straight across the ring from your first tap.'
                : 'Tap the far left of the metal ring, then the far right - its widest points across, not the front and back of it. You can fine-tune both in a zoomed view next.'}
          </p>
          {firstEdge && !calibrating && (
            <button type="button" onClick={() => setFirstEdge(null)} className="text-xs text-zinc-500 underline">
              Start the rim again
            </button>
          )}

          {/* Measured here before, on this device, at this camera position. Only
              offered before the first tap - once a tap has landed the player is
              clearly measuring a new one. */}
          {savedRims.length > 0 && !firstEdge && !calibrating && (
            <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Or start on a hoop you have measured
              </p>
              <div className="space-y-1.5">
                {savedRims.map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      data-rim-id={s.id}
                      onClick={startFromSavedRim}
                      className="flex-1 min-w-0 rounded-xl border border-zinc-700/80 bg-zinc-900 px-3 py-2 text-left text-sm font-semibold text-zinc-100 hover:border-orange-500/60"
                    >
                      <span className="block truncate">{s.name}</span>
                      <span className="block text-xs font-normal text-zinc-500">
                        {(s.rim.width * 100).toFixed(1)}% wide · starts tracking straight away
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => forgetRim(s.id)}
                      aria-label={`Forget ${s.name}`}
                      className="flex-shrink-0 rounded-lg p-2 text-zinc-500 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-zinc-500">
                A saved rim only fits the spot the camera was in when you measured it. If the phone has moved,
                tap the rim again.
              </p>
            </div>
          )}
          {/* A 2x option used to live here. Measured against hand-labelled
              shots it cost one call in ten and failed towards inventing makes:
              a shot 1.92 half-rims outside the ring collapsed to 1.06 and was
              called good, because halving the samples puts the sighting below
              the rim after the ball has already deflected off it. That is lost
              information rather than a tuning problem, so there was no honest
              way to keep the speed and the accuracy. A tracker people can
              trust is the entire proposition; a faster one that is sometimes
              wrong is worth nothing. */}

          {/* The picker itself lives in Settings. It is chosen once and wanted
              on every session, so what belongs here is confirmation of what
              will be heard and one button to silence it. */}
          {!calibrating && <SoundStatus value={sound} onChange={setSound} />}
        </div>
      )}

      {step === 'tracking' && (
        <div className="space-y-2">
          {source === 'file' && (
            <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div className="h-full bg-orange-500" style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          <p className="text-xs text-zinc-500 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            {shots.length === 0 && !ballVisible
              ? 'No ball detected yet. Keep the ball and the hoop in frame, in good light.'
              : 'Counting shots. Every one can be corrected before you save.'}
          </p>
          <Button variant="secondary" size="lg" className="w-full gap-2" onClick={finish}>
            <Square className="h-4 w-4" /> {source === 'camera' ? 'Stop and review' : 'Stop early and review'}
          </Button>
        </div>
      )}

      {step === 'review' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-center">
            <div className="text-4xl font-black text-orange-400">
              {makes}/{shots.length}
            </div>
            <div className="text-sm text-zinc-400">{shots.length ? Math.round((makes / shots.length) * 100) : 0}% · tap a shot to switch make/miss</div>
            {/* Counted at the top, because an unresolved shot is currently
                saved as a miss and the player should know how many of these
                the number above is resting on. */}
            {unresolved > 0 && (
              <div className="mt-1 text-sm font-semibold text-amber-400">
                {unresolved} shot{unresolved === 1 ? '' : 's'} the tracker could not call - set {unresolved === 1 ? 'it' : 'them'} below
              </div>
            )}
          </div>

          {/* How well the tracking itself went. Counts from a run that managed
              8 frames a second deserve less trust than one that managed 30, and
              only the app knows which happened - so say it, rather than letting
              the player assume every run is equal. Also the only measurement
              there is of the live camera path on a real phone. */}
          {quality && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold uppercase tracking-wider text-zinc-400">Tracking quality</span>
                <span className="tabular-nums text-zinc-400">{quality.fps.toFixed(0)} fps analysed</span>
              </div>
              {/* Judged on how many shots the tracker was unsure of, not on how
                  often the ball was in view. The tracker reports only a ball in
                  flight, which on a normal session is under a tenth of the
                  frames, so a warning at 15% fired on every run. */}
              <p className="mt-1.5 text-xs text-zinc-500">
                {quality.fps < 12
                  ? 'That is a low frame rate, so shots may have been missed between frames. Closing other apps, or filming a clip and analysing it afterwards, gives the tracker more to work with.'
                  : shots.length > 0 && unresolved / shots.length > 0.2
                    ? 'The tracker was unsure of a lot of these. That is usually the hoop being small in the picture, dim light, or bright windows behind it - the tips on the first screen help most.'
                    : 'Good conditions. The counts below should be close, but check them anyway.'}
              </p>
            </div>
          )}

          {/* The player is the only one who saw what really happened, and this
              is the moment they know it. The run's numbers go with the report
              so it can be matched to what the tracker did. */}
          <ReportProblem
            label="Tracker got this wrong? Tell us"
            context={`Shot tracker, ${source === 'camera' ? 'live camera' : 'video'}: ${makes}/${shots.length} on screen, ${unresolved} unclear${
              quality ? `, ${quality.fps.toFixed(0)} fps` : ''
            }, ${ZONE_LABELS[zone]}`}
            className="text-xs text-zinc-500 underline"
            panelClassName="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"
          />

          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {shots.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg bg-zinc-900/70 px-3 py-2 text-sm">
                <span className="w-8 text-zinc-500">#{i + 1}</span>
                <span className="w-12 text-zinc-500">{clock(s.t)}</span>
                {/* A shot the detector never actually watched cross the rim is
                    not a miss, it is a question - and it was being shown in the
                    same red as a miss it had really seen, which invites the
                    player to scroll past it. Two explicit buttons instead of a
                    toggle, because a toggle makes confirming the guess cost two
                    taps and changing it cost one. */}
                {s.confident ? (
                  <button type="button" onClick={() => toggleShot(s.id)} className={`flex-1 rounded-md py-1 font-semibold ${s.made ? 'bg-emerald-600/20 text-emerald-300' : 'bg-red-600/20 text-red-300'}`}>
                    {s.made ? 'Make' : 'Miss'}
                  </button>
                ) : (
                  <div className="flex flex-1 items-center gap-1.5">
                    <span className="text-xs font-semibold text-amber-400">Unclear</span>
                    <button
                      type="button"
                      onClick={() => setShots((cur) => cur.map((x) => (x.id === s.id ? { ...x, made: true, confident: true } : x)))}
                      className="flex-1 rounded-md border border-emerald-600/40 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/20"
                    >
                      Make
                    </button>
                    <button
                      type="button"
                      onClick={() => setShots((cur) => cur.map((x) => (x.id === s.id ? { ...x, made: false, confident: true } : x)))}
                      className="flex-1 rounded-md border border-red-600/40 py-1 text-xs font-semibold text-red-300 hover:bg-red-600/20"
                    >
                      Miss
                    </button>
                  </div>
                )}
                {source === 'file' && onCheckForm && videoFile && (
                  <button type="button" onClick={() => onCheckForm(videoFile, s.t)} className="text-xs text-cyan-400 underline">
                    Form
                  </button>
                )}
                <button type="button" onClick={() => setShots((cur) => cur.filter((x) => x.id !== s.id))} aria-label={`Delete shot ${i + 1}`} className="text-zinc-500 hover:text-red-400">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
            {shots.length === 0 && (
              <p className="text-sm text-zinc-500">
                No shots were detected. Make sure the ball is visible for its whole flight toward the hoop, in good light, with nothing else moving in frame.
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={() => addShot(true)} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-zinc-800 py-2 text-xs font-semibold text-zinc-200">
              <Plus className="h-3.5 w-3.5" /> Add a make it missed
            </button>
            <button type="button" onClick={() => addShot(false)} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-zinc-800 py-2 text-xs font-semibold text-zinc-200">
              <Plus className="h-3.5 w-3.5" /> Add a miss it missed
            </button>
          </div>

          {/* Offered here rather than the moment the rim is measured, because
              here the player knows whether the detection actually worked. A rim
              that produced nonsense is not one worth skipping the taps for. */}
          {rim && shots.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
              {rimSaved ? (
                <p className="text-sm text-emerald-300">
                  Hoop saved. Next time at this spot you can start tracking without tapping the rim.
                </p>
              ) : (
                <>
                  <label htmlFor="rim-name" className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Remember this hoop?
                  </label>
                  <p className="mt-1 text-xs text-zinc-500">
                    Skip the two taps next time you film from this spot.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="rim-name"
                      value={rimName}
                      onChange={(e) => setRimName(e.target.value)}
                      maxLength={MAX_RIM_NAME}
                      placeholder="e.g. Home driveway"
                      className="flex-1 min-w-0 rounded-xl border border-zinc-700/80 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-500 focus:border-orange-500 focus:outline-none"
                    />
                    <Button variant="secondary" size="sm" disabled={!rimName.trim()} onClick={saveCurrentRim}>
                      Save
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <label className="block text-sm text-zinc-300">
            Where were you shooting from?
            <select value={zone} onChange={(e) => setZone(e.target.value as CourtZone | 'all-around')} className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-white">
              <option value="all-around">{ZONE_LABELS['all-around']} (moving around)</option>
              {(Object.keys(ZONE_SPOTS) as CourtZone[]).map((z) => (
                <option key={z} value={z}>
                  {ZONE_LABELS[z]}
                </option>
              ))}
            </select>
          </label>

          {source === 'file' && videoFile ? (
            <HighlightReel
              file={videoFile}
              makeTimesMs={shots.filter((s) => s.made).map((s) => s.t)}
              makes={makes}
              attempts={shots.length}
            />
          ) : (
            makes > 0 && (
              <p className="text-xs text-zinc-500">
                Tip: film with your phone&apos;s camera app and choose &ldquo;Video from your phone&rdquo; to also get a highlight reel of your makes.
              </p>
            )
          )}
          <Button variant="primary" size="lg" className="w-full" isLoading={saving} onClick={saveSession}>
            Save as a Hoops session
          </Button>
          <button type="button" onClick={() => { setShots([]); setRim(null); setStep('source'); }} className="w-full text-center text-xs text-zinc-500">
            Start over
          </button>
        </div>
      )}
    </div>
  );
}
