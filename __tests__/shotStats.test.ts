import { describe, it, expect } from 'vitest';
import { activeMs, halves, makeKinds, missSides, missTendency, streaks, zoneTotals, IDLE_MS } from '@/lib/video/shotStats';
import type { SavedShot } from '@/lib/video/trackedShots';

describe('streaks', () => {
  it('counts the run at the end and the best anywhere', () => {
    expect(streaks([true, true, true, false, true, true])).toEqual({ current: 2, best: 3, coldRun: 0 });
    expect(streaks([true, false, false])).toEqual({ current: 0, best: 1, coldRun: 2 });
    expect(streaks([])).toEqual({ current: 0, best: 0, coldRun: 0 });
  });
});

describe('halves', () => {
  it('needs enough shots to say anything', () => {
    expect(halves(Array.from({ length: 9 }, () => ({ made: true })))).toBeNull();
  });
  it('splits first against second', () => {
    const shots = [...Array.from({ length: 6 }, () => ({ made: true })), ...Array.from({ length: 6 }, (_, i) => ({ made: i < 2 }))];
    expect(halves(shots)).toEqual({ first: { makes: 6, attempts: 6 }, second: { makes: 2, attempts: 6 } });
  });
});

describe('missSides', () => {
  const shots: SavedShot[] = [
    { t: 1, made: false, called: 'miss', side: -1.9 },
    { t: 2, made: false, called: 'miss', side: -2.4 },
    { t: 3, made: false, called: 'miss', side: 0.4 },
    { t: 4, made: false, called: 'miss', side: 1.7 },
    { t: 5, made: false, called: 'miss' },
    // Switched by the player from a make: the crossing said in, so no side
    { t: 6, made: false, called: 'make', side: 0.2 },
    { t: 7, made: true, called: 'make', side: 0.1 },
  ];
  it('sorts misses by where they crossed', () => {
    expect(missSides(shots)).toEqual({ left: 2, right: 1, inLine: 1, unknown: 2 });
  });
  it('names a tendency only when there is one', () => {
    expect(missTendency({ left: 2, right: 1, inLine: 0, unknown: 0 })).toBeNull();
    expect(missTendency({ left: 5, right: 1, inLine: 0, unknown: 0 })).toBe('left');
    expect(missTendency({ left: 3, right: 3, inLine: 0, unknown: 0 })).toBeNull();
  });
});

describe('makeKinds', () => {
  it('counts only makes the tracker called', () => {
    const shots: SavedShot[] = [
      { t: 1, made: true, called: 'make' },
      { t: 2, made: true, called: 'make', rim: true },
      { t: 3, made: true, called: 'miss' },
      { t: 4, made: true, called: null },
    ];
    expect(makeKinds(shots)).toEqual({ clean: 1, rim: 1 });
  });
});

describe('zoneTotals', () => {
  it('groups by zone, with a fallback for shots without one', () => {
    const totals = zoneTotals([{ made: true, zone: 'paint' }, { made: false, zone: 'paint' }, { made: true }], 'free-throw');
    expect(totals).toEqual([
      { zone: 'paint', makes: 1, attempts: 2 },
      { zone: 'free-throw', makes: 1, attempts: 1 },
    ]);
  });
});

describe('activeMs', () => {
  it('cuts long breaks down', () => {
    expect(activeMs([10_000, 20_000], 30_000)).toBe(30_000);
    // A five minute break in the middle counts as IDLE_MS
    expect(activeMs([10_000, 310_000], 320_000)).toBe(10_000 + IDLE_MS + 10_000);
  });
});
