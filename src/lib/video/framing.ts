// src/lib/video/framing.ts
// A readiness check on the picture before tracking starts.
//
// The filming tips on the first screen are each a measured cause of wrong
// calls - a small hoop, no room above it, dim light or bright windows behind
// the ring, a phone that is not steady - but a list of five tips is read
// once, if at all. This looks at the picture the player has actually set up,
// once the rim is marked, and says which of them applies, while it is still
// easy to move the phone.
import { SMALL_RIM_PX } from './rimAdjust';
import { DARK_LIGHT } from './liveHealth';
import { bestShift, brightnessGrid } from './cameraShift';
import type { Rim } from './shotDetector';

export type FramingCheckId = 'size' | 'room' | 'light' | 'glare' | 'steady';

export interface FramingCheck {
  id: FramingCheckId;
  ok: boolean;
  label: string;
  /** What to do about it, when not ok. */
  fix?: string;
}

/** Share of near-white pixels around the hoop above which a window or the sky is behind it. */
const GLARE_SHARE = 0.18;
const GLARE_LEVEL = 245;

/** Rim widths above the ring the picture should show, for the ball coming down. */
const ROOM_RIM_WIDTHS = 2;

export interface FramingInput {
  rim: Rim;
  videoWidth: number;
  videoHeight: number;
  /** RGBA of the hoop crop (crop.ts), and its side in pixels. */
  crop: Uint8ClampedArray;
  cropPx: number;
  /** A second crop a moment later, for steadiness; omitted for a clip, which cannot be moved now. */
  later?: Uint8ClampedArray | null;
}

export function checkFraming(input: FramingInput): FramingCheck[] {
  const { rim, videoWidth, videoHeight, crop, cropPx } = input;
  const checks: FramingCheck[] = [];

  const rimPx = rim.width * videoWidth;
  checks.push(
    rimPx >= SMALL_RIM_PX
      ? { id: 'size', ok: true, label: 'Hoop big enough in the picture' }
      : { id: 'size', ok: false, label: 'Hoop small in the picture', fix: 'Move closer or zoom in, so the ring is bigger.' }
  );

  // The ball comes down from above the ring; it has to be in the picture
  const roomPx = rim.y * videoHeight;
  checks.push(
    roomPx >= rimPx * ROOM_RIM_WIDTHS
      ? { id: 'room', ok: true, label: 'Room above the hoop' }
      : { id: 'room', ok: false, label: 'Little room above the hoop', fix: 'Tilt the phone down a little, or move it back, so the ball is in shot as it comes down.' }
  );

  let sum = 0;
  let bright = 0;
  const pixels = cropPx * cropPx;
  for (let i = 0; i < pixels; i++) {
    const p = i * 4;
    const l = crop[p] * 0.299 + crop[p + 1] * 0.587 + crop[p + 2] * 0.114;
    sum += l;
    if (l >= GLARE_LEVEL) bright++;
  }
  const light = sum / pixels;
  checks.push(
    light >= DARK_LIGHT
      ? { id: 'light', ok: true, label: 'Enough light' }
      : { id: 'light', ok: false, label: 'Dim', fix: 'More light on the hoop helps the tracker see the ball.' }
  );
  checks.push(
    bright / pixels <= GLARE_SHARE
      ? { id: 'glare', ok: true, label: 'No bright light behind the hoop' }
      : { id: 'glare', ok: false, label: 'Bright light behind the hoop', fix: 'Film from an angle where windows or the sun are not behind the ring.' }
  );

  if (input.later) {
    const shift = bestShift(brightnessGrid(crop, cropPx, cropPx), brightnessGrid(input.later, cropPx, cropPx));
    const moving = (shift.dx !== 0 || shift.dy !== 0) && shift.match - shift.still > 0.04;
    checks.push(
      moving
        ? { id: 'steady', ok: false, label: 'The phone is moving', fix: 'Put it on a tripod or prop it up so it stays still.' }
        : { id: 'steady', ok: true, label: 'Phone steady' }
    );
  }
  return checks;
}

/** The checks as one light: green when all pass, amber with any problem. */
export function framingVerdict(checks: FramingCheck[]): 'good' | 'fix' {
  return checks.every((c) => c.ok) ? 'good' : 'fix';
}
