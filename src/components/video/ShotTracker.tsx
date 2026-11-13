// src/components/video/ShotTracker.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { rimFromEdges, rimTapProblem, rimYAt, type DetectedShot, type Rim } from '@/lib/video/shotDetector';
import { addedShot, buildSummary, deviceClass, fromDetected, toSavedShot, type RunQuality, type ShotZoneChoice, type TrackedShot } from '@/lib/video/trackedShots';
import type { Json } from '@/lib/supabase/types';
import { announceShot, loadSound, preloadRecordings, DEFAULT_SOUND, type SoundSettings } from '@/lib/video/trackerSound';
import { SoundStatus } from './SoundPicker';
import {
  loadSavedRims,
  storeSavedRims,
  touchSavedRim,
  withSavedRim,
  withoutSavedRim,
  MAX_RIM_NAME,
  type SavedRim,
} from '@/lib/video/rimMemory';
import { cropRectFor } from '@/lib/video/crop';
import { createWorkload, repeatSignature, sameSignature } from '@/lib/video/workload';
import { createEngine, type TrackerEngine } from '@/lib/video/trackerEngine';
import type { PipelineFrame } from '@/lib/video/trackerPipeline';
import { shiftInFrame, type Shift } from '@/lib/video/cameraShift';
import { createHealthMonitor, type HealthMonitor, type HealthReading } from '@/lib/video/liveHealth';
import { startLiveRecorder, resolveDuration, type LiveRecorder, type LiveRecording } from '@/lib/video/liveRecorder';
import { describeMode, drillCue, drillProgress, zoneForShot, FREE, type DrillMode } from '@/lib/video/drillModes';
import { activeMs, IDLE_MS, streaks, zoneTotals } from '@/lib/video/shotStats';
import {
  BANNER_MS,
  createOverlayLog,
  heatLevel,
  mediaAtClock,
  milestoneFor,
  rimTone,
  TRAIL_MS,
  TRAIL_POINTS,
  type OverlayLog,
  type OverlayTimeline,
} from '@/lib/video/overlayTimeline';
import { drawBall, drawRim } from '@/lib/video/overlayArt';
import { TrackerVideoExport } from './TrackerVideoExport';
import { loadShootingBest, MIN_PB_ATTEMPTS, personalBest, type ShootingTally } from '@/lib/video/personalBest';
import { benchClip } from '@/lib/video/benchLabels';
import { findRimSteady } from '@/lib/video/rimFinder';
import { captureFrame, loadRimModel, rimModelCached, sampler, RimFinderError, RIM_MODEL_BYTES, type RimModel } from '@/lib/video/rimModel';
import { reportError } from '@/lib/reportError';

/** Where "Find the hoop for me" has got to. */
type FinderState =
  | { state: 'idle' | 'starting' | 'preparing' | 'looking' | 'none' }
  | { state: 'downloading'; progress: number }
  | { state: 'failed'; reason: RimFinderError['stage'] };

function finderBusy(state: FinderState['state']): boolean {
  return state === 'starting' || state === 'downloading' || state === 'preparing' || state === 'looking';
}

/** The button's words for each stage: which one it is in is what a player waiting needs to see. */
function finderLabel(f: FinderState): string {
  if (f.state === 'starting') return 'Starting the hoop finder…';
  if (f.state === 'downloading') return `Downloading the hoop finder… ${Math.round(f.progress * 100)}%`;
  if (f.state === 'preparing') return 'Getting it ready…';
  if (f.state === 'looking') return 'Looking for the hoop…';
  return 'Find the hoop for me';
}
import { useFramingCheck } from './useFramingCheck';
import { localDateString } from '@/lib/dates';
import { ZONE_LABELS, ZONE_SPOTS, type CourtZone } from '@/lib/court';
import type { ShootingSummary } from '@/components/video/VideoAIFeedback';
import { HighlightReel } from '@/components/video/HighlightReel';
import { ReportProblem } from '@/components/ReportProblem';
import { RimAdjuster } from '@/components/video/RimAdjuster';
import { leftFirst, rimPixels, SMALL_RIM_PX, type Point } from '@/lib/video/rimAdjust';
import { insideFrame, lockCamera, setZoom, trackZoom, videoTrack, zoomPoint, zoomToFit, type ZoomRange } from '@/lib/video/cameraControls';
import { CameraZoom } from './CameraZoom';
import { TrackerHud, type ShotFlash } from './TrackerHud';
import { DrillPicker } from './DrillPicker';
import { FramingPanel } from './FramingPanel';
import { ShotReplay } from './ShotReplay';
import { ShootingBreakdown } from '@/components/basketball/ShootingBreakdown';
import { track } from '@/lib/events';
import { deleteAccountRim, loadAccountRims, mergeRims, saveAccountRim } from '@/lib/video/rimSync';
import { Camera, FileVideo, Crosshair, Square, Trash2, Plus, Activity, Play, RotateCcw, Film, Trophy, FlaskConical, ScanSearch } from 'lucide-react';

type Step = 'source' | 'calibrate' | 'tracking' | 'review';
type Source = 'camera' | 'file';

export type { TrackedShot } from '@/lib/video/trackedShots';

/**
 * A built-in clip with its rim already measured, for a new player to watch the
 * tracker work from anywhere - most sign up nowhere near a court
 * (/welcome/sample). The real tracker runs on it; nothing from it is saved.
 */
export interface TrackerSample {
  /** The clip, or a function that fetches it when play is pressed (the landing page, where most visitors never press it). */
  src: string | (() => Promise<string>);
  poster?: string;
  rim: Rim;
  /** What really happened in the clip, labelled by hand, to set the call against. */
  truth: { makes: number; attempts: number };
  /** When play is pressed */
  onStarted?: () => void;
  /** Once the run reaches review, with what the tracker called. */
  onFinished?: (called: { makes: number; attempts: number }) => void;
  /** Shown in review straight under the verdict, above the shot list (the landing page's sign-up) */
  cta?: React.ReactNode;
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** The two ends of a rim, left first, as the adjuster shows them. */
function edgesOfRim(rim: Rim): [Point, Point] {
  const left = rim.x - rim.width / 2;
  const right = rim.x + rim.width / 2;
  return [
    { x: left, y: rimYAt(rim, left) },
    { x: right, y: rimYAt(rim, right) },
  ];
}

/** After a drill is done, how long the last call stays up before review. */
const DRILL_END_MS = 1500;

const CALM: HealthReading = { ball: false, issues: [], fps: null };

export function ShotTracker({
  onCheckForm,
  onSummary,
  sample,
  ownerTools = false,
}: {
  onCheckForm?: (file: File, shotTimeMs: number) => void;
  onSummary?: (summary: ShootingSummary | null) => void;
  sample?: TrackerSample;
  /** The owner's tools: save a checked session as a test clip for the bench (benchLabels.ts). */
  ownerTools?: boolean;
}) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // The chosen clip is held twice on purpose: the ref for the tracking loop,
  // which reads it outside React's render, and state for the JSX below. Reading
  // fileRef.current during render is a refs-in-render violation that bails the
  // React Compiler out of this component, and the bailout reports itself as
  // unrelated impure-render errors elsewhere in the file.
  const fileRef = useRef<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const stopRef = useRef(false);
  // Offscreen: the hoop crop is drawn here and handed to the tracker, never
  // shown. Created when tracking starts, not during render - createElement is
  // impure and would run on every render.
  const cropCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lockRef = useRef<{ release: () => Promise<void> } | null>(null);

