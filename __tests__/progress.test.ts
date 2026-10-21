// __tests__/progress.test.ts
import { describe, it, expect } from 'vitest';
import { compareSession } from '@/lib/progress';

describe('compareSession', () => {
  it('needs shots now and something earlier to compare with', () => {
    expect(compareSession([], [{ shot_zone: 'paint', makes: 5, attempts: 10 }])).toBeNull();
    expect(compareSession([{ shot_zone: 'paint', makes: 5, attempts: 10 }], [])).toBeNull();
  });

  it('headlines the spot that improved most, if shot enough both times', () => {
    const p = compareSession(
      [
        { shot_zone: 'three-left-wing', makes: 6, attempts: 10 },
        { shot_zone: 'paint', makes: 8, attempts: 10 },
        { shot_zone: 'free-throw', makes: 2, attempts: 2 }, // too few to headline
      ],
      [
        { shot_zone: 'three-left-wing', makes: 4, attempts: 10 },
        { shot_zone: 'three-left-wing', makes: 5, attempts: 10 },
        { shot_zone: 'paint', makes: 7, attempts: 10 },
        { shot_zone: 'free-throw', makes: 0, attempts: 2 },
      ]
    )!;
    // Left wing 45% before (9 of 20), 60% now
    expect(p.headline).toBe('Up 15% from 3 left wing compared with your earlier sessions.');
    expect(p.zones.find((z) => z.zone === 'three-left-wing')).toMatchObject({ now: 60, before: 45 });
    expect(p.zones.find((z) => z.zone === 'free-throw')).toMatchObject({ now: 100, before: 0 });
  });

  it('falls back to the whole session, and is honest about a bad day', () => {
    const better = compareSession([{ shot_zone: 'paint', makes: 6, attempts: 10 }], [{ shot_zone: 'mid-center', makes: 4, attempts: 10 }])!;
    expect(better.headline).toBe('Up 20% overall compared with your earlier sessions.');
    expect(better.zones[0].before).toBeNull(); // never shot from the paint before

    const worse = compareSession([{ shot_zone: 'paint', makes: 3, attempts: 10 }], [{ shot_zone: 'paint', makes: 6, attempts: 10 }])!;
    expect(worse.headline).toMatch(/^A tougher day: 30% against your usual 60%/);

    const same = compareSession([{ shot_zone: 'paint', makes: 5, attempts: 10 }], [{ shot_zone: 'paint', makes: 5, attempts: 10 }])!;
    expect(same.headline).toMatch(/^Right on your average/);
  });
});
