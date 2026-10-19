// src/lib/video/rimAdjust.ts
// Fine-tuning the two rim taps in a magnified view of the hoop.
//
// The two taps set everything the tracker measures against: the crop, the
// ball size it looks for, the rim line and the net. Measured on a 2:39
// session, where the taps landed moved accuracy between 22 and 31 shots of 31.
// And on that video the whole ring was 50 pixels across, about 18 points on a
// phone screen, so a fingertip could not hit its edges. Tapping roughly and
// then placing each end in a picture where the ring fills half the width
// takes the guesswork out.
//
// Points are fractions of the video frame (0..1), as everywhere else in the
// tracker. The zoom region is in video pixels.

export interface Point {
  x: number;
  y: number;
}

export interface ZoomRegion {
  sx: number;
  sy: number;
  /** Square, so the picture is not stretched. */
  side: number;
}

/**
 * How many rim widths the magnified view shows across. The ring then fills
 * about half of it, with room either side to see where its edges are.
 */
export const ZOOM_RIM_WIDTHS = 2.2;

/** Never show fewer source pixels than this, or the picture is all blur. */
export const MIN_ZOOM_PX = 64;

/**
 * Below this many video pixels across, the ring is too small to count well.
 *
 * The 51s test clip had a ring 143px across and gets every shot right. The
 * 2:39 clip had one 50px across and gets nine in ten. Past about 70 the ball
 * is big enough to separate cleanly from the net.
 */
export const SMALL_RIM_PX = 70;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** How wide the ring the two points describe is, in video pixels. */
export function rimPixels(a: Point, b: Point, videoWidth: number): number {
  return Math.abs(b.x - a.x) * videoWidth;
}

/**
 * The square of video to magnify, centred between the two taps.
 *
 * Fixed when the view opens rather than following the points: a picture that
 * moved while a finger was dragging in it would be impossible to aim in.
 */
export function zoomRegionFor(a: Point, b: Point, videoWidth: number, videoHeight: number): ZoomRegion {
  const wanted = Math.max(rimPixels(a, b, videoWidth) * ZOOM_RIM_WIDTHS, MIN_ZOOM_PX);
  const side = Math.min(wanted, videoWidth, videoHeight);
  const cx = ((a.x + b.x) / 2) * videoWidth;
  const cy = ((a.y + b.y) / 2) * videoHeight;
  return {
    sx: clamp(cx - side / 2, 0, videoWidth - side),
    sy: clamp(cy - side / 2, 0, videoHeight - side),
    side,
  };
}

/** A point in the frame, as pixels on a magnified canvas `canvasPx` square. */
export function toZoom(p: Point, region: ZoomRegion, videoWidth: number, videoHeight: number, canvasPx: number): Point {
  const scale = canvasPx / region.side;
  return { x: (p.x * videoWidth - region.sx) * scale, y: (p.y * videoHeight - region.sy) * scale };
}

/** A position on the magnified canvas, back as a point in the frame, kept inside the zoom. */
export function fromZoom(c: Point, region: ZoomRegion, videoWidth: number, videoHeight: number, canvasPx: number): Point {
  const scale = region.side / canvasPx;
  return {
    x: (region.sx + clamp(c.x, 0, canvasPx) * scale) / videoWidth,
    y: (region.sy + clamp(c.y, 0, canvasPx) * scale) / videoHeight,
  };
}

/** Moves a point by whole video pixels, for the arrow buttons. */
export function nudge(p: Point, dxPx: number, dyPx: number, videoWidth: number, videoHeight: number): Point {
  return { x: clamp(p.x + dxPx / videoWidth, 0, 1), y: clamp(p.y + dyPx / videoHeight, 0, 1) };
}

/** The two points, left one first, which is the order the adjuster labels them in. */
export function leftFirst(a: Point, b: Point): [Point, Point] {
  return a.x <= b.x ? [a, b] : [b, a];
}
