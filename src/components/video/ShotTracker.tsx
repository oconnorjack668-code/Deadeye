// src/components/video/ShotTracker.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { ShotDetector, rimFromEdges, rimTapProblem, rimYAt, type DetectedShot, type Rim } from '@/lib/video/shotDetector';
import { expectedBallDiameter } from '@/lib/video/motionBall';
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
import { cropRectFor, ballCentreInFrame, CROP_CANVAS_PX } from '@/lib/video/crop';
import { localDateString } from '@/lib/dates';
import { ZONE_LABELS, ZONE_SPOTS, type CourtZone } from '@/lib/court';
import type { ShootingSummary } from '@/components/video/VideoAIFeedback';
import { HighlightReel } from '@/components/video/HighlightReel';
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
  const [speed, setSpeed] = useState(1);
  const [zone, setZone] = useState<CourtZone | 'all-around'>('all-around');
  const [saving, setSaving] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);

  // Live HUD state. The player is usually several metres away with the phone on a
  // tripod, so the overlay has to answer "is this working?" and "did that count?"
  // at a glance, without them walking over to look.
  const [ballVisible, setBallVisible] = useState(false);
  const [flash, setFlash] = useState<{ made: boolean; confident: boolean } | null>(null);
  const ballVisibleRef = useRef(false);
  const lastElapsedPushRef = useRef(0);
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

  // Tap the ring's left and right edges. Tracking starts on the second tap -
  // no ring to drag, no size slider, no separate "start" step.
  const [calibrating, setCalibrating] = useState(false);
  const [firstEdge, setFirstEdge] = useState<{ x: number; y: number } | null>(null);

  // Hoops measured before, so a returning player taps nothing. Read when the
  // calibrate step opens rather than on mount: localStorage does not exist while
  // this renders on the server, and seeding state from it would hydrate to a
  // different list than the server sent.
  const [savedRims, setSavedRims] = useState<SavedRim[]>([]);
  /** Name being typed in the review step to remember the rim just used. */
  const [rimName, setRimName] = useState('');
  const [rimSaved, setRimSaved] = useState(false);

  function startCalibrating() {
    setSavedRims(loadSavedRims());
    setRimSaved(false);
    setRimName('');
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
    if (step !== 'calibrate' || calibrating) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const point = {
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    };

    if (!firstEdge) {
      setFirstEdge(point);
      return;
    }

    // Checked before anything starts: a clamped rim is the worst thing that can
    // happen to detection accuracy, and starting a whole session on one wastes
    // the player's time far more than asking for the two taps again.
    const problem = rimTapProblem(firstEdge, point);
    if (problem) {
      setError(problem);
      setFirstEdge(null);
      return;
    }
    setError(null);

    const measured = rimFromEdges(firstEdge, point);
    setRim(measured);
    setFirstEdge(null);
    // Pass the measured rim directly instead of relying on the `rim` state,
    // which would still read null on this render (state is not synchronous).
    setCalibrating(true);
    startTracking(measured).finally(() => setCalibrating(false));
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
    stopRef.current = false;

    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => (lockRef.current = l)).catch(() => undefined);

    if (!cropCanvasRef.current) {
      const c = document.createElement('canvas');
      c.width = CROP_CANVAS_PX;
      c.height = CROP_CANVAS_PX;
      cropCanvasRef.current = c;
    }

    const shotDetector = new ShotDetector(calibratedRim);
    const startedAt = performance.now();
    let nextId = 1;

    // Three-frame differencing: the frame being scored is the middle one, so
    // the newest frame is held back a turn. Measured on a real clip, two-frame
    // counted one shot twice 1.3s apart where three-frame called 10 of the 10
    // actually taken.
    let older: Uint8ClampedArray | null = null;
    let held: { pixels: Uint8ClampedArray; t: number } | null = null;
    // Built on the first frame that has real dimensions: videoWidth is 0 until
    // metadata loads, and the expected ball size is derived from it.
    let ballTracker: BallTracker | null = null;

    if (source === 'file') {
      video.currentTime = 0;
      video.playbackRate = speed;
      await video.play().catch(() => undefined);
    }

    const processFrame = () => {
      if (stopRef.current) return;
      if (source === 'file' && video.ended) {
        finish();
        return;
      }
      if (video.readyState >= 2 && video.videoWidth > 0) {
        // Work on a crop around the hoop rather than the whole frame: it is
        // what makes the ball big enough to measure, and it keeps the pixel
        // work to a 320px square however large the footage is.
        const crop = cropRectFor(calibratedRim, video.videoWidth, video.videoHeight);
        const canvas = cropCanvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        ctx.drawImage(video, crop.sx, crop.sy, crop.side, crop.side, 0, 0, CROP_CANVAS_PX, CROP_CANVAS_PX);

        if (!ballTracker) {
          const rimOnCanvas = calibratedRim.width * video.videoWidth * (CROP_CANVAS_PX / crop.side);
          ballTracker = createBallTracker({ expectedDiameter: expectedBallDiameter(rimOnCanvas) });
        }

        const now = source === 'file' ? video.currentTime * 1000 : performance.now() - startedAt;
        const pixels = ctx.getImageData(0, 0, CROP_CANVAS_PX, CROP_CANVAS_PX).data;
        const ready = Boolean(older && held);
        const found =
          older && held ? ballTracker.track(older, held.pixels, CROP_CANVAS_PX, CROP_CANVAS_PX, pixels) : null;
        // The moment just scored is the middle frame's, not this one's
        const t = held ? held.t : now;
        older = held?.pixels ?? null;
        held = { pixels, t: now };

        // Crop pixels back to whole-frame fractions, so everything downstream
        // keeps working in the coordinate space it always used.
        const scale = crop.side / CROP_CANVAS_PX;
        const box = found
          ? {
              originX: found.x - found.diameter / 2,
              originY: found.y - found.diameter / 2,
              width: found.diameter,
              height: found.diameter,
            }
          : null;
        const centre = box ? ballCentreInFrame(box, crop, video.videoWidth, video.videoHeight) : null;
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
        const shot = ready ? shotDetector.push({ t, ball: centre }) : null;
        if (shot) {
          setShots((cur) => [...cur, { ...shot, id: nextId++ }]);
          navigator.vibrate?.(shot.made ? 40 : [20, 50, 20]);
          // Big transient MAKE/MISS badge: a tripod phone's buzz is useless from
          // the arc, so the confirmation has to be visual.
          setFlash({ made: shot.made, confident: shot.confident });
          if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
          flashTimerRef.current = setTimeout(() => setFlash(null), 1400);
        }
        draw(ball);

        // Only re-render on the edge, not every frame - this runs at up to 60fps
        // on a phone that is also doing ball detection on each frame.
        const seen = ball !== null;
        if (seen !== ballVisibleRef.current) {
          ballVisibleRef.current = seen;
          setBallVisible(seen);
        }
        if (t - lastElapsedPushRef.current > 250) {
          lastElapsedPushRef.current = t;
          setElapsedMs(t);
        }
        if (source === 'file' && video.duration) setProgress(video.currentTime / video.duration);
      }
      const v = video as HTMLVideoElement & { requestVideoFrameCallback?: (cb: () => void) => number };
      if (v.requestVideoFrameCallback) v.requestVideoFrameCallback(processFrame);
      else requestAnimationFrame(processFrame);
    };
    processFrame();
  }

  function finish() {
    stopRef.current = true;
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

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" title="Check this">{error}</Alert>}
      {status && <p className="text-sm text-zinc-400">{status}</p>}

      {step === 'source' && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-300">
            Put your phone on a tripod or against a wall with the <strong>whole hoop in view</strong>, side-on or behind you. Good light helps.
            Your video stays on your phone.
          </p>
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
          {step === 'calibrate' && firstEdge && (
            /* A crosshair rather than a 14px dot, which covered the rim edge it
               was marking. This tap sets the rim width and tilt, which feed the
               detection crop and the crossing test, so hitting the edge
               precisely is worth more than a marker you can see from afar. */
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${firstEdge.x * 100}%`, top: `${firstEdge.y * 100}%` }}
            >
              <div className="absolute left-1/2 top-1/2 h-px w-7 -translate-x-1/2 -translate-y-1/2 bg-white/80" />
              <div className="absolute left-1/2 top-1/2 h-7 w-px -translate-x-1/2 -translate-y-1/2 bg-white/80" />
              <div className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-500 ring-1 ring-white" />
            </div>
          )}
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

              {/* Unmistakable confirmation that a shot just registered */}
              {flash && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <div
                    className={`rounded-2xl px-6 py-3 text-4xl font-black uppercase tracking-wide shadow-2xl ${
                      flash.made ? 'bg-emerald-500/90 text-white' : 'bg-red-500/90 text-white'
                    }`}
                  >
                    {flash.made ? 'Make' : 'Miss'}
                    {!flash.confident && <span className="ml-2 align-middle text-base font-bold opacity-90">check</span>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {step === 'calibrate' && (
        <div className="space-y-3">
          <p className="text-sm text-zinc-300 flex items-center gap-2">
            <Crosshair className="h-4 w-4 flex-shrink-0 text-orange-400" />
            {calibrating
              ? 'Starting…'
              : firstEdge
                ? 'Now tap the opposite side, straight across the ring from your first tap.'
                : 'Tap the left and right edges of the ring — its widest points across, not the front and back of it. The hoop can be anywhere in the frame.'}
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
          {source === 'file' && !calibrating && (
            <label className="text-xs text-zinc-400 flex items-center gap-2">
              Analysis speed
              <select value={speed} onChange={(e) => setSpeed(Number(e.target.value))} className="rounded-lg bg-zinc-900 border border-zinc-800 px-2 py-1 text-white">
                <option value={1}>1x (most accurate)</option>
                <option value={2}>2x (faster, may miss quick shots)</option>
              </select>
            </label>
          )}
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
          </div>

          <div className="space-y-1.5 max-h-80 overflow-y-auto">
            {shots.map((s, i) => (
              <div key={s.id} className="flex items-center gap-2 rounded-lg bg-zinc-900/70 px-3 py-2 text-sm">
                <span className="w-8 text-zinc-500">#{i + 1}</span>
                <span className="w-12 text-zinc-500">{clock(s.t)}</span>
                <button type="button" onClick={() => toggleShot(s.id)} className={`flex-1 rounded-md py-1 font-semibold ${s.made ? 'bg-emerald-600/20 text-emerald-300' : 'bg-red-600/20 text-red-300'}`}>
                  {s.made ? 'Make' : 'Miss'}
                  {!s.confident && <span className="text-xs text-zinc-400"> (check)</span>}
                </button>
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
