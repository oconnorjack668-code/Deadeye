// src/lib/video/cameraControls.ts
// Zoom, focus and exposure on the live camera, where the phone allows them.
//
// The size of the ring in the picture limits the tracker more than its code
// does now: the 2:39 bench clip had a ring 50px across and gets about nine
// calls in ten, the 51s clip had one 143px across and gets all of them. A
// player on a tripod three-point-line distance away usually films the first
// kind. Most phones can zoom the camera from the browser (Chrome on Android
// does; Safari mostly does not), so where they can, the tracker offers to.
//
// Auto exposure works against frame differencing: when someone walks in
// front of a bright window the whole picture brightens and darkens, and every
// pixel "moves". Once the hoop is framed, nothing about the light needs to
// change, so focus, exposure and white balance are held where they are.
//
// Everything here is pure, reading capability and settings objects as plain
// data, because the browser types for them do not include these fields.
import type { Point } from './rimAdjust';

export interface ZoomRange {
  min: number;
  max: number;
  step: number;
}

/** The ring this many video pixels across is comfortably big enough. */
export const TARGET_RIM_PX = 120;

/**
 * Share of the room to the edge of the frame zoom may use. Less than all of
 * it, so a ball arcing in from above is still in the picture.
 */
const FIT_MARGIN = 0.85;

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object';
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** The camera's zoom range, or null when it cannot zoom from the browser. */
export function zoomRange(capabilities: unknown): ZoomRange | null {
  if (!isObject(capabilities) || !isObject(capabilities.zoom)) return null;
  const { min, max, step } = capabilities.zoom;
  if (!finite(min) || !finite(max) || max <= min) return null;
  return { min, max, step: finite(step) && step > 0 ? step : 0.1 };
}

export function currentZoom(settings: unknown): number | null {
  return isObject(settings) && finite(settings.zoom) ? settings.zoom : null;
}

/** Snapped to the camera's step and kept in range. */
export function clampZoom(zoom: number, range: ZoomRange): number {
  const stepped = range.min + Math.round((zoom - range.min) / range.step) * range.step;
  return Math.round(Math.min(range.max, Math.max(range.min, stepped)) * 1000) / 1000;
}

/**
 * The zoom that makes the ring about TARGET_RIM_PX across, limited so the
 * hoop and the space around it the tracker watches (three rim widths each
 * way, see CROP_RIM_WIDTHS) stay in the picture.
 *
 * Zoom crops about the centre of the frame, so a hoop near an edge cannot be
 * zoomed as far as one in the middle. `rim` is in frame fractions at the
 * current zoom; `aspect` is height over width.
 */
export function zoomToFit(
  rim: { x: number; y: number; width: number },
  rimPx: number,
  zoom: number,
  range: ZoomRange,
  aspect: number
): number {
  if (rimPx <= 0 || rim.width <= 0) return zoom;
  const wanted = TARGET_RIM_PX / rimPx;
  // Half the watched square, as fractions of width and of height
  const halfW = 3 * rim.width;
  const halfH = (3 * rim.width) / (aspect > 0 ? aspect : 1);
  const fitX = (0.5 * FIT_MARGIN) / (Math.abs(rim.x - 0.5) + halfW);
  const fitY = (0.5 * FIT_MARGIN) / (Math.abs(rim.y - 0.5) + halfH);
  const factor = Math.min(wanted, fitX, fitY);
  // Never zoom out to fit: a hoop already too big is the player's to reframe
  return clampZoom(zoom * Math.max(1, factor), range);
}

/**
 * Where a point in the frame lands after the zoom changes, as zoom crops
 * about the centre. A first guess only - on phones with several lenses the
 * centre can shift a little when the camera changes lens - so the rim is
 * always shown magnified for checking after a zoom.
 */
export function zoomPoint(p: Point, from: number, to: number): Point {
  const k = from > 0 ? to / from : 1;
  return { x: 0.5 + (p.x - 0.5) * k, y: 0.5 + (p.y - 0.5) * k };
}

/** Both rim ends still inside the frame after a zoom. */
export function insideFrame(points: Point[]): boolean {
  return points.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1);
}

/**
 * Constraints that hold focus, exposure and white balance where they are now,
 * one per setting so a camera that refuses one still takes the others. Empty
 * when the camera allows none of them, or does not report what they are set
 * to: switching to manual without the current value could jump to a default.
 */
export function lockConstraints(capabilities: unknown, settings: unknown): Array<Record<string, unknown>> {
  if (!isObject(capabilities) || !isObject(settings)) return [];
  const allows = (key: string) => Array.isArray(capabilities[key]) && (capabilities[key] as unknown[]).includes('manual');
  const out: Array<Record<string, unknown>> = [];
  if (allows('focusMode') && finite(settings.focusDistance)) out.push({ focusMode: 'manual', focusDistance: settings.focusDistance });
  if (allows('exposureMode') && finite(settings.exposureTime)) out.push({ exposureMode: 'manual', exposureTime: settings.exposureTime });
  if (allows('whiteBalanceMode') && finite(settings.colorTemperature)) {
    out.push({ whiteBalanceMode: 'manual', colorTemperature: settings.colorTemperature });
  }
  return out;
}

// --- Browser access. Each is guarded: these APIs are new, partly supported,
// --- and none of them is worth stopping a session over.

type ConstrainableTrack = MediaStreamTrack & {
  getCapabilities?: () => unknown;
};

export function videoTrack(stream: MediaStream | null): ConstrainableTrack | null {
  return (stream?.getVideoTracks()[0] as ConstrainableTrack | undefined) ?? null;
}

export function trackZoom(track: ConstrainableTrack | null): { range: ZoomRange; zoom: number } | null {
  if (!track?.getCapabilities) return null;
  try {
    const range = zoomRange(track.getCapabilities());
    if (!range) return null;
    return { range, zoom: currentZoom(track.getSettings()) ?? range.min };
  } catch {
    return null;
  }
}

export async function setZoom(track: ConstrainableTrack | null, zoom: number): Promise<boolean> {
  if (!track) return false;
  try {
    await track.applyConstraints({ advanced: [{ zoom } as MediaTrackConstraintSet] });
    return true;
  } catch {
    return false;
  }
}

/** Holds focus, exposure and white balance. Returns how many the camera took. */
export async function lockCamera(track: ConstrainableTrack | null): Promise<number> {
  if (!track?.getCapabilities) return 0;
  let constraints: Array<Record<string, unknown>> = [];
  try {
    constraints = lockConstraints(track.getCapabilities(), track.getSettings());
  } catch {
    return 0;
  }
  let applied = 0;
  for (const c of constraints) {
    try {
      await track.applyConstraints({ advanced: [c as MediaTrackConstraintSet] });
      applied++;
    } catch {
      // This camera will not hold that one; the others still help
    }
  }
  return applied;
}
