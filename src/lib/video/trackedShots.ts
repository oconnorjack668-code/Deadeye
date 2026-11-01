// src/lib/video/trackedShots.ts
// The shots of one tracked session as they are kept, saved and read back.
//
// Every shot keeps what the tracker itself called next to what the player
// settled on in review. Before this, flipping a call overwrote it, so a saved
// session could not say whether the tracker had been right: the only accuracy
// numbers there were came from two clips on a laptop, and none from the live
// camera on a real phone, which is how most players use it. With the call
// kept, every saved session is a labelled run - the player is the one person
// who saw what really happened - and /admin/tracker adds them up.
//
// Only numbers are kept: no video, no picture, nothing about where the player
// was. The device is only its platform (iPhone, Android or other), which is
// all /admin/tracker groups by, and the privacy policy names it.
import type { DetectedShot } from './shotDetector';
import type { CourtZone } from '@/lib/court';

export type ShotZoneChoice = CourtZone | 'all-around';

export interface TrackedShot extends DetectedShot {
  id: number;
  /**
   * The tracker's own call, before the player changed anything. Null for a
   * shot the player added because the tracker never saw it.
   */
  called: { made: boolean; confident: boolean } | null;
  /** Where it was taken from, when known per shot (spot rotation or set in review). */
  zone?: ShotZoneChoice;
}

/** A shot as the tracker called it, ready for the list. */
export function fromDetected(shot: DetectedShot, id: number, zone?: ShotZoneChoice): TrackedShot {
  return { ...shot, id, called: { made: shot.made, confident: shot.confident }, ...(zone ? { zone } : {}) };
}

/** A shot the player added by hand. Always confident: they saw it. */
export function addedShot(id: number, t: number, made: boolean, zone?: ShotZoneChoice): TrackedShot {
  return { id, t, made, confident: true, called: null, ...(zone ? { zone } : {}) };
}

export interface RunQuality {
  /** Frames scored a second, over the whole run. */
  fps: number;
  frames: number;
  /** Share of scored frames with a ball in flight, 0..100. */
  ballSeenPct: number;
  /** Frames estimated to have gone unscored because the device fell behind. */
  skipped?: number;
  /** Smallest hoop picture the device dropped to, in px (CANVAS_LEVELS). */
  canvas?: number;
  /** Whether the pixel work ran in a worker. */
  worker?: boolean;
  /** Times the camera was seen to move during the run. */
  moved?: number;
  /** Live camera: whether it held focus and exposure for the run. */
  locked?: boolean;
}

export interface DeviceClass {
  os: 'ios' | 'android' | 'other';
}

/**
 * A coarse description of the device, for telling slow phones from fast ones.
 *
 * Deliberately not the user agent: that carries the exact model and browser
 * build, which is more than accuracy numbers need, and players can be 13.
 * iPadOS reports itself as a Mac, so a Mac with a touch screen counts as iOS.
 */
export function deviceClass(userAgent: string, maxTouchPoints: number): DeviceClass {
  const ua = userAgent || '';
  const ios = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  return { os: ios ? 'ios' : android ? 'android' : 'other' };
}

/** One shot as saved in video_analyses.summary. Short keys: a session can hold hundreds. */
export interface SavedShot {
  t: number;
  made: boolean;
  /** The tracker's call: 'make' or 'miss', or null for a shot the player added. Absent on sessions saved before calls were kept. */
  called?: 'make' | 'miss' | null;
  /** The tracker was unsure of its call. */
  unsure?: boolean;
  /** Where it crossed the rim line, in half-rims from the centre; negative is left of centre as the camera sees it. */
  side?: number;
  /** The ball was seen hitting the ring before the call. */
  rim?: boolean;
  zone?: ShotZoneChoice;
}

