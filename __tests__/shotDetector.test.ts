// __tests__/shotDetector.test.ts
import { describe, it, expect } from 'vitest';
import {
  ShotDetector,
  rimFromEdges,
  rimYAt,
  MIN_RIM_WIDTH,
  MAX_RIM_WIDTH,
  MAX_RIM_TILT,
  type BallObservation,
} from '@/lib/video/shotDetector';

const RIM = { x: 0.5, y: 0.3, width: 0.06 };

/** A parabolic shot from the shooter's hands to a landing x at rim height, sampled at 30 fps. */
function arc(startT: number, fromX: number, toX: number, peakY = 0.1, frames = 30): BallObservation[] {
  const out: BallObservation[] = [];
  const startY = 0.6;
  for (let i = 0; i <= frames + 6; i++) {
    const p = i / frames; // 0 -> release, 1 -> reaches rim height
    const x = fromX + (toX - fromX) * p;
    // Rise to peakY at p = 0.6, come back down to rim height at p = 1, keep falling after
    const y = p <= 0.6 ? startY - (startY - peakY) * (p / 0.6) ** 0.8 : peakY + (RIM.y - peakY) * ((p - 0.6) / 0.4) ** 1.6;
    out.push({ t: startT + i * 33, ball: { x, y } });
  }
  return out;
}

function run(observations: BallObservation[]) {
  const d = new ShotDetector(RIM);
  for (const o of observations) d.push(o);
  return d.shots;
}

describe('rimFromEdges', () => {
  it('centres the rim between the two taps and measures its width', () => {
    const rim = rimFromEdges({ x: 0.4, y: 0.3 }, { x: 0.5, y: 0.3 });
    expect(rim.x).toBeCloseTo(0.45);
    expect(rim.y).toBeCloseTo(0.3);
    expect(rim.width).toBeCloseTo(0.1);
  });

  it('does not care which side is tapped first', () => {
    const a = rimFromEdges({ x: 0.4, y: 0.3 }, { x: 0.5, y: 0.3 });
    const b = rimFromEdges({ x: 0.5, y: 0.3 }, { x: 0.4, y: 0.3 });
    expect(a).toEqual(b);
  });

  it('handles a hoop at the very edge of frame, which the old framing box forbade', () => {
    const rim = rimFromEdges({ x: 0.0, y: 0.22 }, { x: 0.06, y: 0.24 });
    expect(rim.x).toBeCloseTo(0.03);
    expect(rim.width).toBeCloseTo(0.06);
  });

  it('gives a narrow rim for a side-on view, which is the correct target there', () => {
    // Seen from the side the rim foreshortens to a sliver; the ball genuinely
    // passes through a narrower gap on screen.
    const sideOn = rimFromEdges({ x: 0.70, y: 0.30 }, { x: 0.73, y: 0.31 });
    const faceOn = rimFromEdges({ x: 0.44, y: 0.30 }, { x: 0.56, y: 0.30 });
    expect(sideOn.width).toBeLessThan(faceOn.width);
  });

  it('clamps a double-tap in one spot to a usable width', () => {
    const rim = rimFromEdges({ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.3 });
    expect(rim.width).toBe(MIN_RIM_WIDTH);
    expect(rim.width).toBeGreaterThan(0);
  });

  it('clamps an absurdly wide pair of taps', () => {
    const rim = rimFromEdges({ x: 0, y: 0.3 }, { x: 1, y: 0.3 });
    expect(rim.width).toBe(MAX_RIM_WIDTH);
  });

  it('captures the tilt between two taps at different heights', () => {
    const rim = rimFromEdges({ x: 0.4, y: 0.34 }, { x: 0.6, y: 0.26 });
    expect(rim.tilt).toBeCloseTo(-0.4);
    // The line passes through both taps, which is the whole point of storing it
    expect(rimYAt(rim, 0.4)).toBeCloseTo(0.34);
    expect(rimYAt(rim, 0.6)).toBeCloseTo(0.26);
    // and still through the centre at the averaged height
    expect(rimYAt(rim, 0.5)).toBeCloseTo(0.3);
  });

  it('reads the same tilt whichever side is tapped first', () => {
    const a = rimFromEdges({ x: 0.4, y: 0.34 }, { x: 0.6, y: 0.26 });
    const b = rimFromEdges({ x: 0.6, y: 0.26 }, { x: 0.4, y: 0.34 });
    expect(a.tilt).toBeCloseTo(b.tilt!);
  });

  it('treats a level rim as having no tilt', () => {
    expect(rimFromEdges({ x: 0.44, y: 0.3 }, { x: 0.56, y: 0.3 }).tilt).toBe(0);
  });

  it('clamps a wild tilt rather than trusting it', () => {
    // One tap on the ring, one up on the backboard: far likelier than a rim at
    // this angle, and an over-tilted line is worse than a level one.
    const rim = rimFromEdges({ x: 0.48, y: 0.5 }, { x: 0.52, y: 0.1 });
    expect(rim.tilt).toBe(-MAX_RIM_TILT);
  });

  it('gives no tilt for two taps in a vertical line, rather than an infinite one', () => {
    const rim = rimFromEdges({ x: 0.5, y: 0.26 }, { x: 0.5, y: 0.34 });
    expect(rim.tilt).toBe(0);
    expect(Number.isFinite(rimYAt(rim, 0.7))).toBe(true);
  });

  it('produces a rim the detector can score a make with', () => {
    const rim = rimFromEdges({ x: 0.47, y: 0.3 }, { x: 0.53, y: 0.3 });
    const d = new ShotDetector(rim);
    // Straight down through the middle of the measured rim
    for (let i = 0; i <= 20; i++) {
      d.push({ t: i * 33, ball: { x: 0.5, y: 0.1 + i * 0.015 } });
    }
    expect(d.shots).toHaveLength(1);
    expect(d.shots[0].made).toBe(true);
  });
});

