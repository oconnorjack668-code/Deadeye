// @vitest-environment node
// __tests__/plays-motion.test.ts
// The animated court draws whatever sceneAt says, so where players and the
// ball are at a given millisecond is checked here, not by eye.
import { describe, it, expect } from 'vitest';
import { buildDiagram } from '@/lib/plays/build';
import { easeDeadeye, movePath, pointAlong, sceneAt, stepAt, stepStart, stepTimes, totalMs } from '@/lib/plays/animation';

const d = buildDiagram({ positions: { o1: { x: 25, y: 31 }, o2: { x: 45, y: 21 } }, ball: 'o1' }, [
  { moves: [{ type: 'pass', from: 'o1', to: 'o2' }] },
  { moves: [{ type: 'cut', from: 'o1', at: { x: 25, y: 11 }, via: [{ x: 25, y: 21 }] }], ms: 2000 },
  { moves: [{ type: 'dribble', from: 'o2', at: { x: 35, y: 21 } }] },
]);

describe('step timing', () => {
  it('runs the steps back to back, each for its own length', () => {
    expect(stepTimes(d)).toEqual([
      { start: 0, end: 1000 },
      { start: 1000, end: 3000 },
      { start: 3000, end: 4000 },
    ]);
    expect(totalMs(d)).toBe(4000);
    expect(stepStart(d, 2)).toBe(1000);
  });

  it('reports the step being played, and the last step at the end', () => {
    expect(stepAt(d, 0)).toBe(1);
    expect(stepAt(d, 999)).toBe(1);
    expect(stepAt(d, 1000)).toBe(2);
    expect(stepAt(d, 4000)).toBe(3);
    expect(stepAt(d, 99999)).toBe(3);
  });
});

describe('easeDeadeye', () => {
  it('starts at 0, ends at 1 and moves fast early, like cubic-bezier(0.2, 0, 0, 1)', () => {
    expect(easeDeadeye(0)).toBe(0);
    expect(easeDeadeye(1)).toBe(1);
    expect(easeDeadeye(0.5)).toBeGreaterThan(0.8);
    for (let p = 0; p < 1; p += 0.1) expect(easeDeadeye(p + 0.1)).toBeGreaterThanOrEqual(easeDeadeye(p));
  });
});

describe('pointAlong', () => {
  it('measures by distance along the whole path', () => {
    const path = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 30 }];
    expect(pointAlong(path, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAlong(path, 0.25)).toEqual({ x: 10, y: 0 });
    expect(pointAlong(path, 0.5)).toEqual({ x: 10, y: 10 });
    expect(pointAlong(path, 1)).toEqual({ x: 10, y: 30 });
  });

  it('copes with a path that goes nowhere', () => {
    expect(pointAlong([{ x: 3, y: 4 }, { x: 3, y: 4 }], 0.5)).toEqual({ x: 3, y: 4 });
  });
});

describe('sceneAt', () => {
  it('keeps the ball with the passer at first, then flies it to the receiver', () => {
    const start = sceneAt(d, 0, { ease: false });
    expect(start.ballHolder).toBe('o1');
    expect(start.ball).toEqual({ x: 25, y: 31 });
    const midFlight = sceneAt(d, 700, { ease: false });
    expect(midFlight.ballHolder).toBeNull();
    expect(midFlight.ball!.x).toBeGreaterThan(25);
    expect(midFlight.ball!.x).toBeLessThan(45);
    const caught = sceneAt(d, 999.9, { ease: false });
    expect(caught.ball!.x).toBeCloseTo(45, 0);
  });

  it('moves a cutter along their drawn path, waypoints included', () => {
    expect(movePath(d, 2, 'o1')).toEqual([{ x: 25, y: 31 }, { x: 25, y: 21 }, { x: 25, y: 11 }]);
    const half = sceneAt(d, 2000, { ease: false });
    expect(half.step).toBe(2);
    expect(half.positions.o1).toEqual({ x: 25, y: 21 });
    expect(half.positions.o2).toEqual({ x: 45, y: 21 });
    expect(half.ball).toEqual({ x: 45, y: 21 });
  });

  it('carries the ball with a dribbler', () => {
    const s = sceneAt(d, 3500, { ease: false });
    expect(s.positions.o2).toEqual({ x: 40, y: 21 });
    expect(s.ball).toEqual({ x: 40, y: 21 });
    expect(s.ballHolder).toBe('o2');
  });

  it('ends with everyone on their last spots', () => {
    const end = sceneAt(d, totalMs(d));
    expect(end.positions).toEqual(d.frames[3].positions);
    expect(end.progress).toBe(1);
  });

  it('eases by default: further along than steady speed early in a step', () => {
    expect(sceneAt(d, 3300).positions.o2.x).toBeLessThan(sceneAt(d, 3300, { ease: false }).positions.o2.x);
  });
});