  const [step, setStep] = useState<Step>('source');
  const [source, setSource] = useState<Source>('file');
  const [rim, setRim] = useState<Rim | null>(null);
  const [shots, setShots] = useState<TrackedShot[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [zone, setZone] = useState<ShotZoneChoice>('all-around');
  const [saving, setSaving] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  /**
   * The run's clock as the loop last saw it. finish() and fixRim() read this,
   * not elapsedMs: a drill that ends itself calls finish() from the closure
   * made when tracking started, where elapsedMs is still the value from then.
   */
  const elapsedRef = useRef(0);
  /** Time spent shooting, long breaks left out (shotStats.activeMs). */
  const [shootingMs, setShootingMs] = useState(0);
  const [paused, setPaused] = useState(false);

  // Live overlay state. Pushed from the tracking loop at most four times a
  // second: the loop runs at up to 60fps on a phone already doing pixel work.
  const [health, setHealth] = useState<HealthReading>(CALM);
  const [flash, setFlash] = useState<ShotFlash | null>(null);
  const [sound, setSound] = useState<SoundSettings>(DEFAULT_SOUND);
  const [theatre, setTheatre] = useState(false);
  /** The camera's latest settled move, while it stands; offered as "Fix rim". */
  const [moved, setMoved] = useState<Shift | null>(null);
  /** Re-aiming after the camera moved: the rim is being set again mid-session. */
  const [fixing, setFixing] = useState(false);
  /** A saved hoop from the account, opened in the adjuster to check before use (rimSync.ts). */
  const [checkingSaved, setCheckingSaved] = useState<string | null>(null);

  // How well the run actually went, counted in refs so counting cannot cause a
  // re-render, and snapshotted into state once at the end. Counts from a run
  // that only managed 8 frames a second deserve less trust than counts from
  // one that managed 30, and only the app knows which happened.
  const analysedRef = useRef(0);
  const ballSeenRef = useRef(0);
  /** Removes the clip-ended listener; see startTracking. */
  const endedCleanupRef = useRef<(() => void) | null>(null);
  /** The run's tracker, in a worker or on this thread (trackerEngine.ts). */
  const engineRef = useRef<TrackerEngine | null>(null);
  /** Whether the run's pixel work ended up in a worker. */
  const inWorkerRef = useRef<boolean | null>(null);
  const [quality, setQuality] = useState<RunQuality | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** A milestone just reached ("10 makes"), shown under the score for BANNER_MS. */
  const [banner, setBanner] = useState<{ id: number; label: string } | null>(null);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** The run's workload, so finish() can say how many frames went unscored. */
  const workloadRef = useRef<ReturnType<typeof createWorkload> | null>(null);
  /** Smallest hoop picture the device dropped to during the run. */
  const minCanvasRef = useRef<number | null>(null);
  /** Whether the camera took the focus and exposure lock. */
  const lockedRef = useRef(false);
  /** Camera moves reported during the run. */
  const movesRef = useRef(0);
  /**
   * Calls the player deleted as having no shot behind them. Kept so a saved
   * session can say how often the tracker invents a shot, which the shot list
   * alone cannot once the call is gone from it.
   */
  const [removed, setRemoved] = useState(0);
  /** Every call so far in order, for the drill and the flash, without waiting on state. */
  const madeRef = useRef<boolean[]>([]);
  const nextIdRef = useRef(1);
  const healthRef = useRef<HealthMonitor>(createHealthMonitor());
  /** Moments something happened - a shot, the ball in the air - for the time spent shooting. */
  const activityRef = useRef<number[]>([]);
  /** Recent ball positions, frame fractions, for the trail. */
  const trailRef = useRef<Array<{ x: number; y: number; t: number }>>([]);
  /** Changes on every start, so a loop left over from an earlier run stops. */
  const runRef = useRef(0);
  /** The tracking clock carried over a pause for re-aiming (camera), ms. */
  const clockBaseRef = useRef(0);
  /** Time spent re-aiming, which scored no frames, ms. */
  const pausedMsRef = useRef(0);
  const fixStartedRef = useRef(0);
  /** The crop the current run draws, for turning a camera move into a rim move. */
  const cropSideRef = useRef(0);
  const doneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // How this session runs (drillModes.ts), read by the loop through the ref
  const [mode, setMode] = useState<DrillMode>(FREE);
  const modeRef = useRef<DrillMode>(FREE);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  // A live session is recorded on the phone for replays, the highlight reel
  // and a second look at full frame rate (liveRecorder.ts)
  const [keepVideo, setKeepVideo] = useState(true);
  const recorderRef = useRef<LiveRecorder | null>(null);
  const [recording, setRecording] = useState<LiveRecording | null>(null);
  /** The current run is a second look at a live session's recording. */
  const [rechecked, setRechecked] = useState(false);
  /** The shot being watched again, by id. */
  const [replayId, setReplayId] = useState<number | null>(null);
  // What the overlay showed, logged through the run so the video can be saved
  // with it drawn in (overlayTimeline.ts); snapshotted when the run ends
  const overlayLogRef = useRef<OverlayLog | null>(null);
  const [timeline, setTimeline] = useState<OverlayTimeline | null>(null);
  /** After "Save for the test library": how many hand-added shots had no time to save. */
  const [benchSaved, setBenchSaved] = useState<number | null>(null);
  /** The player's best saved session % to beat; undefined until known (personalBest.ts). */
  const [shootingBest, setShootingBest] = useState<ShootingTally | null | undefined>(undefined);
  /** The latest call, for the rim line taking its colour for a moment. */
  const lastCallRef = useRef<{ t: number; made: boolean } | null>(null);

  // Release the camera, screen lock, worker and any pending timer when leaving
  useEffect(
    () => () => {
      stopRef.current = true;
      runRef.current++;
      engineRef.current?.dispose();
      rimModelRef.current?.dispose();
      recorderRef.current?.discard();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      lockRef.current?.release().catch(() => undefined);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    },
    []
  );

  // Funnel steps (src/lib/events.ts). The sample has its own, so a player
  // watching it is not counted as having used the tracker.
  const isSample = !!sample;
  useEffect(() => {
    if (!isSample) track('tracker_opened');
  }, [isSample]);

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
      minutes: Math.round(shootingMs / 60000),
    });
  }, [step, shots, zone, shootingMs, onSummary]);

  // Leaving full screen with the phone's own back gesture leaves theatre too
  useEffect(() => {
    const onChange = () => {
      if (!document.fullscreenElement) setTheatre(false);
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

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
        // throwing OverconstrainedError. 1080p where the camera has it: the ring
        // is half as wide again in pixels as at 720p, and its size limits
        // accuracy more than anything (src/lib/video/rimAdjust.ts). Only the
        // hoop crop is ever read, so the extra pixels cost almost nothing.
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraZoom(trackZoom(videoTrack(stream)));
      setSource('camera');
      setRechecked(false);
      setRecording(null);
      startCalibrating();
      attachRef.current = (video) => {
        video.srcObject = stream;
        video.play().catch(() => undefined);
      };
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
    setRechecked(false);
    setRecording(null);
    startCalibrating();
    attachRef.current = (video) => {
      video.srcObject = null;
      video.src = URL.createObjectURL(file);
      video.currentTime = 0.1;
    };
  }

  /**
   * What the camera, a file or the sample is waiting to put in the video. The
   * video element only renders once the step has moved on from 'source', so
   * this is attached by the effect below, after that render.
   *
   * It used to be attached on the next animation frame. After an await - the
   * camera's getUserMedia, the landing page's sample download - that frame
   * could come before React had rendered the video, nothing was attached, and
   * the player sat on a black screen until they reloaded. Locally on 23 Oct
   * 2026: the sample 1 run in 12, the camera 10 in 20 when it took a moment
   * to start, as it does on a phone.
   */
  const attachRef = useRef<((video: HTMLVideoElement) => void) | null>(null);
  useEffect(() => {
    const video = videoRef.current;
    const attach = attachRef.current;
    if (!video || !attach) return;
    attachRef.current = null;
    attach(video);
  }, [step]);

  // Tap the ring's left and right edges, then fine-tune both in a magnified
  // view before tracking starts. Tracking used to start on the second tap, with
  // nothing to adjust - and on a clip where the ring was 18 points wide on the
  // screen, where the taps landed moved the count between 22 and 31 shots
  // right out of 31. See src/lib/video/rimAdjust.ts.
  const [calibrating, setCalibrating] = useState(false);
  const [firstEdge, setFirstEdge] = useState<{ x: number; y: number } | null>(null);
  const [edges, setEdges] = useState<[Point, Point] | null>(null);
  // "Find the hoop for me" (rimFinder.ts): where it has got to, whether the
  // ends in the adjuster came from it, and whether the model is on the phone
  const [finder, setFinder] = useState<FinderState>({ state: 'idle' });
  const [autoFound, setAutoFound] = useState(false);
  const [modelCached, setModelCached] = useState<boolean | null>(null);
  const rimModelRef = useRef<RimModel | null>(null);
  // Whether the hoop finder is already on this phone, for saying what pressing it downloads
  useEffect(() => {
    if (step !== 'calibrate' || modelCached !== null) return;
    let live = true;
    void rimModelCached().then((cached) => live && setModelCached(cached));
    return () => {
      live = false;
    };
  }, [step, modelCached]);

  // Hoops measured before, so a returning player taps nothing. Read when the
  // calibrate step opens rather than on mount: localStorage does not exist while
  // this renders on the server, and seeding state from it would hydrate to a
  // different list than the server sent.
  const [savedRims, setSavedRims] = useState<SavedRim[]>([]);
  /** Name being typed in the review step to remember the rim just used. */
  const [rimName, setRimName] = useState('');
  const [rimSaved, setRimSaved] = useState(false);
  /** The live camera's zoom, when the phone lets the browser change it. */
  const [cameraZoom, setCameraZoom] = useState<{ range: ZoomRange; zoom: number } | null>(null);
  const [videoSize, setVideoSize] = useState<{ w: number; h: number } | null>(null);
  /** Remounts the rim adjuster after a zoom, so its magnified view is worked out afresh. */
  const [adjusterKey, setAdjusterKey] = useState(0);

  function startCalibrating() {
    if (!sample) track('tracker_setup');
    // Read here rather than on mount: localStorage does not exist while this
    // renders on the server, and seeding state from it would hydrate to a
    // different value than the server sent.
    const soundSettings = loadSound();
    setSound(soundSettings);
    // Fetched now, not at the first make: loading the swish mid-run cost a
    // ~100ms stall on the very frames that call that shot
    preloadRecordings(soundSettings);
    setSavedRims(loadSavedRims());
    setRimSaved(false);
    setRimName('');
    setFirstEdge(null);
    setEdges(null);
    setFixing(false);
    setCheckingSaved(null);
    setStep('calibrate');
    // Hoops kept with the account join the list once they arrive; the phone's
    // own are there straight away and the tracker never waits on these
    if (!sample) {
      void loadAccountRims(createClient()).then((account) => {
        if (!account?.length) return;
        const merged = mergeRims(loadSavedRims(), account);
        setSavedRims(merged);
        // Only this phone's own hoops are written to its storage. One from the
        // account stays in memory: on a shared tablet it would otherwise be
        // left behind, name and all, after this player signs out.
        storeSavedRims(merged.filter((r) => !r.fromAccount));
      });
    }
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
    // Not measured in this browser: it may be from another phone or another
    // spot, so it opens already placed in the magnified view to check
    if (entry.fromAccount) {
      setFirstEdge(null);
      setCheckingSaved(entry.id);
      setEdges(edgesOfRim(entry.rim));
      setAdjusterKey((k) => k + 1);
      return;
    }
    const next = touchSavedRim(savedRims, entry.id, Date.now());
    setSavedRims(next);
    storeSavedRims(next.filter((r) => !r.fromAccount));
    setRim(entry.rim);
    setFirstEdge(null);
    setCalibrating(true);
    startTracking(entry.rim).finally(() => setCalibrating(false));
  }

  function saveCurrentRim() {
    if (!rim || !rimName.trim()) return;
    const now = Date.now();
    const next = withSavedRim(savedRims, rimName, rim, now);
    setSavedRims(next);
    storeSavedRims(next.filter((r) => !r.fromAccount));
    setRimSaved(true);
    void saveAccountRim(createClient(), rimName, rim, now);
  }

  function forgetRim(id: string) {
    const entry = savedRims.find((s) => s.id === id);
    const next = withoutSavedRim(savedRims, id);
    setSavedRims(next);
    storeSavedRims(next.filter((r) => !r.fromAccount));
    if (entry) void deleteAccountRim(createClient(), entry.name);
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
    setAutoFound(false);
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
    const resume = fixing;
    // A hoop from the account, now checked here: it becomes this phone's own,
    // with the ends as placed, on the phone and in the account
    const checked = checkingSaved ? savedRims.find((s) => s.id === checkingSaved) : null;
    if (checked) {
      const now = Date.now();
      const next = withSavedRim(savedRims.filter((s) => s.id !== checked.id), checked.name, measured, now);
      setSavedRims(next);
      storeSavedRims(next.filter((r) => !r.fromAccount));
      void saveAccountRim(createClient(), checked.name, measured, now);
    }
    setCheckingSaved(null);
    setRim(measured);
    setEdges(null);
    setFixing(false);
    // Pass the measured rim directly instead of relying on the `rim` state,
    // which would still read null on this render (state is not synchronous).
    setCalibrating(true);
    startTracking(measured, resume).finally(() => setCalibrating(false));
  }

  function redoEdges() {
    setCheckingSaved(null);
    setEdges(null);
    setFirstEdge(null);
    setError(null);
    setAutoFound(false);
  }

  /**
   * Finds the hoop with the trained model (rimFinder.ts) and opens the
   * adjuster on what it found, for the player to check. The model downloads
   * on first use and is kept on the phone. One still of the picture, two
   * looks (whole, then close): on the bench one close look was 0.027 and
   * 0.018 rim widths out, and every extra look is seconds on a phone.
   * A failure or a stage over its time limit is shown, and reported with the
   * stage and how long it took, since phones are where it is slow.
   */
  async function findHoop() {
    const video = videoRef.current;
    if (!video?.videoWidth || finderBusy(finder.state)) return;
    setError(null);
    const began = performance.now();
    setFinder({ state: 'starting' });
    try {
      const model =
        rimModelRef.current ??
        (await loadRimModel((s) =>
          setFinder(s.stage === 'downloading' ? { state: 'downloading', progress: s.fraction } : { state: s.stage })
        ));
      rimModelRef.current = model;
      setModelCached(true);
      setFinder({ state: 'looking' });
      const still = captureFrame(video);
      if (!still) throw new RimFinderError('look', 'no picture to look at');
      const found = await findRimSteady(video.videoWidth, video.videoHeight, [sampler(still)], model.run);
      if (!found) {
        setFinder({ state: 'none' });
        return;
      }
      setFirstEdge(null);
      setEdges(leftFirst(found.left, found.right));
      setAdjusterKey((k) => k + 1);
      setAutoFound(true);
      setFinder({ state: 'idle' });
    } catch (err) {
      const stage = err instanceof RimFinderError ? err.stage : 'look';
      setFinder({ state: 'failed', reason: stage });
      // A model that broke is not used again; the next press starts afresh
      rimModelRef.current?.dispose();
      rimModelRef.current = null;
      const seconds = Math.round((performance.now() - began) / 1000);
      reportError('client', new Error(`Hoop finder failed at ${stage}: ${err instanceof Error ? err.message : String(err)} (${seconds}s, ${source})`));
    }
  }

  /** The zoom slider. Taps made before it no longer sit on the ring, so they go. */
  function changeZoom(zoom: number) {
    if (!cameraZoom) return;
    setCameraZoom({ ...cameraZoom, zoom });
    setFirstEdge(null);
    void setZoom(videoTrack(streamRef.current), zoom);
  }

  /**
   * Zooms the camera until the ring is big enough to count well, and carries
   * the two ends along so the player only checks them rather than tapping
   * again. Offered when the ring came out small (SMALL_RIM_PX).
   */
  async function zoomToHoop() {
    const video = videoRef.current;
    if (!cameraZoom || !edges || !video?.videoWidth) return;
    const from = cameraZoom.zoom;
    const measured = rimFromEdges(edges[0], edges[1]);
    const to = zoomToFit(measured, rimPixels(edges[0], edges[1], video.videoWidth), from, cameraZoom.range, video.videoHeight / video.videoWidth);
    if (to <= from * 1.05) return;
    const ok = await setZoom(videoTrack(streamRef.current), to);
    if (!ok) {
      setError('The camera would not zoom. Move the phone closer to the hoop instead.');
      return;
    }
    setCameraZoom({ ...cameraZoom, zoom: to });
    const zoomed: [Point, Point] = [zoomPoint(edges[0], from, to), zoomPoint(edges[1], from, to)];
    if (insideFrame(zoomed)) {
      setEdges(leftFirst(zoomed[0], zoomed[1]));
      setAdjusterKey((k) => k + 1);
    } else {
      redoEdges();
    }
  }

  /**
   * How far zoomToHoop would go, or null when zooming would not help. Worked
   * out from videoSize, not the video element: this runs during render, and
   * reading a ref there bails the React Compiler out of the whole component.
   */
  function zoomOffer(): number | null {
    if (source !== 'camera' || fixing || !cameraZoom || !edges || !videoSize) return null;
    const px = rimPixels(edges[0], edges[1], videoSize.w);
    if (px >= SMALL_RIM_PX) return null;
    const to = zoomToFit(rimFromEdges(edges[0], edges[1]), px, cameraZoom.zoom, cameraZoom.range, videoSize.h / videoSize.w);
    return to > cameraZoom.zoom * 1.05 ? to : null;
  }

  /** The video's own size, kept in state for render code (see zoomOffer). */
  function noteVideoSize(e: React.SyntheticEvent<HTMLVideoElement>) {
    const v = e.currentTarget;
    if (v.videoWidth > 0) setVideoSize({ w: v.videoWidth, h: v.videoHeight });
  }

  /**
   * Draws the rim line the tracking is measured against, and the ball with a
   * short trail behind it. The rim is passed in rather than read from state:
   * the tracking loop is a closure made when it started, and the `rim` state
   * it would see is the one from that render, before the rim was set.
   */
  function draw(activeRim: Rim | null, ball?: { x: number; y: number; w: number; h: number } | null, t = 0) {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // The first edge marker is a DOM overlay, not canvas: draw() runs from the
    // tracking loop and would read a stale firstEdge from its closure.
    // Drawn as the span between the two taps, following the rim's tilt, so
    // what is drawn is the line the crossing test actually uses. The same
    // drawing goes into a saved video (overlayArt.ts).
    if (activeRim) drawRim(ctx, canvas.width, canvas.height, activeRim, 1, rimTone(lastCallRef.current, t));

    const trail = trailRef.current;
    if (ball) trail.push({ x: ball.x + ball.w / 2, y: ball.y + ball.h / 2, t });
    while (trail.length && (trail[0].t < t - TRAIL_MS || trail.length > TRAIL_POINTS)) trail.shift();
    drawBall(ctx, canvas.width, canvas.height, trail, ball ?? null, 1, heatLevel(streaks(madeRef.current).current));
  }

  /**
   * Starts the tracking loop on a measured rim. `resume` carries on a session
   * paused to fix the rim: the shots so far, the clock and the recording are
   * kept, and only the tracker starts afresh on the new rim.
   */
  async function startTracking(calibratedRim: Rim, resume = false) {
    const video = videoRef.current;
    if (!video) return;
    const run = ++runRef.current;
    setError(null);
    // No model to fetch: the tracker is pixel maths, so tracking can start the
    // instant the rim is set, offline, with nothing downloaded.
    if (!sample && !resume) track('tracker_started');
    if (!resume) {
      setShots([]);
      setFlash(null);
      setBanner(null);
      setRemoved(0);
      setQuality(null);
      setShootingMs(0);
      setPaused(false);
      setReplayId(null);
      analysedRef.current = 0;
      ballSeenRef.current = 0;
      minCanvasRef.current = null;
      movesRef.current = 0;
      madeRef.current = [];
      nextIdRef.current = 1;
      activityRef.current = [];
      clockBaseRef.current = 0;
      elapsedRef.current = 0;
      pausedMsRef.current = 0;
      inWorkerRef.current = null;
      healthRef.current = createHealthMonitor();
      overlayLogRef.current = createOverlayLog();
      lastCallRef.current = null;
      setTimeline(null);
      setBenchSaved(null);
      // The best to beat, fetched now while the phone is still likely online
      // and before this session is saved into it (personalBest.ts)
      if (!sample) void loadShootingBest(createClient()).then(setShootingBest);
    } else {
      const held = performance.now() - fixStartedRef.current;
      pausedMsRef.current += held;
      // The camera kept recording while the clock held for the re-aim. A
      // file's clock is its own time, which the pause stopped too.
      if (source === 'camera') overlayLogRef.current?.gap(clockBaseRef.current, held);
    }
    overlayLogRef.current?.rim(resume ? clockBaseRef.current : 0, calibratedRim);
    trailRef.current = [];
    healthRef.current.setMoved(false);
    setMoved(null);
    setHealth(healthRef.current.read());
    setStep('tracking');
    stopRef.current = false;
    let lastPush = -Infinity;
    let lastActivity = -Infinity;
    let doneCalled = false;

    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => (lockRef.current = l)).catch(() => undefined);

    // The hoop is framed now, so nothing about the light needs to change:
    // auto exposure pumping as someone passes a window makes every pixel
    // "move" to frame differencing (src/lib/video/cameraControls.ts)
    if (source === 'camera' && !resume) void lockCamera(videoTrack(streamRef.current)).then((n) => (lockedRef.current = n > 0));

    // The canvas is sized per frame from the workload below
    if (!cropCanvasRef.current) cropCanvasRef.current = document.createElement('canvas');

    const startedAt = performance.now() - clockBaseRef.current;

    if (source === 'file') {
      if (!resume) video.currentTime = 0;
      // Always real time: never faster (see the note where the 2x selector
      // used to be), and never slower either - see src/lib/video/workload.ts
      video.playbackRate = 1;
      await video.play().catch(() => undefined);
    }

    // The end of a clip is an event, and has to be listened for.
    // requestVideoFrameCallback only fires while new frames are being
    // presented; once a clip ends none are, so nothing ever schedules
    // processFrame again and the video.ended check inside it is never reached.
    if (source === 'file') {
      endedCleanupRef.current?.();
      const onEnded = () => void finish();
      video.addEventListener('ended', onEnded);
      endedCleanupRef.current = () => video.removeEventListener('ended', onEnded);
    }

    // A live session is kept on the phone for replays, the highlight reel and
    // a second look (liveRecorder.ts). Started with the clock, so a shot's
    // time is its time in the recording.
    if (source === 'camera' && !resume && keepVideo && streamRef.current && !sample) {
      recorderRef.current = startLiveRecorder(streamRef.current, 0);
    }

    // Thins 60 fps to the 30 the tracker was measured at, and gives a device
    // that cannot keep up a smaller picture to work on instead of slowing the
    // clip (src/lib/video/workload.ts). The camera is live, so the same applies.
    const workload = createWorkload();
    workloadRef.current = workload;
    let lastSignature: Uint8Array | null = null;
    // Built on the first frame with real dimensions: videoWidth is 0 until
    // metadata loads, and the crop and the expected ball size come from it
    let engine: TrackerEngine | null = null;

    const onShot = (shot: DetectedShot) => {
      const index = madeRef.current.length;
      const id = nextIdRef.current++;
      madeRef.current.push(shot.made);
      // Spots: the shot belongs to the spot being shot from when it was taken
      const spot = zoneForShot(modeRef.current, index);
      setShots((cur) => [...cur, fromDetected(shot, id, spot)]);
      healthRef.current.shot(shot.confident);
      activityRef.current.push(shot.t);
      overlayLogRef.current?.call(shot);
      lastCallRef.current = { t: shot.t, made: shot.made };
      navigator.vibrate?.(shot.made ? 40 : [20, 50, 20]);
      // Counted from the run's own list rather than from `shots` state, which
      // has not re-rendered yet
      const attempts = madeRef.current.length;
      const makes = madeRef.current.filter(Boolean).length;
      setFlash({ id, made: shot.made, confident: shot.confident, makes, attempts, streak: streaks(madeRef.current).current });
      // A phone on a tripod is metres away and the player is usually facing
      // the hoop, so sound is the part of the confirmation that reaches them
      announceShot(sound, shot.made, makes, attempts, drillCue(modeRef.current, madeRef.current));
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      flashTimerRef.current = setTimeout(() => setFlash(null), 1400);
      const milestone = milestoneFor(madeRef.current);
      if (milestone) {
        setBanner({ id, label: milestone });
        if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
        bannerTimerRef.current = setTimeout(() => setBanner(null), BANNER_MS);
      }
      if (drillProgress(modeRef.current, madeRef.current, 0)?.done && modeRef.current.kind !== 'timed') endDrill();
    };

    /** The drill is complete: leave the last call up a moment, then review. */
    const endDrill = () => {
      if (doneCalled) return;
      doneCalled = true;
      doneTimerRef.current = setTimeout(() => void finish(), DRILL_END_MS);
    };

    const onResult = (r: PipelineFrame) => {
      if (run !== runRef.current) return;
      elapsedRef.current = r.t;
      if (r.ready) {
        analysedRef.current += 1;
        if (r.ball) ballSeenRef.current += 1;
        healthRef.current.frame(r.t, r.ball !== null, r.light);
      }
      if (r.ball && r.t - lastActivity > 500) {
        lastActivity = r.t;
        activityRef.current.push(r.t);
      }
      if (r.moved) {
        movesRef.current += 1;
        healthRef.current.setMoved(true);
        setMoved(r.moved);
      }
      overlayLogRef.current?.frame(r.t, r.ball);
      if (r.shot) onShot(r.shot);
      draw(calibratedRim, r.ball, r.t);

      // Only re-render a few times a second, not every frame
      if (r.t - lastPush > 250) {
        lastPush = r.t;
        setHealth(healthRef.current.read());
        setElapsedMs(r.t);
        const shooting = activeMs(activityRef.current, r.t);
        setShootingMs(shooting);
        const last = activityRef.current.length ? Math.max(...activityRef.current.slice(-8)) : 0;
        setPaused(r.t - last > IDLE_MS);
        const timed = modeRef.current;
        if (timed.kind === 'timed' && r.t >= timed.seconds * 1000 && !doneCalled) {
          if (!sound.muted) announceShot({ ...sound, make: 'off', miss: 'off', voice: 'off' }, false, 0, 0, 'Time.');
          doneCalled = true;
          void finish();
        }
      }
    };

    /** Draws one presented frame's hoop crop and hands it to the tracker. */
    const scoreFrame = (meta?: { mediaTime?: number }) => {
      // mediaTime is the time of the frame actually presented, where
      // currentTime can already have moved on to the next one
      const now = source === 'file' ? (meta?.mediaTime ?? video.currentTime) * 1000 : performance.now() - startedAt;
      // 60 fps is thinned to 30 before any pixel work is done
      if (!workload.wants(now)) return;
      if (!engine) {
        engine = createEngine({ rim: calibratedRim, videoWidth: video.videoWidth, videoHeight: video.videoHeight }, onResult);
        engineRef.current = engine;
        inWorkerRef.current = engine.inWorker();
      }
      // The worker is still busy with earlier frames: this one goes unscored,
      // which the workload counts as a skip and answers with a smaller picture
      if (engine.busy()) return;

      // Work on a crop around the hoop rather than the whole frame: it is
      // what makes the ball big enough to measure, and it keeps the pixel
      // work to a small square however large the footage is.
      const crop = cropRectFor(calibratedRim, video.videoWidth, video.videoHeight);
      cropSideRef.current = crop.side;
      const px = workload.canvas();
      if (minCanvasRef.current === null || px < minCanvasRef.current) minCanvasRef.current = px;
      const canvas = cropCanvasRef.current;
      if (!canvas) return;
      if (canvas.width !== px) {
        canvas.width = px;
        canvas.height = px;
      }
      // willReadFrequently: the pixels are read back every frame, which a
      // GPU-backed canvas makes expensive
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      ctx.drawImage(video, crop.sx, crop.sy, crop.side, crop.side, 0, 0, px, px);
      const pixels = ctx.getImageData(0, 0, px, px).data;
      // A frame shown twice has no motion in it to find, and comparing
      // against the copy would hide the ball on exactly that frame
      const signature = repeatSignature(pixels);
      if (lastSignature && sameSignature(signature, lastSignature)) return;
      lastSignature = signature;
      workload.scored(now);
      engine.push(pixels, px, now);
      if (source === 'file' && Number.isFinite(video.duration) && video.duration > 0) setProgress(video.currentTime / video.duration);
    };

    const processFrame = (_now?: number, meta?: { mediaTime?: number }) => {
      if (stopRef.current || run !== runRef.current) return;
      if (source === 'file' && video.ended) {
        void finish();
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

  /** Adds the call the tracker makes when a run ends on a shot still being judged. */
  function addLastCall(last: DetectedShot | null) {
    if (!last) return;
    const spot = zoneForShot(modeRef.current, madeRef.current.length);
    madeRef.current.push(last.made);
    overlayLogRef.current?.call(last);
    const id = nextIdRef.current++;
    setShots((cur) => [...cur, fromDetected(last, id, spot)]);
  }

  async function finish() {
    // Guarded because several things call this: the ended listener, the stop
    // button, a drill ending. Without it the teardown could run twice.
    if (stopRef.current) return;
    stopRef.current = true;
    if (doneTimerRef.current) clearTimeout(doneTimerRef.current);
    endedCleanupRef.current?.();
    endedCleanupRef.current = null;
    const video = videoRef.current;
    video?.pause();
    // A shot can still be being judged when the clip ends - the call waits on
    // what the net does next - and without this the last shot was dropped
    const engine = engineRef.current;
    engineRef.current = null;
    addLastCall(engine ? await engine.finish() : null);
    const inWorker = engine?.inWorker() ?? null;
    engine?.dispose();
    // Snapshot how the run went. Seconds come from the clip for a file and
    // from the clock for the camera, less any time spent re-aiming.
    const seconds =
      source === 'file' && video && Number.isFinite(video.duration) && video.duration > 0
        ? Math.min(video.currentTime, video.duration)
        : (elapsedRef.current - pausedMsRef.current) / 1000;
    const frames = analysedRef.current;
    if (frames > 0 && seconds > 0.5) {
      setQuality({
        frames,
        fps: Math.round((frames / seconds) * 10) / 10,
        ballSeenPct: Math.round((ballSeenRef.current / frames) * 1000) / 10,
        skipped: workloadRef.current?.skipped() ?? 0,
        ...(minCanvasRef.current ? { canvas: minCanvasRef.current } : {}),
        ...(inWorker !== null ? { worker: inWorker } : {}),
        ...(movesRef.current ? { moved: movesRef.current } : {}),
        ...(source === 'camera' ? { locked: lockedRef.current } : {}),
      });
    }
    setShootingMs(activeMs(activityRef.current, elapsedRef.current));
    const log = overlayLogRef.current;
    if (log) setTimeline(log.snapshot({ activity: activityRef.current, mode: modeRef.current, endT: elapsedRef.current }));
    // The recording first, while the camera is still running
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (recorder) setRecording(await recorder.stop());
    streamRef.current?.getTracks().forEach((t) => t.stop());
    lockRef.current?.release().catch(() => undefined);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    setTheatre(false);
    if (!sample) track('tracker_finished');
    setStep('review');
  }

  /**
   * The Stop buttons. A direct reference for onClick, not an arrow around
   * finish(): an arrow made during render gets analysed by the React Compiler
   * as render code, along with everything finish() reaches (see
   * startFromSavedRim).
   */
  function stopTracking() {
    void finish();
  }

  /**
   * The camera has moved: stop, keep the shots so far, and set the rim again
   * on the picture as it is now. The ends start where the move says they went,
   * so it is usually a check rather than a re-tap.
   */
  async function fixRim() {
    const video = videoRef.current;
    if (!rim || !moved || !video?.videoWidth) return;
    runRef.current++;
    endedCleanupRef.current?.();
    endedCleanupRef.current = null;
    if (source === 'file') video.pause();
    const engine = engineRef.current;
    engineRef.current = null;
    addLastCall(engine ? await engine.finish() : null);
    engine?.dispose();
    clockBaseRef.current = elapsedRef.current;
    fixStartedRef.current = performance.now();
    const shift = shiftInFrame(moved, cropSideRef.current || video.videoWidth * 0.3, video.videoWidth, video.videoHeight);
    const [a, b] = edgesOfRim(rim);
    const shifted: [Point, Point] = [
      { x: a.x + shift.x, y: a.y + shift.y },
      { x: b.x + shift.x, y: b.y + shift.y },
    ];
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined);
    // The old rim line and the ball's trail would sit on the picture beside
    // the moved ring and confuse the re-aim
    trailRef.current = [];
    draw(null);
    setTheatre(false);
    setFixing(true);
    setFirstEdge(null);
    setEdges(insideFrame(shifted) ? shifted : edgesOfRim(rim));
    setAdjusterKey((k) => k + 1);
    setStep('calibrate');
  }

  /** Full screen where the browser allows it, and a full-window view where it does not (iPhone). */
  function toggleTheatre() {
    const next = !theatre;
    setTheatre(next);
    const stage = stageRef.current as (HTMLDivElement & { requestFullscreen?: () => Promise<void> }) | null;
    if (next && stage?.requestFullscreen && !document.fullscreenElement) {
      stage.requestFullscreen().catch(() => undefined);
      const orientation = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
      if (videoSize && videoSize.w > videoSize.h) orientation?.lock?.('landscape').catch(() => undefined);
    } else if (!next && document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
    }
  }

  /**
   * Plays the built-in sample with its rim already set. The video element only
   * exists once the step has moved on from 'source' (and is a fresh one after
   * review), so the clip is attached through attachRef once it has rendered,
   * and videoReady starts tracking when it has loaded.
   */
  async function startSample() {
    if (!sample) return;
    sample.onStarted?.();
    setError(null);
    let src = sample.src;
    if (typeof src !== 'string') {
      setSampleLoading(true);
      src = await src();
      setSampleLoading(false);
    }
    const soundSettings = loadSound();
    setSound(soundSettings);
    // Fetched now, not at the first make: loading the swish mid-run cost a
    // ~100ms stall on the very frames that call that shot
    preloadRecordings(soundSettings);
    setShots([]);
    setRim(sample.rim);
    setFirstEdge(null);
    setEdges(null);
    setCalibrating(true);
    setStep('calibrate');
    sampleNotifiedRef.current = false;
    autoStartRef.current = sample.rim;
    attachRef.current = (video) => {
      video.srcObject = null;
      video.src = src;
    };
  }

  /**
   * A second look at a live session from its recording, at the clip's full
   * frame rate. For a run the phone could only score at a low rate, where
   * shots fell between frames. Same rim: it is the same camera.
   */
  function recheck() {
    if (!recording || !rim) return;
    fileRef.current = recording.file;
    setVideoFile(recording.file);
    setSource('file');
    setRechecked(true);
    setShots([]);
    setFirstEdge(null);
    setEdges(null);
    setCalibrating(true);
    setStep('calibrate');
    autoStartRef.current = rim;
    attachRef.current = (video) => {
      video.srcObject = null;
      video.src = URL.createObjectURL(recording.file);
    };
  }

  /**
   * The video's onLoadedData: tracking starts by itself once a clip whose rim
   * is already known - the sample, or a recording being checked again - can
   * play.
   *
   * These functions sit below startTracking on purpose. Declared above it, the
   * React Compiler analysed startTracking and startFromSavedRim as render code
   * and rejected their performance.now() and Date.now() as impure calls during
   * render - the same bailout startFromSavedRim's note describes.
   */
  function videoReady(e: React.SyntheticEvent<HTMLVideoElement>) {
    const pending = autoStartRef.current;
    if (!pending) return;
    autoStartRef.current = null;
    const video = e.currentTarget;
    // A recording has no length until the browser has read to its end
    void resolveDuration(video).then(() => startTracking(pending).finally(() => setCalibrating(false)));
  }

  // Tell the page the sample was watched, once per run
  const sampleNotifiedRef = useRef(false);
  /** While a sample given as a loader is downloading, after play was pressed */
  const [sampleLoading, setSampleLoading] = useState(false);
  /** A rim to start tracking on as soon as the attached clip loads: see videoReady. */
  const autoStartRef = useRef<Rim | null>(null);
  useEffect(() => {
    if (!sample || step !== 'review' || sampleNotifiedRef.current) return;
    sampleNotifiedRef.current = true;
    sample.onFinished?.({ makes: shots.filter((s) => s.made).length, attempts: shots.length });
  }, [sample, step, shots]);

  function toggleShot(id: number) {
    setShots((cur) => cur.map((s) => (s.id === id ? { ...s, made: !s.made, confident: true } : s)));
  }

  function settleShot(id: number, made: boolean) {
    setShots((cur) => cur.map((x) => (x.id === id ? { ...x, made, confident: true } : x)));
  }

  function setShotZone(id: number, value: string) {
    setShots((cur) => cur.map((x) => (x.id === id ? { ...x, zone: value ? (value as ShotZoneChoice) : undefined } : x)));
  }

  /**
   * Owner only: saves this session's video and its checked shot list to the
   * phone as a labelled clip for the tracker's test bench (benchLabels.ts,
   * scripts/bench-suite.mjs). Two downloads: the video, and a .json of the
   * labels with the same name.
   */
  function saveForBench() {
    if (!replayFile || !rim) return;
    const now = new Date();
    const id = `owner-${localDateString()}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const extension = replayFile.type.includes('webm') ? 'webm' : 'mp4';
    const clip = benchClip({
      shots,
      rim,
      toVideoMs: inVideo,
      id,
      extension,
      note: `${source === 'camera' ? 'live camera' : 'video from phone'}, ${shots.length} shots, ${quality ? `${quality.fps.toFixed(0)} fps scored` : 'fps unknown'}`,
    });
    const save = (blob: Blob, name: string) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    };
    save(replayFile, clip.file);
    save(new Blob([JSON.stringify(clip, null, 2)], { type: 'application/json' }), `${id}.json`);
    setBenchSaved(clip.untimed);
  }

  function addShot(made: boolean) {
    setShots((cur) => [...cur, addedShot(Date.now(), elapsedMs, made)]);
  }

  /** A call deleted from the list. One the tracker made is counted: see `removed`. */
  function deleteShot(id: number) {
    const shot = shots.find((x) => x.id === id);
    if (shot?.called) setRemoved((n) => n + 1);
    setShots((cur) => cur.filter((x) => x.id !== id));
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
    // Time spent shooting, not time the camera was on: a break to fetch
    // a ball or talk is left out (shotStats.activeMs)
    const minutes = Math.min(360, Math.max(5, Math.round(shootingMs / 60000)));
    const date = localDateString();
    const drillLabel = describeMode(mode);
    const liveSource = source === 'camera' || rechecked;

    const { data: session, error: sessionError } = await supabase
      .from('training_sessions')
      .insert({
        user_id: user.id,
        session_date: date,
        session_type: 'shooting',
        duration_minutes: minutes,
        intensity_rpe: 6,
        perceived_quality: 3,
        notes: `Tracked with Deadeye video shot tracking (${liveSource ? 'live camera' : 'video'})${drillLabel ? `: ${drillLabel}` : ''}`,
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
      .insert({ session_id: session.id, user_id: user.id, drill_name: drillLabel ? `Video shot tracking: ${drillLabel}` : 'Video shot tracking', drill_category: 'shooting', duration_minutes: minutes })
      .select('id')
      .single();
    // One entry per spot shot from, so the shot chart gets each spot's own
    // numbers; shots without a spot go under the session's
    const entries = zoneTotals(shots, zone).map((z) => ({ drill_id: drill?.id ?? '', user_id: user.id, shot_zone: z.zone, makes: z.makes, attempts: z.attempts }));
    const { error: entryError } = drill ? await supabase.from('shooting_entries').insert(entries) : { error: drillError };
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
      // The tracker's own calls go with the player's, so every saved session
      // says how accurate the tracker was on it (src/lib/video/trackedShots.ts)
      summary: buildSummary({
        source: liveSource ? 'camera' : 'file',
        zone,
        shots,
        removed,
        quality,
        device: deviceClass(navigator.userAgent, navigator.maxTouchPoints ?? 0),
        mode: drillLabel,
        activeMinutes: Math.round(shootingMs / 60000),
        rechecked,
      }) as unknown as Json,
    });
    track('tracker_saved');
    // ?saved=1 lets the session page celebrate a first session
    router.push(`/basketball/${session.id}?saved=1`);
  }

  // The framing check on the picture as set up (framing.ts), once the rim is marked
  const framing = useFramingCheck(videoRef, edges, step === 'calibrate' && !calibrating, source === 'camera');
  const makes = shots.filter((s) => s.made).length;
  const unresolved = shots.filter((s) => !s.confident).length;
  const drillState = step === 'tracking' ? drillProgress(mode, shots.map((s) => s.made), elapsedMs) : null;
  const streak = streaks(shots.map((s) => s.made));
  // What a shot can be watched again from: the clip, or the live recording
  const replayFile = source === 'file' ? videoFile : recording?.file ?? null;
  const replayOffset = source === 'file' ? 0 : recording?.offsetMs ?? 0;
  // A shot's time on the tracking clock as its time in the video. The clock
  // holds while the rim is fixed and a live recording does not, so after a
  // fix every later shot sits that much further into the recording.
  const clockGaps = timeline?.gaps ?? [];
  const inVideo = (t: number) => mediaAtClock(clockGaps, t) - replayOffset;
  const replayShot = replayId === null ? null : shots.find((s) => s.id === replayId) ?? null;
  const replayIndex = replayShot ? shots.indexOf(replayShot) : -1;
  const anyWithoutZone = shots.some((s) => !s.zone);
  const lowFps = quality !== null && quality.fps < 12;
  const best = sample ? ({ kind: 'none' } as const) : personalBest({ makes, attempts: shots.length }, shootingBest);

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" title="Check this">{error}</Alert>}

      {step === 'source' && sample && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={startSample}
            disabled={sampleLoading}
            className="group relative block w-full overflow-hidden rounded-2xl border border-zinc-800 bg-black"
            aria-label="Play the sample session"
          >
            {sample.poster && (
              // eslint-disable-next-line @next/next/no-img-element -- a fixed local poster, no resizing wanted
              <img src={sample.poster} alt="" className="w-full opacity-70 transition-opacity group-hover:opacity-90" />
            )}
            <span className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-600 shadow-lg">
                {sampleLoading ? (
                  <span className="h-7 w-7 animate-spin rounded-full border-[3px] border-white border-t-transparent" />
                ) : (
                  <Play className="ml-1 h-7 w-7 fill-white text-white" />
                )}
              </span>
              <span className="rounded-full bg-black/70 px-3 py-1 text-sm font-semibold text-white">
                {sampleLoading ? 'Loading the clip…' : 'Play the sample'}
              </span>
            </span>
          </button>
          <p className="text-sm text-zinc-500">
            The rim is already set for this clip. At a court you tap its two sides once, then just shoot.
          </p>
        </div>
      )}

      {step === 'source' && !sample && (
        <div className="space-y-3">
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
          {/* Below the two buttons rather than above them: on a phone this card
              pushed the buttons off the first screen. Each of these was a
              measured cause of wrong calls on the test sessions; once the rim
              is marked, the framing check says which apply to this picture. */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className="mb-2 text-sm font-semibold text-white">For the most accurate count</p>
            <ul className="space-y-1.5 text-sm text-zinc-300">
              <li>• Phone on a tripod or propped up, not in your hand</li>
              <li>• 3 to 6 metres from the hoop, at an angle rather than side-on, at head height or higher</li>
              <li>• The whole ring and net in shot, big in the picture, with room above for the ball</li>
              <li>• Not facing bright windows or the sun</li>
              <li>• Upload the original video, not a screen recording or one sent through a messaging app</li>
            </ul>
            <p className="mt-2 text-sm text-zinc-500">Your video stays on your phone.</p>
          </div>
        </div>
      )}

      {step !== 'source' && step !== 'review' && (
        <div
          ref={stageRef}
          className={theatre ? 'fixed inset-0 z-50 flex items-center justify-center bg-black' : 'relative w-full overflow-hidden rounded-2xl bg-black'}
        >
          {/* The picture and everything drawn on it share one box the video's
              own shape, so the overlay stays on the hoop when full screen
              letterboxes the video */}
          <div
            className="relative"
            style={
              theatre && videoSize
                ? { aspectRatio: `${videoSize.w} / ${videoSize.h}`, width: `min(100vw, calc(100dvh * ${videoSize.w / videoSize.h}))` }
                : { width: '100%' }
            }
          >
            <video
              ref={videoRef}
              playsInline
              muted
              onLoadedData={videoReady}
              onLoadedMetadata={noteVideoSize}
              onResize={noteVideoSize}
              className="block h-auto w-full"
            />
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
              <TrackerHud
                makes={makes}
                attempts={shots.length}
                clockMs={shootingMs}
                paused={paused}
                streak={streak}
                recent={shots}
                health={health}
                flash={flash}
                drill={drillState}
                theatre={theatre}
                onToggleTheatre={toggleTheatre}
                onFixRim={fixRim}
                canFixRim={moved !== null}
                banner={banner}
                rim={rim}
              />
            )}
          </div>
          {theatre && step === 'tracking' && (
            <button
              type="button"
              onClick={stopTracking}
              className="absolute left-1/2 top-3 flex h-11 -translate-x-1/2 items-center gap-2 rounded-xl bg-black/60 px-4 text-sm font-semibold text-white backdrop-blur-sm"
            >
              <Square className="h-4 w-4" /> Stop
            </button>
          )}
        </div>
      )}

      {step === 'calibrate' && edges && !calibrating && (
        <>
          {checkingSaved && (
            <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
              This hoop was saved to your account from another phone, or before this one was cleared. Check both circles sit on the
              ring&apos;s edges. If the camera is somewhere else this time, tap again.
            </p>
          )}
          {autoFound && !fixing && (
            <p className="rounded-xl border border-emerald-600/40 bg-emerald-600/10 p-3 text-sm text-emerald-100">
              Hoop found. Check both circles sit on the ends of the metal ring, and move them if not - a ring seen from the side
              needs its far end raised or lowered. Then start.
            </p>
          )}
          {fixing && (
            <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
              The camera moved, so the ring has moved in the picture. Check both circles sit on its edges again. Your{' '}
              {shots.length} {shots.length === 1 ? 'shot' : 'shots'} so far are kept.
            </p>
          )}
          <RimAdjuster
            key={adjusterKey}
            videoRef={videoRef}
            edges={edges}
            onChange={setEdges}
            onStart={confirmEdges}
            onRedo={redoEdges}
            zoomTo={zoomOffer()}
            onZoom={zoomToHoop}
            // The ring's size has its own warning above, with the zoom button
            footer={<FramingPanel checks={framing} shownElsewhere={['size']} />}
          />
        </>
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

          {/* Or let the trained model find it (rimFinder.ts): it proposes, the
              adjuster that opens next is where the player checks it */}
          {!firstEdge && !calibrating && (
            <div className="space-y-1.5">
              {/* Not Button's isLoading: it swaps the label for "Loading...",
                  and which stage it is in is the useful part */}
              <Button variant="secondary" className="w-full gap-2" onClick={findHoop} disabled={finderBusy(finder.state)}>
                {finderBusy(finder.state) ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
                ) : (
                  <ScanSearch className="h-4 w-4" />
                )}
                {finderLabel(finder)}
              </Button>
              {finder.state === 'none' && (
                <p className="text-sm text-amber-300">No hoop found. Get the whole ring in the picture, or tap its two sides.</p>
              )}
              {finder.state === 'failed' && (
                <p className="text-sm text-amber-300">
                  {finder.reason === 'download'
                    ? 'The hoop finder could not download. Check the connection and try again, or tap the ring’s two sides.'
                    : 'The hoop finder could not run on this phone. Tap the ring’s two sides instead.'}
                </p>
              )}
              {modelCached === false && finder.state === 'idle' && (
                <p className="text-xs text-zinc-500">
                  First time only: downloads {Math.round(RIM_MODEL_BYTES / 1e6)} MB, then it is kept on this phone. The picture never
                  leaves it.{' '}
                  <a href="/privacy#credits" className="underline">
                    Credits
                  </a>
                </p>
              )}
            </div>
          )}

          {source === 'camera' && cameraZoom && !calibrating && (
            <CameraZoom range={cameraZoom.range} value={cameraZoom.zoom} onChange={changeZoom} />
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
                        {s.fromAccount ? 'From your account · check it first' : `${(s.rim.width * 100).toFixed(1)}% wide · starts tracking straight away`}
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
              <p className="text-sm text-zinc-500">
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
              information rather than a tuning problem. */}

          {!calibrating && !sample && <DrillPicker value={mode} onChange={setMode} />}

          {source === 'camera' && !calibrating && !sample && (
            <label className="flex items-start gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 text-sm text-zinc-300">
              <input type="checkbox" checked={keepVideo} onChange={(e) => setKeepVideo(e.target.checked)} className="mt-0.5 h-5 w-5 accent-orange-500" />
              <span>
                Keep the video for replays
                <span className="block text-xs text-zinc-500">
                  Lets you watch any shot again and make a highlight reel. It stays on this phone and is gone when you leave, unless you share a reel.
                </span>
              </span>
            </label>
          )}

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
          <p className="text-sm text-zinc-500 flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5" />
            {rechecked
              ? 'Checking the recording again at full frame rate. It plays at normal speed.'
              : health.issues.length
                ? 'Something needs fixing: see the amber note on the picture.'
                : 'Counting shots. Every one can be corrected before you save.'}
          </p>
          <Button variant="secondary" size="lg" className="w-full gap-2" onClick={stopTracking}>
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
            <div className="text-sm text-zinc-400">
              {shots.length ? Math.round((makes / shots.length) * 100) : 0}%{describeMode(mode) ? ` · ${describeMode(mode)}` : ''} · tap a shot to
              switch make/miss
            </div>
            {/* Counted at the top, because an unresolved shot is currently
                saved as a miss and the player should know how many of these
                the number above is resting on. */}
            {unresolved > 0 && (
              <div className="mt-1 text-sm font-semibold text-amber-400">
                {unresolved} shot{unresolved === 1 ? '' : 's'} the tracker could not call - {replayFile ? 'watch and ' : ''}set{' '}
                {unresolved === 1 ? 'it' : 'them'} below
              </div>
            )}
          </div>

          {/* Against the player's saved sessions, on the numbers as corrected
              here: they are what gets saved */}
          {best.kind !== 'none' && (
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-600/40 bg-emerald-600/10 p-4">
              <Trophy className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" aria-hidden="true" />
              <div>
                <p className="font-bold text-white">
                  {best.kind === 'new' ? `New personal best: ${best.pct}%` : `Personal best set: ${best.pct}%`}
                </p>
                <p className="mt-1 text-sm text-zinc-300">
                  {best.kind === 'new'
                    ? `Your best before was ${best.previous.pct}% (${best.previous.makes}/${best.previous.attempts}). Save the session to keep it.`
                    : `Your first session of ${MIN_PB_ATTEMPTS} shots or more, so this is the % to beat. Save the session to keep it.`}
                </p>
              </div>
            </div>
          )}

          {/* The sample's answer is known, so say how close the call was rather
              than asking the player to check shots they never saw taken. */}
          {sample && (
            <div className="rounded-2xl border border-emerald-600/40 bg-emerald-600/10 p-4 text-sm">
              <p className="font-semibold text-white">
                {makes === sample.truth.makes && shots.length === sample.truth.attempts
                  ? `Spot on. In this clip ${sample.truth.makes} of ${sample.truth.attempts} really went in.`
                  : `In this clip ${sample.truth.makes} of ${sample.truth.attempts} really went in.`}
              </p>
              <p className="mt-1 text-zinc-300">
                {makes !== sample.truth.makes || shots.length !== sample.truth.attempts
                  ? 'A slow or busy phone can miss a moment. On your own sessions you can fix any call before saving.'
                  : unresolved > 0
                    ? `It was unsure of ${unresolved === 1 ? 'one shot' : `${unresolved} shots`} and guessed right. On your own sessions you settle a shot like that with one tap.`
                    : 'That was the real tracker, running on your phone. At a court it does the same with your own shots.'}
              </p>
            </div>
          )}
          {sample?.cta}

          {/* How well the tracking itself went. Counts from a run that managed
              8 frames a second deserve less trust than one that managed 30. */}
          {quality && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold uppercase tracking-wider text-zinc-400">Tracking quality</span>
                <span className="tabular-nums text-zinc-400">{quality.fps.toFixed(0)} fps analysed</span>
              </div>
              {/* Judged on how many shots the tracker was unsure of, not on how
                  often the ball was in view: the tracker reports only a ball in
                  flight, under a tenth of the frames of a normal session. */}
              <p className="mt-1.5 text-sm text-zinc-500">
                {lowFps
                  ? recording
                    ? 'That is a low frame rate, so shots may have been missed between frames. Check it again from the recording below to catch them.'
                    : 'That is a low frame rate, so shots may have been missed between frames. Closing other apps, or filming a clip and analysing it afterwards, gives the tracker more to work with.'
                  : shots.length > 0 && unresolved / shots.length > 0.2
                    ? 'The tracker was unsure of a lot of these. That is usually the hoop being small in the picture, dim light, or bright windows behind it - the tips on the first screen help most.'
                    : quality.moved
                      ? 'The camera moved during the session. Calls made before you fixed the rim are worth a second look.'
                      : 'Good conditions. The counts below should be close, but check them anyway.'}
              </p>
            </div>
          )}

          {/* A second look at full frame rate, from the recording. Offered
              whenever there is one, pressed hardest when the phone was slow. */}
          {recording && !rechecked && rim && (
            <div className={`rounded-2xl border p-3 ${lowFps ? 'border-orange-500/50 bg-orange-600/10' : 'border-zinc-800 bg-zinc-900/70'}`}>
              <p className="text-sm font-semibold text-white">Check again from the recording</p>
              <p className="mt-1 text-sm text-zinc-400">
                Runs the tracker over the video at its full frame rate. It plays at normal speed, so it takes as long as the session
                did ({clock(elapsedMs)}). The calls below are replaced by the new ones.
              </p>
              <Button variant={lowFps ? 'primary' : 'secondary'} size="sm" className="mt-2 gap-2" onClick={recheck}>
                <RotateCcw className="h-4 w-4" /> Check again
              </Button>
              {recording.capped && <p className="mt-2 text-sm text-zinc-500">The recording stopped early to save space, so only the first part is in it.</p>}
            </div>
          )}

          {!sample && shots.length > 0 && <ShootingBreakdown shots={shots.map(toSavedShot)} />}

          {/* The player is the only one who saw what really happened, and this
              is the moment they know it. The run's numbers go with the report
              so it can be matched to what the tracker did. */}
          {!sample && <ReportProblem
            label="Tracker got this wrong? Tell us"
            context={`Shot tracker, ${source === 'camera' ? 'live camera' : 'video'}: ${makes}/${shots.length} on screen, ${unresolved} unclear${
              quality ? `, ${quality.fps.toFixed(0)} fps${quality.worker === false ? ', main thread' : ''}` : ''
            }, ${ZONE_LABELS[zone]}`}
            className="text-xs text-zinc-500 underline"
            panelClassName="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3"
          />}

          <div className="space-y-1.5 max-h-96 overflow-y-auto">
            {shots.map((s, i) => (
              <div key={s.id} className="rounded-lg bg-zinc-900/70 px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-8 text-zinc-500">#{i + 1}</span>
                  {replayFile && s.called ? (
                    <button
                      type="button"
                      onClick={() => setReplayId(s.id)}
                      aria-label={`Watch shot ${i + 1} again`}
                      className="flex h-9 w-14 items-center gap-1 rounded-md text-zinc-400 hover:text-white"
                    >
                      <Play className="h-3.5 w-3.5" /> {clock(s.t)}
                    </button>
                  ) : (
                    <span className="w-14 text-zinc-500">{clock(s.t)}</span>
                  )}
                  {/* A shot the detector never actually watched cross the rim is
                      not a miss, it is a question - and it was being shown in the
                      same red as a miss it had really seen. Two explicit buttons
                      instead of a toggle, because a toggle makes confirming the
                      guess cost two taps and changing it cost one. */}
                  {s.confident ? (
                    <button type="button" onClick={() => toggleShot(s.id)} className={`flex-1 rounded-md py-1 font-semibold ${s.made ? 'bg-emerald-600/20 text-emerald-300' : 'bg-red-600/20 text-red-300'}`}>
                      {s.made ? 'Make' : 'Miss'}
                    </button>
                  ) : (
                    <div className="flex flex-1 items-center gap-1.5">
                      <span className="text-xs font-semibold text-amber-400">Unclear</span>
                      <button
                        type="button"
                        onClick={() => settleShot(s.id, true)}
                        className="flex-1 rounded-md border border-emerald-600/40 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-600/20"
                      >
                        Make
                      </button>
                      <button
                        type="button"
                        onClick={() => settleShot(s.id, false)}
                        className="flex-1 rounded-md border border-red-600/40 py-1 text-xs font-semibold text-red-300 hover:bg-red-600/20"
                      >
                        Miss
                      </button>
                    </div>
                  )}
                  {source === 'file' && !rechecked && onCheckForm && videoFile && (
                    <button type="button" onClick={() => onCheckForm(videoFile, s.t)} className="text-xs text-cyan-400 underline">
                      Form
                    </button>
                  )}
                  <button type="button" onClick={() => deleteShot(s.id)} aria-label={`Delete shot ${i + 1}`} className="text-zinc-500 hover:text-red-400">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                {/* Where it was taken from, for the shot chart. A spots drill
                    fills this in; otherwise it falls back to the session's. */}
                {!sample && (
                  <select
                    value={s.zone ?? ''}
                    onChange={(e) => setShotZone(s.id, e.target.value)}
                    aria-label={`Where shot ${i + 1} was taken from`}
                    className="mt-1.5 w-full rounded-md border border-zinc-800 bg-zinc-950/60 px-2 py-1 text-xs text-zinc-300"
                  >
                    <option value="">Spot: {ZONE_LABELS[zone]} (the session&apos;s)</option>
                    {(Object.keys(ZONE_SPOTS) as CourtZone[]).map((z) => (
                      <option key={z} value={z}>
                        Spot: {ZONE_LABELS[z]}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
            {shots.length === 0 && (
              <p className="text-sm text-zinc-500">
                No shots were detected. Make sure the ball is visible for its whole flight toward the hoop, in good light, with nothing else moving in frame.
              </p>
            )}
          </div>

          {replayShot && replayFile && (
            <ShotReplay
              file={replayFile}
              atMs={inVideo(replayShot.t)}
              title={`Shot ${replayIndex + 1} at ${clock(replayShot.t)}`}
              made={replayShot.confident ? replayShot.made : null}
              onSet={(made) => {
                settleShot(replayShot.id, made);
                setReplayId(null);
              }}
              onClose={() => setReplayId(null)}
            />
          )}

          {sample ? (
            // A plain button, not <Button>: handed to a component, the React
            // Compiler cannot tell startSample is an event handler, and analyses
            // it - and startTracking under it - as render code (see
            // startFromSavedRim)
            <button
              type="button"
              onClick={startSample}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-zinc-800 font-semibold text-zinc-100 hover:bg-zinc-700"
            >
              <RotateCcw className="h-4 w-4" /> Watch it again
            </button>
          ) : (
          <>
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
          {rim && shots.length > 0 && !rechecked && (
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
                  <p className="mt-1 text-sm text-zinc-500">
                    Skip the two taps next time you film from this spot. Kept on this phone and with your account. Only you
                    see it, so no addresses needed.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="rim-name"
                      value={rimName}
                      onChange={(e) => setRimName(e.target.value)}
                      maxLength={MAX_RIM_NAME}
                      placeholder="e.g. Left hoop"
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

          {anyWithoutZone && (
            <label className="block text-sm text-zinc-300">
              Where were you shooting from?
              <select value={zone} onChange={(e) => setZone(e.target.value as ShotZoneChoice)} className="mt-1 w-full rounded-xl bg-zinc-900 border border-zinc-800 px-3 py-2 text-white">
                <option value="all-around">{ZONE_LABELS['all-around']} (moving around)</option>
                {(Object.keys(ZONE_SPOTS) as CourtZone[]).map((z) => (
                  <option key={z} value={z}>
                    {ZONE_LABELS[z]}
                  </option>
                ))}
              </select>
            </label>
          )}

          {replayFile && timeline && timeline.calls.length > 0 && (
            <TrackerVideoExport file={replayFile} timeline={timeline} offsetMs={replayOffset} best={shootingBest} />
          )}

          {replayFile ? (
            <HighlightReel
              file={replayFile}
              makeTimesMs={shots.filter((s) => s.made).map((s) => inVideo(s.t))}
              makes={makes}
              attempts={shots.length}
            />
          ) : (
            makes > 0 && (
              <p className="flex items-start gap-2 text-sm text-zinc-500">
                <Film className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                Keep the video for replays next time, or film with your phone&apos;s camera app and choose &ldquo;Video from your phone&rdquo;, to get a
                highlight reel of your makes.
              </p>
            )
          )}
          {/* Owner only: this session, checked, becomes a test clip for the
              tracker's bench (scripts/bench-suite.mjs) */}
          {ownerTools && replayFile && rim && shots.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
              <p className="flex items-center gap-2 text-sm font-semibold text-white">
                <FlaskConical className="h-4 w-4 text-cyan-400" aria-hidden="true" /> Test library (owner)
              </p>
              {benchSaved === null ? (
                <>
                  <p className="mt-1 text-sm text-zinc-400">
                    Fix every call first: the list as it stands becomes the right answers. Saves the video and a labels file to this phone; copy
                    both into the bench folder on the laptop.
                  </p>
                  <Button variant="secondary" size="sm" className="mt-2" onClick={saveForBench}>
                    Save for the test library
                  </Button>
                </>
              ) : (
                <p className="mt-1 text-sm text-emerald-300">
                  Saved.{' '}
                  {benchSaved > 0
                    ? `${benchSaved} shot${benchSaved === 1 ? '' : 's'} added by hand had no time in the video and were left out.`
                    : 'Every shot had its time.'}
                </p>
              )}
            </div>
          )}

          <Button variant="primary" size="lg" className="w-full" isLoading={saving} onClick={saveSession}>
            Save as a Hoops session
          </Button>
          <button type="button" onClick={() => { setShots([]); setRim(null); setRecording(null); setRechecked(false); setStep('source'); }} className="w-full text-center text-xs text-zinc-500">
            Start over
          </button>
          </>
          )}
        </div>
      )}
    </div>
  );
}
