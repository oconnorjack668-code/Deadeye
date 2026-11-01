import { describe, it, expect } from 'vitest';
import { describeMode, drillCue, drillProgress, zoneForShot, FREE } from '@/lib/video/drillModes';

describe('drill modes', () => {
  it('free shooting has no progress', () => {
    expect(drillProgress(FREE, [true], 1000)).toBeNull();
    expect(describeMode(FREE)).toBeNull();
  });

  it('counts makes towards a target', () => {
    const mode = { kind: 'target', makes: 3 } as const;
    expect(drillProgress(mode, [true, false, true], 0)).toMatchObject({ done: false, label: '2 / 3 makes' });
    expect(drillProgress(mode, [true, false, true, true], 0)).toMatchObject({ done: true, fraction: 1 });
    expect(drillCue(mode, [true, false, true, true])).toBe('3 makes. Done.');
    expect(drillCue(mode, [true, false, true, true, true])).toBeNull();
  });

  it('runs a clock', () => {
    const mode = { kind: 'timed', seconds: 60 } as const;
    expect(drillProgress(mode, [], 18_000)).toMatchObject({ done: false, label: '0:42 left' });
    expect(drillProgress(mode, [], 60_000)).toMatchObject({ done: true });
  });

  it('moves through the spots and tags each shot with its spot', () => {
    const mode = { kind: 'spots', set: 'close-in', perSpot: 2 } as const;
    expect(zoneForShot(mode, 0)).toBe('paint');
    expect(zoneForShot(mode, 2)).toBe('free-throw');
    expect(zoneForShot(mode, 4)).toBeUndefined();
    expect(drillProgress(mode, [true], 0)).toMatchObject({ zone: 'paint', label: 'Paint · 1 left', spot: { index: 1, of: 2 } });
    expect(drillCue(mode, [true, false])).toBe('Move to Free throw.');
    expect(drillCue(mode, [true, false, true])).toBeNull();
    expect(drillCue(mode, [true, false, true, true])).toBe('All spots done.');
    expect(drillProgress(mode, [true, false, true, true], 0)?.done).toBe(true);
  });
});