export interface ShotTrackingSummary {
  /** 2 from when the tracker's own calls were kept. Absent on older sessions. */
  v?: 2;
  source: 'camera' | 'file';
  zone: ShotZoneChoice;
  makes: number;
  attempts: number;
  shots: SavedShot[];
  /** Calls the tracker made that the player deleted, as having had no shot behind them. */
  removed?: number;
  quality?: RunQuality;
  device?: DeviceClass;
  /** The drill mode the session ran in, when not free shooting. */
  mode?: string;
  /** Minutes the player was actually shooting, long pauses left out. */
  activeMinutes?: number;
  /** A live session re-checked from its recording afterwards. */
  rechecked?: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** The signed crossing side of a shot, from the detector, rounded for saving. */
function savedSide(shot: DetectedShot): number | undefined {
  if (typeof shot.crossSide === 'number' && Number.isFinite(shot.crossSide)) return round2(shot.crossSide);
  return undefined;
}

export function toSavedShot(shot: TrackedShot): SavedShot {
  const side = savedSide(shot);
  return {
    t: Math.round(shot.t),
    made: shot.made,
    called: shot.called ? (shot.called.made ? 'make' : 'miss') : null,
    ...(shot.called && !shot.called.confident ? { unsure: true } : {}),
    ...(side === undefined ? {} : { side }),
    ...(shot.touchedRim ? { rim: true } : {}),
    ...(shot.zone ? { zone: shot.zone } : {}),
  };
}

export function buildSummary(input: {
  source: 'camera' | 'file';
  zone: ShotZoneChoice;
  shots: TrackedShot[];
  removed: number;
  quality: RunQuality | null;
  device: DeviceClass | null;
  mode?: string | null;
  activeMinutes?: number | null;
  rechecked?: boolean;
}): ShotTrackingSummary {
  const shots = input.shots.map(toSavedShot);
  return {
    v: 2,
    source: input.source,
    zone: input.zone,
    makes: shots.filter((s) => s.made).length,
    attempts: shots.length,
    shots,
    removed: input.removed,
    ...(input.quality ? { quality: input.quality } : {}),
    ...(input.device ? { device: input.device } : {}),
    ...(input.mode ? { mode: input.mode } : {}),
    ...(typeof input.activeMinutes === 'number' ? { activeMinutes: input.activeMinutes } : {}),
    ...(input.rechecked ? { rechecked: true } : {}),
  };
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/**
 * Reads a saved summary back, from any version, or null when it is not one.
 *
 * The column is jsonb written by the browser, so nothing in it is trusted:
 * unknown fields are dropped and a malformed shot is skipped, never thrown on.
 */
export function parseSummary(value: unknown): ShotTrackingSummary | null {
  if (!isObject(value) || !Array.isArray(value.shots)) return null;
  const shots: SavedShot[] = [];
  for (const raw of value.shots) {
    if (!isObject(raw) || typeof raw.made !== 'boolean') continue;
    const t = num(raw.t);
    if (t === undefined) continue;
    const shot: SavedShot = { t, made: raw.made };
    if (raw.called === 'make' || raw.called === 'miss' || raw.called === null) shot.called = raw.called;
    if (raw.unsure === true) shot.unsure = true;
    const side = num(raw.side);
    if (side !== undefined) shot.side = side;
    if (raw.rim === true) shot.rim = true;
    if (typeof raw.zone === 'string') shot.zone = raw.zone as ShotZoneChoice;
    shots.push(shot);
  }
  const quality = isObject(value.quality) && num(value.quality.fps) !== undefined ? (value.quality as unknown as RunQuality) : undefined;
  const device = isObject(value.device) && typeof value.device.os === 'string' ? (value.device as unknown as DeviceClass) : undefined;
  return {
    ...(value.v === 2 ? { v: 2 as const } : {}),
    source: value.source === 'camera' ? 'camera' : 'file',
    zone: typeof value.zone === 'string' ? (value.zone as ShotZoneChoice) : 'all-around',
    makes: shots.filter((s) => s.made).length,
    attempts: shots.length,
    shots,
    ...(num(value.removed) !== undefined ? { removed: num(value.removed) } : {}),
    ...(quality ? { quality } : {}),
    ...(device ? { device } : {}),
    ...(typeof value.mode === 'string' ? { mode: value.mode } : {}),
    ...(num(value.activeMinutes) !== undefined ? { activeMinutes: num(value.activeMinutes) } : {}),
    ...(value.rechecked === true ? { rechecked: true } : {}),
  };
}

/** How one saved run went against the player's own corrections. */
export interface RunAccuracy {
  /** Calls the tracker made, including ones the player then deleted. */
  calls: number;
  /** Calls the player kept and agreed with. */
  right: number;
  /** Calls the player switched between make and miss. */
  flipped: number;
  /** Shots the tracker never called, added by the player. */
  added: number;
  /** Calls with no shot behind them, deleted by the player. */
  removed: number;
  /** Calls the tracker marked unsure, and how many of those it guessed right. */
  unsure: number;
  unsureRight: number;
}

/** Null for sessions saved before the tracker's calls were kept: they cannot be scored. */
export function runAccuracy(summary: ShotTrackingSummary): RunAccuracy | null {
  if (summary.v !== 2) return null;
  let right = 0;
  let flipped = 0;
  let added = 0;
  let unsure = 0;
  let unsureRight = 0;
  for (const s of summary.shots) {
    if (s.called === null || s.called === undefined) {
      added++;
      continue;
    }
    const agreed = (s.called === 'make') === s.made;
    if (agreed) right++;
    else flipped++;
    if (s.unsure) {
      unsure++;
      if (agreed) unsureRight++;
    }
  }
  const removed = summary.removed ?? 0;
  return { calls: right + flipped + removed, right, flipped, added, removed, unsure, unsureRight };
}

export interface AccuracyTotals extends RunAccuracy {
  runs: number;
  /** Shots that really happened, by the player's account: kept calls plus added ones. */
  shots: number;
  /** Median frames scored a second, over the runs that recorded it. */
  medianFps: number | null;
  /** Runs under 12 fps, where shots are likely lost between frames. */
  slowRuns: number;
}

/** Adds up runs; sessions saved before calls were kept are skipped. */
export function totalAccuracy(summaries: ShotTrackingSummary[]): AccuracyTotals {
  const total: AccuracyTotals = { runs: 0, shots: 0, calls: 0, right: 0, flipped: 0, added: 0, removed: 0, unsure: 0, unsureRight: 0, medianFps: null, slowRuns: 0 };
  const fps: number[] = [];
  for (const summary of summaries) {
    const run = runAccuracy(summary);
    if (!run) continue;
    total.runs++;
    total.calls += run.calls;
    total.right += run.right;
    total.flipped += run.flipped;
    total.added += run.added;
    total.removed += run.removed;
    total.unsure += run.unsure;
    total.unsureRight += run.unsureRight;
    total.shots += run.right + run.flipped + run.added;
    const f = summary.quality?.fps;
    if (typeof f === 'number' && Number.isFinite(f)) {
      fps.push(f);
      if (f < 12) total.slowRuns++;
    }
  }
  if (fps.length) {
    const sorted = [...fps].sort((a, b) => a - b);
    total.medianFps = sorted[Math.floor(sorted.length / 2)];
  }
  return total;
}
