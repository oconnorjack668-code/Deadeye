// __tests__/rimMemory.test.ts
import { describe, it, expect } from 'vitest';
import {
  isUsableRim,
  parseSavedRims,
  withSavedRim,
  touchSavedRim,
  withoutSavedRim,
  MAX_SAVED_RIMS,
  MAX_RIM_NAME,
  type SavedRim,
} from '@/lib/video/rimMemory';
import { MAX_RIM_TILT, MAX_RIM_WIDTH, MIN_RIM_WIDTH } from '@/lib/video/shotDetector';

const RIM = { x: 0.5, y: 0.3, width: 0.06, tilt: -0.1 };

const saved = (name: string, usedAt: number): SavedRim => ({
  id: `id-${name}`,
  name,
  rim: RIM,
  usedAt,
});

describe('isUsableRim', () => {
  it('accepts a measured rim, with or without a tilt', () => {
    expect(isUsableRim(RIM)).toBe(true);
    expect(isUsableRim({ x: 0.5, y: 0.3, width: 0.06 })).toBe(true);
  });

  it('rejects anything that could not have come from two taps on a frame', () => {
    expect(isUsableRim(null)).toBe(false);
    expect(isUsableRim('rim')).toBe(false);
    expect(isUsableRim({ x: 0.5, y: 0.3 })).toBe(false);
    expect(isUsableRim({ x: 1.4, y: 0.3, width: 0.06 })).toBe(false);
    expect(isUsableRim({ x: 0.5, y: -0.2, width: 0.06 })).toBe(false);
    expect(isUsableRim({ x: 0.5, y: 0.3, width: MIN_RIM_WIDTH / 2 })).toBe(false);
    expect(isUsableRim({ x: 0.5, y: 0.3, width: MAX_RIM_WIDTH + 0.1 })).toBe(false);
    expect(isUsableRim({ x: 0.5, y: 0.3, width: 0.06, tilt: MAX_RIM_TILT + 0.5 })).toBe(false);
  });

  it('rejects numbers that are not numbers', () => {
    expect(isUsableRim({ x: NaN, y: 0.3, width: 0.06 })).toBe(false);
    expect(isUsableRim({ x: Infinity, y: 0.3, width: 0.06 })).toBe(false);
    expect(isUsableRim({ x: '0.5', y: 0.3, width: 0.06 })).toBe(false);
  });
});

describe('parseSavedRims', () => {
  it('reads back what was stored, most recent first', () => {
    const raw = JSON.stringify([saved('Gym', 100), saved('Driveway', 500)]);
    expect(parseSavedRims(raw).map((s) => s.name)).toEqual(['Driveway', 'Gym']);
  });

  it('survives everything localStorage can hand back', () => {
    expect(parseSavedRims(null)).toEqual([]);
    expect(parseSavedRims('')).toEqual([]);
    expect(parseSavedRims('not json')).toEqual([]);
    expect(parseSavedRims('{"not":"an array"}')).toEqual([]);
  });

  it('drops entries that are broken rather than failing the whole list', () => {
    const raw = JSON.stringify([saved('Good', 100), { id: 'x', name: 'Bad', rim: { x: 9 }, usedAt: 1 }, 42]);
    expect(parseSavedRims(raw).map((s) => s.name)).toEqual(['Good']);
  });
});

describe('withSavedRim', () => {
  it('adds a rim and puts it first', () => {
    const list = withSavedRim([saved('Gym', 100)], 'Driveway', RIM, 200);
    expect(list.map((s) => s.name)).toEqual(['Driveway', 'Gym']);
  });

  it('overwrites a name instead of keeping two of the same hoop', () => {
    // Re-measuring a hoop means the old measurement is wrong, not that there
    // are now two of it.
    const moved = { ...RIM, x: 0.42 };
    const list = withSavedRim([saved('Driveway', 100)], 'driveway', moved, 200);
    expect(list).toHaveLength(1);
    expect(list[0].rim.x).toBeCloseTo(0.42);
    // and keeps the original id, so anything pointing at it still resolves
    expect(list[0].id).toBe('id-Driveway');
  });

  it('tidies the name and refuses an empty one', () => {
    expect(withSavedRim([], '  School   Gym  ', RIM, 1)[0].name).toBe('School Gym');
    expect(withSavedRim([], 'x'.repeat(100), RIM, 1)[0].name).toHaveLength(MAX_RIM_NAME);
    expect(withSavedRim([], '   ', RIM, 1)).toEqual([]);
  });

  it('keeps the list from growing without limit', () => {
    let list: SavedRim[] = [];
    for (let i = 0; i < MAX_SAVED_RIMS + 3; i++) list = withSavedRim(list, `Hoop ${i}`, RIM, i);
    expect(list).toHaveLength(MAX_SAVED_RIMS);
    // The oldest fell off, the newest is first
    expect(list[0].name).toBe(`Hoop ${MAX_SAVED_RIMS + 2}`);
    expect(list.some((s) => s.name === 'Hoop 0')).toBe(false);
  });
});

describe('touchSavedRim and withoutSavedRim', () => {
  it('brings the rim just used to the front', () => {
    const list = touchSavedRim([saved('Gym', 500), saved('Driveway', 100)], 'id-Driveway', 900);
    expect(list.map((s) => s.name)).toEqual(['Driveway', 'Gym']);
  });

  it('leaves the list alone when the id is unknown', () => {
    const before = [saved('Gym', 500)];
    expect(touchSavedRim(before, 'missing', 900)).toEqual(before);
  });

  it('removes one by id', () => {
    expect(withoutSavedRim([saved('Gym', 1), saved('Driveway', 2)], 'id-Gym').map((s) => s.name)).toEqual(['Driveway']);
  });
});
