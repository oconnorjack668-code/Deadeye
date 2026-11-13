// src/lib/plays/spots.ts
// Named spots on the half court, in feet on the src/lib/court.ts geometry
// (origin at the left end of the baseline, y growing toward half court, the
// hoop at y = 5.25). Left and right are as the offence sees them, facing the
// basket: the left side is x < 25, which is also the left of the screen.
//
// Spots do two jobs: plays read as words ("3 cuts to the left corner"), and
// the editor (F2) snaps a dragged player to the nearest one so a play looks
// clean without fiddling.
import { HOOP } from '@/lib/court';

export interface Point {
  x: number;
  y: number;
}

export interface CourtSpot {
  id: string;
  label: string;
  at: Point;
}

/** Perimeter spots sit a foot or two behind the 23.75 ft three-point line. */
export const COURT_SPOTS: readonly CourtSpot[] = [
  { id: 'top', label: 'the top', at: { x: 25, y: 31 } },
  { id: 'left-slot', label: 'the left slot', at: { x: 15.5, y: 28.5 } },
  { id: 'right-slot', label: 'the right slot', at: { x: 34.5, y: 28.5 } },
  { id: 'left-wing', label: 'the left wing', at: { x: 5, y: 21 } },
  { id: 'right-wing', label: 'the right wing', at: { x: 45, y: 21 } },
  { id: 'left-corner', label: 'the left corner', at: { x: 1.5, y: 3 } },
  { id: 'right-corner', label: 'the right corner', at: { x: 48.5, y: 3 } },
  { id: 'left-elbow', label: 'the left elbow', at: { x: 17, y: 19 } },
  { id: 'right-elbow', label: 'the right elbow', at: { x: 33, y: 19 } },
  { id: 'high-post', label: 'the high post', at: { x: 25, y: 20 } },
  { id: 'left-block', label: 'the left block', at: { x: 15.5, y: 8 } },
  { id: 'right-block', label: 'the right block', at: { x: 34.5, y: 8 } },
  { id: 'left-short-corner', label: 'the left short corner', at: { x: 10, y: 3 } },
  { id: 'right-short-corner', label: 'the right short corner', at: { x: 40, y: 3 } },
] as const;

const BY_ID = new Map(COURT_SPOTS.map((s) => [s.id, s]));

/** The coordinates of a named spot. Throws on a typo, so seed data fails its test. */
export function spot(id: string): Point {
  const found = BY_ID.get(id);
  if (!found) throw new Error(`Unknown court spot: ${id}`);
  return { ...found.at };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** The closest named spot within `radius` feet, or null. */
export function nearestSpot(p: Point, radius = 4): CourtSpot | null {
  let best: CourtSpot | null = null;
  let bestDistance = radius;
  for (const s of COURT_SPOTS) {
    const d = distance(p, s.at);
    if (d <= bestDistance) {
      best = s;
      bestDistance = d;
    }
  }
  return best;
}

/** Moves a point onto the nearest named spot if one is within `radius` feet. */
export function snapToSpot(p: Point, radius = 3): Point {
  const s = nearestSpot(p, radius);
  return s ? { ...s.at } : p;
}

/** Within this many feet of the hoop counts as "the basket". */
const BASKET_RADIUS_FT = 4.5;

/**
 * Where a point is, in words: a named spot, "the basket", out of bounds, or
 * failing those the side of the floor.
 */
export function describePoint(p: Point): string {
  if (p.y < 0) return 'out of bounds';
  if (distance(p, HOOP) <= BASKET_RADIUS_FT) return 'the basket';
  const s = nearestSpot(p);
  if (s) return s.label;
  if (p.y >= 42) return p.x < 18 ? 'the left side near half court' : p.x > 32 ? 'the right side near half court' : 'half court';
  return p.x < 18 ? 'the left side' : p.x > 32 ? 'the right side' : 'the middle';
}
