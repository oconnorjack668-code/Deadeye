// __tests__/formTrend.test.ts
import { describe, it, expect } from 'vitest';
import {
  formTrends,
  isNotable,
  trendSentence,
  MIN_CHECKS,
  type FormCheckRecord,
  type MeasureTrend,
} from '@/lib/video/formTrend';
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

/** Checks on consecutive days, each overriding whatever the test cares about. */
function checks(overrides: Array<Partial<ShotMechanics>>): FormCheckRecord[] {
  return overrides.map((o, i) => ({
    at: `2026-10-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
    mechanics: { ...base, ...o },
  }));
}

const find = (trends: MeasureTrend[], key: string) => trends.find((t) => t.key === key)!;

describe('formTrends', () => {
  it('says nothing from too few checks', () => {
    // Two points make a line out of anything, including a stroke that never moved
    expect(formTrends(checks(Array(MIN_CHECKS - 1).fill({})))).toBeNull();
    expect(formTrends([])).toBeNull();
  });

  it('reads a measure rising across the run', () => {
    const trends = formTrends(
      checks([{ elbowAngleAtSetPointDeg: 84 }, { elbowAngleAtSetPointDeg: 86 }, { elbowAngleAtSetPointDeg: 88 }, { elbowAngleAtSetPointDeg: 90 }])
    )!;
    const elbow = find(trends, 'elbowAngleAtSetPointDeg');
    expect(elbow.first).toBe(84);
    expect(elbow.last).toBe(90);
    expect(elbow.slopePerCheck).toBeCloseTo(2);
  });

  it('puts the checks in date order whatever order they arrive in', () => {
    // Supabase can return these newest-first; a trend read backwards is a lie
    const shuffled = [...checks([{ releaseAngleDeg: 40 }, { releaseAngleDeg: 44 }, { releaseAngleDeg: 48 }, { releaseAngleDeg: 52 }])].reverse();
    const angle = find(formTrends(shuffled)!, 'releaseAngleDeg');
    expect(angle.first).toBe(40);
    expect(angle.last).toBe(52);
    expect(angle.slopePerCheck).toBeGreaterThan(0);
  });

  it('tracks every measure, not just the one that moved', () => {
    const trends = formTrends(checks(Array(4).fill({})))!;
    expect(trends.map((t) => t.key)).toEqual([
      'releaseAngleDeg',
      'elbowAngleAtSetPointDeg',
      'kneeBendDeg',
      'releaseTimeMs',
    ]);
  });
});

describe('isNotable and trendSentence', () => {
  it('ignores drift that is small against the stroke\'s own spread', () => {
    // Release angle wanders over 14 degrees and ends 1 from where it started.
    // Calling that a trend makes a player change something that was fine.
    const noisy = formTrends(
      checks([
        { releaseAngleDeg: 45 },
        { releaseAngleDeg: 59 },
        { releaseAngleDeg: 47 },
        { releaseAngleDeg: 57 },
        { releaseAngleDeg: 46 },
      ])
    )!;
    const angle = find(noisy, 'releaseAngleDeg');
    expect(isNotable(angle)).toBe(false);
    expect(trendSentence(angle)).toBeNull();
  });

  it('reports a move that stands out against a repeatable stroke', () => {
    const drifting = formTrends(
      checks([{ releaseTimeMs: 400 }, { releaseTimeMs: 405 }, { releaseTimeMs: 402 }, { releaseTimeMs: 470 }])
    )!;
    const time = find(drifting, 'releaseTimeMs');
    expect(isNotable(time)).toBe(true);
    expect(trendSentence(time)).toBe('Dip to release is up, 400 ms to 470 ms across 4 checks.');
  });

  it('quotes both ends so the player can check it', () => {
    const trends = formTrends(
      checks([{ kneeBendDeg: 150 }, { kneeBendDeg: 149 }, { kneeBendDeg: 151 }, { kneeBendDeg: 128 }])
    )!;
    const sentence = trendSentence(find(trends, 'kneeBendDeg'))!;
    expect(sentence).toContain('150');
    expect(sentence).toContain('128');
    expect(sentence).toContain('down');
  });

  it('calls nothing notable when the stroke never varied at all', () => {
    const flat = formTrends(checks(Array(5).fill({})))!;
    expect(flat.every((t) => !isNotable(t))).toBe(true);
  });
});