describe('ShotDetector', () => {
  it('counts a ball dropping through the rim as a make', () => {
    const shots = run(arc(0, 0.2, 0.5));
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(true);
    expect(shots[0].confident).toBe(true);
  });

  it('counts a ball coming down beside the rim as a miss', () => {
    const shots = run(arc(0, 0.2, 0.58));
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(false);
  });

  it('counts an airball that never reaches the rim area as a miss', () => {
    const shots = run(arc(0, 0.2, 0.44, 0.2, 30).map((o) => (o.t > 700 ? { ...o, ball: null } : o)).concat([{ t: 3000, ball: null }]));
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(false);
    expect(shots[0].confident).toBe(false);
  });

  it('counts several shots in a row and ignores rim bounces right after a decision', () => {
    const first = arc(0, 0.2, 0.5);
    const bounce: BallObservation[] = [
      { t: 1300, ball: { x: 0.52, y: 0.25 } },
      { t: 1333, ball: { x: 0.52, y: 0.32 } },
    ];
    const second = arc(4000, 0.8, 0.58);
    const third = arc(8000, 0.3, 0.49);
    const shots = run([...first, ...bounce, ...second, ...third]);
    expect(shots.map((s) => s.made)).toEqual([true, false, true]);
  });

  // The net, the backboard and motion blur all hide the ball at exactly the
  // moment a shot goes in, so these two cases decide how the tracker behaves on
  // real footage more than the clean arcs above do.
  describe('when the ball is lost at the rim', () => {
    /** A make whose last sighting is just above the rim, then nothing. */
    function occludedMake(reappearAfterMs: number | null): BallObservation[] {
      const flight = arc(0, 0.2, 0.5).filter((o) => (o.ball?.y ?? 1) < RIM.y - 0.01);
      const lastT = flight[flight.length - 1].t;
      const blank: BallObservation[] = Array.from({ length: 60 }, (_, i) => ({ t: lastT + (i + 1) * 33, ball: null }));
      if (reappearAfterMs === null) return [...flight, ...blank];
      const reappearAt = lastT + reappearAfterMs;
      return [
        ...flight,
        ...blank.filter((o) => o.t < reappearAt),
        // Ball drops out of the bottom of the net, straight under the rim
        { t: reappearAt, ball: { x: 0.5, y: RIM.y + 0.05 } },
        { t: reappearAt + 33, ball: { x: 0.5, y: RIM.y + 0.12 } },
      ];
    }

    it('still calls a make when the ball reappears below the rim', () => {
      const shots = run(occludedMake(200));
      expect(shots).toHaveLength(1);
      expect(shots[0].made).toBe(true);
    });

    it('calls a miss when the ball never reappears, even though it went in', () => {
      // Documents a known false-miss: a swish that hides the ball for longer
      // than LOST_BALL_MS is scored as a miss. The player can correct it in the
      // review step, which is why shots are confirmed rather than auto-saved.
      const shots = run(occludedMake(null));
      expect(shots).toHaveLength(1);
      expect(shots[0].made).toBe(false);
      expect(shots[0].confident).toBe(false);
    });
  });

  // The case that justifies storing a tilt at all. Filmed from the side the rim
  // is not horizontal on screen, and a ball on a flat trajectory crosses a long
  // way along it, so testing the crossing at one averaged height lands the
  // crossing point far from where it really is.
  describe('on a tilted rim', () => {
    /** Ball entering from the left, descending slowly while moving right fast. */
    const flatTrajectory: BallObservation[] = Array.from({ length: 16 }, (_, i) => {
      const x = 0.3 + i * 0.04;
      return { t: i * 33, ball: { x, y: 0.2 + 0.2 * (x - 0.3) } };
    });

    const tilted = rimFromEdges({ x: 0.4, y: 0.34 }, { x: 0.6, y: 0.26 });
    const level = { x: 0.5, y: 0.3, width: 0.2 };

    it('scores a make that the level model placed outside the rim', () => {
      const d = new ShotDetector(tilted);
      for (const o of flatTrajectory) d.push(o);
      expect(d.shots).toHaveLength(1);
      expect(d.shots[0].made).toBe(true);
    });

    it('and the same ball against a level rim of the same span calls it a miss', () => {
      // Not a bug being pinned - this is the old behaviour, kept here to show
      // the tilt is what changes the verdict rather than some other edit.
      const d = new ShotDetector(level);
      for (const o of flatTrajectory) d.push(o);
      expect(d.shots).toHaveLength(1);
      expect(d.shots[0].made).toBe(false);
    });
  });

  it('ignores the ball when it is nowhere near the hoop (dribbling, passing)', () => {
    const dribbling: BallObservation[] = Array.from({ length: 90 }, (_, i) => ({
      t: i * 33,
      ball: { x: 0.1 + (i % 10) * 0.01, y: 0.7 + (i % 2) * 0.1 },
    }));
    expect(run(dribbling)).toHaveLength(0);
  });
});
