// __tests__/consistency.test.ts
import { describe, it, expect } from 'vitest';
import {
  spreadOf,
  driftPerShot,
  sessionConsistency,
  notableGaps,
  MIN_SHOTS_FOR_SPREAD,
  MIN_PER_OUTCOME,
  NOTABLE_GAP_SDS,
  type MechanicsSample,
} from '@/lib/video/consistency';
import type { ShotMechanics } from '@/lib/video/mechanics';

const base: ShotMechanics = {
  dipFrame: 0,
  setPointFrame: 3,
  releaseFrame: 6,
  landingFrame: 10,
  kneeBendDeg: 140,
  elbowAngleAtSetPointDeg: 90,
  releaseAngleDeg: 52,
  releaseTimeMs: 400,
  jumpHeightCm: null,
  landingBalancePct: null,
};

/** A session of shots, each overriding whichever measures the test cares about. */
function session(shots: Array<{ made: boolean } & Partial<ShotMechanics>>): MechanicsSample[] {
  return shots.map((s, index) => {
    const { made, ...overrides } = s;
    return { index, made, mechanics: { ...base, ...overrides } };
  });
}

describe('spreadOf', () => {
  it('measures the middle and the edges', () => {
    const s = spreadOf([50, 52, 54, 56])!;
    expect(s.mean).toBeCloseTo(53);
    expect(s.min).toBe(50);
    expect(s.max).toBe(56);
    expect(s.range).toBe(6);
    expect(s.sd).toBeCloseTo(2.236, 2);
  });

  it('reports no spread for a perfectly repeated stroke', () => {
    const s = spreadOf([52, 52, 52])!;
    expect(s.range).toBe(0);
    expect(s.sd).toBe(0);
  });

  it('has nothing to say about nothing', () => {
    expect(spreadOf([])).toBeNull();
  });
});

describe('driftPerShot', () => {
  it('finds a release time creeping later through the session', () => {
    const samples = Array.from({ length: 10 }, (_, index) => ({ index, value: 400 + index * 5 }));
    expect(driftPerShot(samples)).toBeCloseTo(5);
  });

  it('finds no trend in a steady stroke', () => {
    const samples = Array.from({ length: 10 }, (_, index) => ({ index, value: 400 }));
    expect(driftPerShot(samples)).toBeCloseTo(0);
  });

  it('refuses a trend from too few shots', () => {
    const samples = Array.from({ length: MIN_SHOTS_FOR_SPREAD - 1 }, (_, index) => ({ index, value: index }));
    expect(driftPerShot(samples)).toBeNull();
  });

  it('refuses a trend when every shot sits at the same index', () => {
    expect(driftPerShot(Array.from({ length: 6 }, () => ({ index: 2, value: 10 })))).toBeNull();
  });
});

describe('sessionConsistency', () => {
  it('says nothing about a handful of shots', () => {
    // A range off three shots is mostly whichever three were measured, and a 13
    // year old told their stroke is inconsistent on that is being misled.
    const result = sessionConsistency(session([{ made: true }, { made: false }, { made: true }]));
    expect(result.shots).toBe(3);
    expect(result.spreads).toBeNull();
    expect(result.drift).toBeNull();
    expect(result.outcomeGaps).toBeNull();
  });

  it('measures the spread of each stroke once there are enough shots', () => {
    const result = sessionConsistency(
      session([
        { made: true, releaseAngleDeg: 48 },
        { made: true, releaseAngleDeg: 50 },
        { made: false, releaseAngleDeg: 52 },
        { made: true, releaseAngleDeg: 54 },
        { made: false, releaseAngleDeg: 62 },
      ])
    );
    expect(result.spreads?.releaseAngleDeg?.range).toBe(14);
    expect(result.spreads?.releaseAngleDeg?.mean).toBeCloseTo(53.2);
    // A measure left at its default across every shot has no spread
    expect(result.spreads?.kneeBendDeg?.range).toBe(0);
  });

  it('holds back the make-versus-miss comparison until both have enough shots', () => {
    const lopsided = session([
      ...Array.from({ length: 8 }, () => ({ made: true })),
      ...Array.from({ length: MIN_PER_OUTCOME - 1 }, () => ({ made: false })),
    ]);
    expect(sessionConsistency(lopsided).outcomeGaps).toBeNull();
  });

  it('reports what differed between makes and misses, biggest first', () => {
    const result = sessionConsistency(
      session([
        // Makes: released around 54 degrees, misses: around 46
        ...Array.from({ length: 4 }, () => ({ made: true, releaseAngleDeg: 54 })),
        ...Array.from({ length: 4 }, () => ({ made: false, releaseAngleDeg: 46 })),
      ])
    );
    const top = result.outcomeGaps![0];
    expect(top.measure).toBe('releaseAngleDeg');
    expect(top.madeMean).toBeCloseTo(54);
    expect(top.missedMean).toBeCloseTo(46);
    expect(top.gap).toBeCloseTo(8);
  });
});

describe('notableGaps', () => {
  it('drops a difference too small to tell from noise', () => {
    // Release angle wanders over 15 degrees and makes differ from misses by one.
    // Reporting that as a cue makes a player change something that was fine.
    const result = sessionConsistency(
      session([
        { made: true, releaseAngleDeg: 60 },
        { made: true, releaseAngleDeg: 45 },
        { made: true, releaseAngleDeg: 52 },
        { made: true, releaseAngleDeg: 54 },
        { made: false, releaseAngleDeg: 59 },
        { made: false, releaseAngleDeg: 46 },
        { made: false, releaseAngleDeg: 51 },
        { made: false, releaseAngleDeg: 53 },
      ])
    );
    const angle = result.outcomeGaps!.find((g) => g.measure === 'releaseAngleDeg')!;
    expect(Math.abs(angle.gapInSds)).toBeLessThan(NOTABLE_GAP_SDS);
    expect(notableGaps(result.outcomeGaps).some((g) => g.measure === 'releaseAngleDeg')).toBe(false);
  });

  it('keeps a difference that stands out against a repeatable stroke', () => {
    const result = sessionConsistency(
      session([
        ...Array.from({ length: 4 }, () => ({ made: true, releaseAngleDeg: 53 })),
        ...Array.from({ length: 4 }, () => ({ made: false, releaseAngleDeg: 44 })),
      ])
    );
    expect(notableGaps(result.outcomeGaps).map((g) => g.measure)).toContain('releaseAngleDeg');
  });

  it('has nothing to report when there was no comparison', () => {
    expect(notableGaps(null)).toEqual([]);
  });
});
