// __tests__/shotDetector.test.ts
import { describe, it, expect } from 'vitest';
import {
  ShotDetector,
  rimFromEdges,
  rimTapProblem,
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

describe('rimTapProblem', () => {
  it('accepts a normal pair of taps across the ring', () => {
    expect(rimTapProblem({ x: 0.44, y: 0.3 }, { x: 0.56, y: 0.3 })).toBeNull();
  });

  it('still accepts a side-on rim, which is genuinely narrow', () => {
    // The same pair the width test above calls correct: foreshortened is not
    // mis-tapped, and rejecting it would block the footage two taps exist for.
    expect(rimTapProblem({ x: 0.7, y: 0.3 }, { x: 0.73, y: 0.31 })).toBeNull();
  });

  it('accepts a steeply angled rim short of the tilt clamp', () => {
    expect(rimTapProblem({ x: 0.4, y: 0.25 }, { x: 0.6, y: 0.35 })).toBeNull();
  });

  it('rejects taps on the front and back of the ring', () => {
    // Almost no horizontal gap: the short axis of the ellipse, not the long one
    expect(rimTapProblem({ x: 0.5, y: 0.28 }, { x: 0.505, y: 0.33 })).toMatch(/widest points/);
  });

  it('rejects a double tap in one spot', () => {
    expect(rimTapProblem({ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.3 })).toMatch(/widest points/);
  });

  it('rejects one tap on the ring and one on the backboard', () => {
    expect(rimTapProblem({ x: 0.46, y: 0.4 }, { x: 0.54, y: 0.1 })).toMatch(/backboard/);
  });

  it('rejects exactly the pairs rimFromEdges would have had to clamp', () => {
    // The two functions agree by construction, so a measurement that survives
    // the check is one that was measured rather than invented.
    const pairs: Array<[{ x: number; y: number }, { x: number; y: number }]> = [
      [{ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.3 }],
      [{ x: 0.5, y: 0.28 }, { x: 0.505, y: 0.33 }],
      [{ x: 0.46, y: 0.4 }, { x: 0.54, y: 0.1 }],
      [{ x: 0.44, y: 0.3 }, { x: 0.56, y: 0.3 }],
      [{ x: 0.7, y: 0.3 }, { x: 0.73, y: 0.31 }],
    ];
    for (const [a, b] of pairs) {
      const rim = rimFromEdges(a, b);
      const clamped =
        rim.width !== Math.abs(b.x - a.x) || Math.abs(rim.tilt!) === MAX_RIM_TILT;
      expect(rimTapProblem(a, b) !== null).toBe(clamped);
    }
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

  it('drops a shot whose ball is lost before it reaches the ring', () => {
    // Decided 9 Nov 2026: a shot that never reached the ring is not called.
    // Passes, balls going up beside the ring and people at the lens look like
    // this, and were 17 of the 24 calls with no shot on the bench; the cost
    // was 2 real misses on the smallest, dimmest, slowest test footage, where
    // the ball is lost before the ring. See README, "The bench suite".
    const shots = run(arc(0, 0.2, 0.44, 0.2, 30).map((o) => (o.t > 700 ? { ...o, ball: null } : o)).concat([{ t: 3000, ball: null }]));
    expect(shots).toHaveLength(0);
  });

  it('still calls a miss on a ball that came down beside the ring and was lost there', () => {
    const shots = run(arc(0, 0.2, 0.545, 0.2, 30).map((o) => (o.t > 950 ? { ...o, ball: null } : o)).concat([{ t: 4000, ball: null }]));
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(false);
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

    /**
     * The flat approach up to the rim line, then straight down out of the net,
     * as a made ball goes. A make is confirmed by where the ball goes after
     * the rim, so a ball that kept sliding sideways under it would be read as
     * rolling off the side.
     */
    function throughTheNet(rim: typeof tilted): BallObservation[] {
      const out: BallObservation[] = [];
      for (const o of flatTrajectory) {
        out.push(o);
        if (o.ball && o.ball.y > rimYAt(rim, o.ball.x)) {
          for (let k = 1; k <= 3; k++) out.push({ t: o.t + k * 33, ball: { x: o.ball.x, y: o.ball.y + k * 0.05 } });
          break;
        }
      }
      return out;
    }

    it('scores a make that the level model placed outside the rim', () => {
      const d = new ShotDetector(tilted);
      for (const o of throughTheNet(tilted)) d.push(o);
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

  // The hoop crop necessarily contains whoever is under the basket. On the
  // measured clip a friend was passing the ball back after every shot, so
  // there was a second moving, ball-sized thing below the rim for most of the
  // session - and the detector paired the real ball above the rim with that
  // below it, deciding a made shot was a miss through a point the ball never
  // went near. No make threshold could have caught it: that bogus crossing
  // landed at 2.85 half-rims, between genuine misses at 2.87 and 3.43.
  it('will not pair the ball with something else that appears below the rim', () => {
    const d = new ShotDetector(RIM);
    // Ball descending towards the hoop, still above it
    d.push({ t: 0, ball: { x: 0.42, y: 0.20 } });
    d.push({ t: 33, ball: { x: 0.44, y: 0.24 } });
    // Next frame, a rebounder's head appears below the rim and far to the
    // right. No ball covers that ground in 33ms.
    expect(d.push({ t: 66, ball: { x: 0.80, y: 0.42 } })).toBeNull();
    expect(d.shots).toHaveLength(0);

    // The real ball arrives and is still judged on its own merits, once it is
    // seen under the ring (the frame that crosses the line is not evidence of
    // that on its own)
    d.push({ t: 99, ball: { x: 0.46, y: 0.28 } });
    expect(d.push({ t: 132, ball: { x: 0.48, y: 0.32 } })).toBeNull();
    const shot = d.push({ t: 165, ball: { x: 0.49, y: 0.36 } });
    expect(shot?.made).toBe(true);
  });

  it('does not take the frame that crosses the line as the ball under the ring', () => {
    // The 4 Nov clip4 rattle-out (88.1s): a ball landing on the ring was seen
    // a quarter of a rim above the line, then a quarter below on the next
    // frame, and was lost while it bounced. The net shook from the hit on
    // every frame. It was next seen 0.8s later dropping beside the ring.
    const d = new ShotDetector(RIM);
    const net = 0.1;
    d.push({ t: 0, ball: { x: 0.5, y: 0.2 }, net: 0 });
    d.push({ t: 33, ball: { x: 0.5, y: 0.23 }, net: 0 });
    d.push({ t: 66, ball: { x: 0.5, y: 0.26 }, net: 0 });
    d.push({ t: 99, ball: { x: 0.5, y: 0.285 }, net: 0 });
    d.push({ t: 132, ball: { x: 0.5, y: 0.315 }, net });
    for (let t = 165; t < 930; t += 33) d.push({ t, ball: null, net });
    d.push({ t: 930, ball: { x: 0.545, y: 0.31 }, net: 0.06 });
    d.push({ t: 963, ball: { x: 0.545, y: 0.33 }, net: 0.06 });
    d.push({ t: 996, ball: { x: 0.545, y: 0.36 }, net: 0.06 });
    expect(d.shots).toHaveLength(1);
    expect(d.shots[0].made).toBe(false);
  });

  it('still takes a crossing frame a ball-width under the line as through the ring', () => {
    // The 15 fps make on the 2:39 clip (53.8s): crossed dead centre, first
    // seen 0.499 rims below the line, then pushed sideways out of the net. The
    // first three sightings under the ring decide; without the crossing frame
    // two of them were beside the ring and it was called a miss.
    const d = new ShotDetector(RIM);
    const at = (t: number, y: number, side: number, net = 0) => d.push({ t, ball: { x: 0.5 + (side * RIM.width) / 2, y }, net });
    at(0, 0.2, 2.2);
    at(67, 0.25, 1.9);
    at(133, 0.285, 0.42);
    at(200, 0.32994, -0.79, 0.17);
    at(267, 0.355, -1.23, 0.28);
    at(333, 0.364, -1.9, 0.05);
    at(400, 0.388, -2.55, 0.05);
    for (let t = 467; t <= 1500; t += 67) d.push({ t, ball: null, net: 0.12 });
    expect(d.shots).toHaveLength(1);
    expect(d.shots[0].made).toBe(true);
  });

  it('still accepts a ball that genuinely covered the ground', () => {
    // The guard must not reject a real descent, which would trade one error
    // for another. This is the same speed a shot actually falls at.
    const d = new ShotDetector(RIM);
    d.push({ t: 0, ball: { x: 0.46, y: 0.22 } });
    d.push({ t: 33, ball: { x: 0.48, y: 0.26 } });
    d.push({ t: 66, ball: { x: 0.50, y: 0.30 } });
    // Called once it is seen under the ring, not on the frame it reaches it
    d.push({ t: 99, ball: { x: 0.50, y: 0.34 } });
    expect(d.shots).toHaveLength(1);
    expect(d.shots[0].made).toBe(true);
  });

  it('reports how far from centre the ball crossed', () => {
    const d = new ShotDetector(RIM);
    d.push({ t: 0, ball: { x: 0.5, y: 0.1 } });
    for (let i = 1; i <= 12; i++) d.push({ t: i * 33, ball: { x: 0.5, y: 0.1 + i * 0.02 } });
    const shot = d.shots[0];
    // Straight down the middle, so barely off centre at all
    expect(shot.crossMargin).toBeLessThan(0.2);
  });

  it('keeps which side a miss crossed on, and does not say the rim was hit when it was not', () => {
    // Comes down well to the left of the ring: half-rim is 0.03, so 0.44 is 2 half-rims left
    const left = new ShotDetector(RIM);
    left.push({ t: 0, ball: { x: 0.44, y: 0.1 } });
    for (let i = 1; i <= 12; i++) left.push({ t: i * 33, ball: { x: 0.44, y: 0.1 + i * 0.02 } });
    expect(left.shots[0].made).toBe(false);
    expect(left.shots[0].crossSide).toBeCloseTo(-2, 1);
    expect(left.shots[0].touchedRim).toBeUndefined();

    const right = new ShotDetector(RIM);
    right.push({ t: 0, ball: { x: 0.56, y: 0.1 } });
    for (let i = 1; i <= 12; i++) right.push({ t: i * 33, ball: { x: 0.56, y: 0.1 + i * 0.02 } });
    expect(right.shots[0].crossSide).toBeCloseTo(2, 1);
    expect(right.shots[0].crossMargin).toBeCloseTo(Math.abs(right.shots[0].crossSide!), 6);
  });

  it('ignores the ball when it is nowhere near the hoop (dribbling, passing)', () => {
    const dribbling: BallObservation[] = Array.from({ length: 90 }, (_, i) => ({
      t: i * 33,
      ball: { x: 0.1 + (i % 10) * 0.01, y: 0.7 + (i % 2) * 0.1 },
    }));
    expect(run(dribbling)).toHaveLength(0);
  });
});

// What happens after the ball reaches the ring decides the call. Measured on a
// 2:39 clip filmed side-on with 31 hand-labelled attempts, deciding on the
// frame the ball reached the rim line called six rim-outs makes, and four balls
// that fell past the front of the ring were dead centre on screen.
describe('ShotDetector after the rim', () => {
  /** Down from the upper right to just above the ring's centre, 30 fps. */
  function approach(): BallObservation[] {
    return Array.from({ length: 6 }, (_, i) => ({ t: i * 33, ball: { x: 0.62 - 0.02 * i, y: 0.12 + 0.03 * i } }));
  }
  const after = (from: number, balls: Array<{ x: number; y: number } | null>, net: number): BallObservation[] =>
    balls.map((ball, i) => ({ t: from + (i + 1) * 33, ball, net }));
  const quiet = (from: number, frames: number, net = 0) => after(from, Array(frames).fill(null), net);
  const run = (obs: BallObservation[]) => {
    const d = new ShotDetector(RIM);
    for (const o of obs) d.push(o);
    return d.shots;
  };

  it('calls a make when the ball drops under the ring and the net moves', () => {
    const shots = run([
      ...approach(),
      ...after(165, [{ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.32 }, { x: 0.5, y: 0.34 }, { x: 0.5, y: 0.36 }], 0.2),
      ...quiet(297, 20, 0.2),
    ]);
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(true);
  });

  it('calls a miss when a ball through the middle of the ring on screen leaves the net still', () => {
    // It fell past the front of the ring: the same picture as a make, except
    // that nothing dragged the net
    const shots = run([
      ...approach(),
      ...after(165, [{ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.32 }, { x: 0.5, y: 0.34 }, { x: 0.5, y: 0.36 }], 0),
      ...quiet(297, 20, 0),
    ]);
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(false);
    expect(shots[0].crossMargin).toBeLessThan(0.5);
  });

  it('calls a miss for a ball that reaches the ring and bounces away, at the time it hit', () => {
    const shots = run([
      ...approach(),
      // On the ring, then up and away to the right at the speed a ball comes
      // off it, shaking the net as it goes
      ...after(165, [{ x: 0.52, y: 0.297 }, { x: 0.535, y: 0.285 }, { x: 0.55, y: 0.27 }, { x: 0.565, y: 0.255 }, { x: 0.58, y: 0.24 }, { x: 0.6, y: 0.23 }, { x: 0.62, y: 0.22 }, { x: 0.64, y: 0.21 }, { x: 0.66, y: 0.2 }, { x: 0.68, y: 0.19 }, { x: 0.7, y: 0.18 }], 0.15),
      ...quiet(528, 30, 0),
    ]);
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(false);
    expect(shots[0].confident).toBe(true);
    expect(shots[0].t).toBeLessThan(400);
  });

  it('calls a make for a ball that bounces up off the ring and drops back through', () => {
    const shots = run([
      ...approach(),
      ...after(165, [{ x: 0.51, y: 0.29 }, { x: 0.5, y: 0.26 }, { x: 0.5, y: 0.24 }, { x: 0.5, y: 0.26 }, { x: 0.5, y: 0.29 }], 0.1),
      ...after(330, [{ x: 0.5, y: 0.31 }, { x: 0.5, y: 0.33 }, { x: 0.5, y: 0.35 }], 0.25),
      // Judged after the late window, since it came off the ring first
      ...quiet(429, 45, 0.25),
    ]);
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(true);
  });

  it('calls a make the net hid, when the net moved far more than a rim hit moves it', () => {
    // Still swinging well over half a second later, as a net does after a
    // ball has gone through it
    const shots = run([...approach(), ...quiet(165, 45, 0.3)]);
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(true);
    // Still swinging hard well after the ball went in, which a rim hit never does
    expect(shots[0].confident).toBe(true);
  });

  it('calls a miss for a ball that hit the ring and vanished, shaking the net as a rim hit does', () => {
    const shots = run([...approach(), ...quiet(165, 12, 0.12), ...quiet(561, 40, 0)]);
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(false);
  });

  it('does not count something passing in front of the net as the net moving', () => {
    const shots = run([...approach(), ...quiet(165, 12, 0.9), ...quiet(561, 40, 0)]);
    expect(shots.every((s) => !s.made)).toBe(true);
  });

  it('ends a shot that never resolves, even with something above the rim on every frame', () => {
    const d = new ShotDetector(RIM);
    for (const o of approach()) d.push(o);
    // A flicker hopping about beside the backboard, never reaching the ring
    for (let i = 0; i < 150; i++) d.push({ t: 200 + i * 33, ball: { x: 0.44, y: i % 2 ? 0.22 : 0.26 } });
    expect(d.shots).toHaveLength(1);
    expect(d.shots[0].made).toBe(false);
  });
});

// Found by running a player's session through the bench the way the app feeds
// it frames, with the rim tapped eleven slightly different ways.
describe('ShotDetector, cases from a real session', () => {
  function approach(): BallObservation[] {
    return Array.from({ length: 6 }, (_, i) => ({ t: i * 33, ball: { x: 0.62 - 0.02 * i, y: 0.12 + 0.03 * i } }));
  }
  const after = (from: number, balls: Array<{ x: number; y: number } | null>, net: number, under = false): BallObservation[] =>
    balls.map((ball, i) => ({ t: from + (i + 1) * 33, ball, net, under }));
  const quiet = (from: number, frames: number, net = 0) => after(from, Array(frames).fill(null), net);
  const run = (obs: BallObservation[]) => {
    const d = new ShotDetector(RIM);
    for (const o of obs) d.push(o);
    return d.shots;
  };

  it('calls a make that the net pushes off to the side as it drops out', () => {
    // Under the ring twice, then beside it three times on the way out
    const shots = run([
      ...approach(),
      ...after(165, [{ x: 0.5, y: 0.3 }, { x: 0.49, y: 0.32 }, { x: 0.485, y: 0.33 }, { x: 0.45, y: 0.36 }, { x: 0.44, y: 0.37 }, { x: 0.43, y: 0.38 }], 0.2),
      ...quiet(363, 20, 0.2),
    ]);
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(true);
  });

  it('calls a make whose first sighting out of the net is just beside it, when the next ones are under it', () => {
    // How a make reads with the rim tapped a little narrow
    const shots = run([
      ...approach(),
      ...after(165, [{ x: 0.5, y: 0.3 }, { x: 0.548, y: 0.32 }, { x: 0.51, y: 0.33 }, { x: 0.505, y: 0.35 }, { x: 0.5, y: 0.37 }], 0.2),
      ...quiet(330, 20, 0.2),
    ]);
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(true);
  });

  it('counts something ball-like coming out of the bottom of the net as the ball under it', () => {
    const shots = run([...approach(), ...after(165, [null, null, null, null], 0.2, true), ...quiet(297, 20, 0.2)]);
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(true);
  });

  it('calls a make for a ball that hit the ring, vanished, and came back down through the net', () => {
    const shots = run([
      ...approach(),
      // The ring shakes the net, which then settles...
      ...quiet(165, 10, 0.12),
      ...quiet(495, 12, 0),
      // ...and swings again as the ball comes back through, unseen
      ...quiet(891, 30, 0.25),
    ]);
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(true);
  });

  it('does not let one flicker above the rim start a shot that swallows the next one', () => {
    const d = new ShotDetector(RIM);
    // A single glint above the rim, then nothing for a second and a half
    d.push({ t: 0, ball: { x: 0.44, y: 0.2 } });
    for (let t = 33; t < 1500; t += 33) d.push({ t, ball: null, net: 0 });
    // The real shot
    for (const o of approach()) d.push({ ...o, t: o.t + 1500 });
    for (const o of after(1665, [{ x: 0.5, y: 0.3 }, { x: 0.5, y: 0.32 }, { x: 0.5, y: 0.34 }], 0.2)) d.push(o);
    for (const o of quiet(1764, 20, 0.2)) d.push(o);
    expect(d.shots).toHaveLength(1);
    expect(d.shots[0].made).toBe(true);
  });
});

// From the second phone run on the 2:39 session.
describe('ShotDetector, second phone run', () => {
  function approach(): BallObservation[] {
    return Array.from({ length: 6 }, (_, i) => ({ t: i * 33, ball: { x: 0.62 - 0.02 * i, y: 0.12 + 0.03 * i }, id: 1 }));
  }
  const quiet = (from: number, frames: number, net = 0): BallObservation[] =>
    Array.from({ length: frames }, (_, i) => ({ t: from + (i + 1) * 33, ball: null, net }));

  it('judges a ball that shows up under the ring late as a new arrival, on what the net does then', () => {
    // Hit the ring and vanished upwards, shaking the net...
    const shots = (() => {
      const d = new ShotDetector(RIM);
      for (const o of [...approach(), ...quiet(165, 20, 0.1)]) d.push(o);
      // ...then fell past the front of the net 0.7s later, which did not move
      for (const [i, y] of [0.32, 0.34, 0.36, 0.38].entries()) d.push({ t: 1000 + i * 33, ball: { x: 0.5, y }, net: 0, id: 1 });
      for (const o of quiet(1100, 40, 0)) d.push(o);
      return d.shots;
    })();
    expect(shots).toHaveLength(1);
    expect(shots[0].made).toBe(false);
  });

  it('ignores something else followed near the rim moments after the ball was last seen', () => {
    const d = new ShotDetector(RIM);
    for (const o of approach()) d.push(o);
    // The ball drops into the ring; a glare beside the backboard lights up and rises
    d.push({ t: 198, ball: null, net: 0.1 });
    d.push({ t: 231, ball: null, net: 0.2 });
    d.push({ t: 264, ball: { x: 0.44, y: 0.29 }, net: 0.2, id: 7 });
    d.push({ t: 297, ball: { x: 0.44, y: 0.24 }, net: 0.2, id: 7 });
    for (const o of quiet(297, 40, 0.25)) d.push(o);
    expect(d.shots).toHaveLength(1);
    expect(d.shots[0].made).toBe(true);
  });

  it('calls the shot still being judged when the clip ends', () => {
    const d = new ShotDetector(RIM);
    for (const o of [...approach(), ...quiet(165, 8, 0.2)]) d.push(o);
    expect(d.shots).toHaveLength(0);
    const last = d.finish();
    expect(last).not.toBeNull();
    expect(last!.confident).toBe(false);
    expect(d.shots).toHaveLength(1);
  });

  it('has nothing to call at the end when no shot reached the ring', () => {
    const d = new ShotDetector(RIM);
    d.push({ t: 0, ball: { x: 0.1, y: 0.7 } });
    expect(d.finish()).toBeNull();
  });
});
