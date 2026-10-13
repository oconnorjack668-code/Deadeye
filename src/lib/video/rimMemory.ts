// src/lib/video/rimMemory.ts
// Remembers measured rims so a player taps twice per hoop rather than twice per
// clip. The whole reason the tracker asks for two taps is that our detector is a
// general-purpose COCO model with no hoop class - it cannot find a rim by
// itself. It does not have to ask twice for the same hoop, though.
//
// Kept on the device, not in the database, on purpose: a rim measurement is
// only valid for one camera position, and where this phone sits is a property
// of this phone. Syncing someone's driveway rim to their laptop would offer
// them a measurement that cannot be right. It also needs no migration.
import { MAX_RIM_TILT, MAX_RIM_WIDTH, MIN_RIM_WIDTH, type Rim } from './shotDetector';

const KEY = 'hoopiq-saved-rims-v1';
/** Keeping a handful: past this the list is slower to pick from than to re-tap. */
export const MAX_SAVED_RIMS = 6;
export const MAX_RIM_NAME = 40;

export interface SavedRim {
  id: string;
  name: string;
  rim: Rim;
  /** Epoch ms, so the list can lead with what was used most recently. */
  usedAt: number;
}

/**
 * True for a rim that could have come from two taps on a frame.
 *
 * localStorage is editable by whoever owns the browser and survives upgrades
 * that change this shape, so anything read back is treated as untrusted. A rim
 * that is merely wrong would silently mis-score every shot in a session, which
 * is worse than asking for two taps again.
 */
export function isUsableRim(value: unknown): value is Rim {
  if (!value || typeof value !== 'object') return false;
  const r = value as Record<string, unknown>;
  const { x, y, width, tilt } = r;
  if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number') return false;
  if (![x, y, width].every(Number.isFinite)) return false;
  if (x < 0 || x > 1 || y < 0 || y > 1) return false;
  if (width < MIN_RIM_WIDTH || width > MAX_RIM_WIDTH) return false;
  // Absent is fine - rims saved before tilt existed are level by definition.
  if (tilt !== undefined) {
    if (typeof tilt !== 'number' || !Number.isFinite(tilt)) return false;
    if (Math.abs(tilt) > MAX_RIM_TILT) return false;
  }
  return true;
}

function isSavedRim(value: unknown): value is SavedRim {
  if (!value || typeof value !== 'object') return false;
  const s = value as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    s.name.length > 0 &&
    typeof s.usedAt === 'number' &&
    Number.isFinite(s.usedAt) &&
    isUsableRim(s.rim)
  );
}

/** Most recently used first. Anything unreadable is dropped, never thrown. */
export function parseSavedRims(raw: string | null): SavedRim[] {
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(isSavedRim)
    .sort((a, b) => b.usedAt - a.usedAt)
    .slice(0, MAX_SAVED_RIMS);
}

/**
 * Adds or replaces a rim by name and returns the list to store.
 *
 * Saving under a name already in the list overwrites it, because re-measuring
 * "Home driveway" means the old measurement is wrong, not that there are two
 * driveways. Pure so it can be tested without a browser.
 */
export function withSavedRim(existing: SavedRim[], name: string, rim: Rim, now: number): SavedRim[] {
  const clean = name.replace(/\s+/g, ' ').trim().slice(0, MAX_RIM_NAME);
  if (!clean) return existing;
  const match = (s: SavedRim) => s.name.toLowerCase() === clean.toLowerCase();
  const replacing = existing.find(match);
  const entry: SavedRim = {
    id: replacing?.id || `${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: clean,
    rim,
    usedAt: now,
  };
  // Newest first, and the oldest falls off the end rather than growing forever
  return [entry, ...existing.filter((s) => !match(s))].slice(0, MAX_SAVED_RIMS);
}

/** Marks one as just used, so the list leads with the hoop being played on. */
export function touchSavedRim(existing: SavedRim[], id: string, now: number): SavedRim[] {
  return existing
    .map((s) => (s.id === id ? { ...s, usedAt: now } : s))
    .sort((a, b) => b.usedAt - a.usedAt);
}

export function withoutSavedRim(existing: SavedRim[], id: string): SavedRim[] {
  return existing.filter((s) => s.id !== id);
}

// --- Browser access. Every call is guarded: storage throws in private windows
// --- and returns nothing with site data blocked, and a remembered convenience
// --- is never worth breaking the tracker over.

export function loadSavedRims(): SavedRim[] {
  try {
    return parseSavedRims(window.localStorage.getItem(KEY));
  } catch {
    return [];
  }
}

export function storeSavedRims(rims: SavedRim[]): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(rims));
  } catch {
    // Nothing to do and nothing worth telling the player: they keep the rim
    // they just measured for this session either way.
  }
}
