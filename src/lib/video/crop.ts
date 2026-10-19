// src/lib/video/crop.ts
// Crops the frame to the area around the hoop before running ball detection.
//
// Measured on a 2561x1184 clip: efficientdet_lite0 takes a 320x320 input, so
// the whole frame is downscaled about 8x and a basketball lands on roughly a
// dozen pixels. The model scored `person` at 0.919 on that footage and
// `sports ball` at 0.174 on 16% of frames - it was not blind, the ball was
// simply too small to resolve. Cropping to the hoop removes the downscale.
//
// This is also the semantically right thing to do: the shot detector only arms
// when the ball is above rim level and within a few rim widths of it, so the
// ball's position at half court was never used.
import type { Rim } from './shotDetector';
import type { NetBox } from './motionBall';

/** Model input is square; matching it avoids a second resize and any stretch. */
export const CROP_CANVAS_PX = 320;

/**
 * How much of the hoop's surroundings to keep, in rim widths.
 *
 * Six, because ShotDetector only arms while the ball is within APPROACH_WIDTHS
 * (3) rim widths of the centre, so +/-3 covers everything the logic reads.
 * Going wider costs magnification for no benefit: on a 2561px frame with the
 * rim at 5% of the width, 8 widths was 1024px - 87% of the frame height, and
 * barely a crop at all.
 */
export const CROP_RIM_WIDTHS = 6;

/** Never crop tighter than this, or a distant hoop yields a few useless pixels. */
export const MIN_CROP_PX = 240;

export interface CropRect {
  sx: number;
  sy: number;
  /** Square, so the crop can fill a square canvas without distorting the ball. */
  side: number;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A square region around the rim, clamped to stay inside the frame.
 * Position is clamped rather than size, so a hoop near an edge still gets a
 * full-sized, undistorted crop.
 */
export function cropRectFor(rim: Rim, videoWidth: number, videoHeight: number): CropRect {
  const rimPx = rim.width * videoWidth;
  const side = Math.min(Math.max(rimPx * CROP_RIM_WIDTHS, MIN_CROP_PX), videoWidth, videoHeight);
  return {
    sx: clamp(rim.x * videoWidth - side / 2, 0, Math.max(0, videoWidth - side)),
    sy: clamp(rim.y * videoHeight - side / 2, 0, Math.max(0, videoHeight - side)),
    side,
  };
}

/**
 * Turns a detection box in crop-canvas pixels back into a point normalised to
 * the whole frame, which is the coordinate space ShotDetector works in.
 */
export function ballCentreInFrame(
  box: { originX: number; originY: number; width: number; height: number },
  crop: CropRect,
  videoWidth: number,
  videoHeight: number,
  canvasPx: number = CROP_CANVAS_PX
): { x: number; y: number } {
  const fraction = crop.side / canvasPx;
  return {
    x: (crop.sx + (box.originX + box.width / 2) * fraction) / videoWidth,
    y: (crop.sy + (box.originY + box.height / 2) * fraction) / videoHeight,
  };
}

/**
 * Where the net hangs on the crop canvas: the rim's span, from the rim line
 * down one rim width, following the rim's tilt.
 *
 * One rim width because that is about how far a net hangs: 45cm of ring and a
 * net of 40 to 45cm.
 */
export function netBoxOnCanvas(
  rim: Rim,
  crop: CropRect,
  videoWidth: number,
  videoHeight: number,
  canvasPx: number = CROP_CANVAS_PX
): NetBox {
  const scale = canvasPx / crop.side;
  const rimPx = rim.width * videoWidth * scale;
  const cx = (rim.x * videoWidth - crop.sx) * scale;
  const cy = (rim.y * videoHeight - crop.sy) * scale;
  // tilt is dy/dx in fractions of the frame; on the canvas both axes share a scale
  const slope = (rim.tilt ?? 0) * (videoHeight / videoWidth);
  return { x0: cx - rimPx / 2, x1: cx + rimPx / 2, top: cy - (rimPx / 2) * slope, slope, depth: rimPx };
}

/** How much bigger the ball appears to the model than it would full-frame. */
export function magnification(crop: CropRect, videoWidth: number, canvasPx: number = CROP_CANVAS_PX): number {
  const fullFrameScale = canvasPx / videoWidth;
  const cropScale = canvasPx / crop.side;
  return cropScale / fullFrameScale;
}
