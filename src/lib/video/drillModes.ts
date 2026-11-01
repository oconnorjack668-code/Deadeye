// src/lib/video/drillModes.ts
// Ways to shoot with the tracker beyond counting: a target number of makes,
// a timed round, or a set of spots taken in turn.
//
// A player on their own has no one to count, time or tell them when to move.
// The tracker already knows every make and the time, so it can do all three -
// and with spots, it also knows where each shot was taken from without anyone
// tapping anything, which is what the zones on the shot chart need.
import { ZONE_LABELS, type CourtZone } from '@/lib/court';

export type DrillMode =
  | { kind: 'free' }
  | { kind: 'target'; makes: number }
  | { kind: 'timed'; seconds: number }
  | { kind: 'spots'; set: SpotSetId; perSpot: number };

export const SPOT_SETS = {
  'five-mid': { label: '5 spots, midrange', spots: ['mid-left-corner', 'mid-left-wing', 'mid-center', 'mid-right-wing', 'mid-right-corner'] },
  'five-three': { label: '5 spots, threes', spots: ['three-left-corner', 'three-left-wing', 'three-top', 'three-right-wing', 'three-right-corner'] },
  'close-in': { label: 'Paint and free throws', spots: ['paint', 'free-throw'] },
} as const satisfies Record<string, { label: string; spots: readonly CourtZone[] }>;

export type SpotSetId = keyof typeof SPOT_SETS;

export const TARGET_CHOICES = [10, 25, 50, 100] as const;
export const TIMED_CHOICES = [60, 120, 300] as const;
export const PER_SPOT_CHOICES = [5, 10] as const;

export const FREE: DrillMode = { kind: 'free' };

export interface DrillProgress {
  /** The drill is finished: target reached, time up, every spot shot. */
  done: boolean;
  /** For the HUD: "18 / 25 makes", "0:42 left", "Left wing · 3 left". */
  label: string;
  /** 0..1 for a progress bar. */
  fraction: number;
  /** Spots: where to shoot from now. */
  zone?: CourtZone;
  /** Spots: which spot of how many. */
  spot?: { index: number; of: number };
}

function clock(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Which spot shot number `index` (from 0) is taken from, in a spots drill. */
export function zoneForShot(mode: DrillMode, index: number): CourtZone | undefined {
  if (mode.kind !== 'spots') return undefined;
  const spots = SPOT_SETS[mode.set].spots;
  const at = Math.floor(index / mode.perSpot);
  return at < spots.length ? spots[at] : undefined;
}

export function drillProgress(mode: DrillMode, made: readonly boolean[], elapsedMs: number): DrillProgress | null {
  if (mode.kind === 'free') return null;
  const makes = made.filter(Boolean).length;
  if (mode.kind === 'target') {
    return { done: makes >= mode.makes, label: `${Math.min(makes, mode.makes)} / ${mode.makes} makes`, fraction: Math.min(1, makes / mode.makes) };
  }
  if (mode.kind === 'timed') {
    const total = mode.seconds * 1000;
    const left = total - elapsedMs;
    return { done: left <= 0, label: left > 0 ? `${clock(left)} left` : 'Time', fraction: Math.min(1, Math.max(0, elapsedMs / total)) };
  }
  const spots = SPOT_SETS[mode.set].spots;
  const total = spots.length * mode.perSpot;
  const taken = made.length;
  if (taken >= total) return { done: true, label: 'All spots done', fraction: 1, spot: { index: spots.length, of: spots.length } };
  const index = Math.floor(taken / mode.perSpot);
  const zone = spots[index];
  const left = mode.perSpot - (taken % mode.perSpot);
  return {
    done: false,
    label: `${ZONE_LABELS[zone]} · ${left} left`,
    fraction: taken / total,
    zone,
    spot: { index: index + 1, of: spots.length },
  };
}

/**
 * What to say when shot `index` (from 0) has just been taken, or null: the
 * move to the next spot, the drill ending, a target reached.
 */
export function drillCue(mode: DrillMode, made: readonly boolean[]): string | null {
  const progress = drillProgress(mode, made, 0);
  if (!progress) return null;
  if (mode.kind === 'target') {
    const makes = made.filter(Boolean).length;
    const was = made.slice(0, -1).filter(Boolean).length;
    return makes >= mode.makes && was < mode.makes ? `${mode.makes} makes. Done.` : null;
  }
  if (mode.kind === 'spots') {
    const taken = made.length;
    if (taken === 0 || taken % mode.perSpot !== 0) return null;
    if (progress.done) return 'All spots done.';
    return progress.zone ? `Move to ${ZONE_LABELS[progress.zone]}.` : null;
  }
  return null;
}

/** Stored with the session, and shown in review. */
export function describeMode(mode: DrillMode): string | null {
  if (mode.kind === 'free') return null;
  if (mode.kind === 'target') return `Make ${mode.makes}`;
  if (mode.kind === 'timed') return `${mode.seconds >= 60 ? `${mode.seconds / 60} min` : `${mode.seconds}s`} timed`;
  return `${SPOT_SETS[mode.set].label}, ${mode.perSpot} each`;
}
