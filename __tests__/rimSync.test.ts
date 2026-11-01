import { describe, it, expect } from 'vitest';
import { exactLike, mergeRims, parseAccountRims } from '@/lib/video/rimSync';
import type { SavedRim } from '@/lib/video/rimMemory';

const rim = { x: 0.5, y: 0.3, width: 0.06 };
const other = { x: 0.4, y: 0.35, width: 0.05 };

describe('mergeRims', () => {
  const local: SavedRim[] = [{ id: 'a', name: 'Home driveway', rim, usedAt: 100 }];

  it('keeps the phone measurement when both have the hoop', () => {
    const merged = mergeRims(local, [{ name: 'home driveway', rim: other, usedAt: 500 }]);
    expect(merged).toEqual(local);
  });

  it('adds hoops only in the account, marked to be checked first', () => {
    const merged = mergeRims(local, [{ name: 'Club gym', rim: other, usedAt: 200 }]);
    expect(merged.map((s) => s.name)).toEqual(['Club gym', 'Home driveway']);
    expect(merged[0].fromAccount).toBe(true);
    expect(merged[1].fromAccount).toBeUndefined();
  });

  it('keeps no more than the phone does', () => {
    const many = Array.from({ length: 10 }, (_, i) => ({ name: `Hoop ${i}`, rim, usedAt: i }));
    expect(mergeRims([], many)).toHaveLength(6);
  });
});

describe('parseAccountRims', () => {
  it('drops rows that are not a usable rim', () => {
    const rows = [
      { name: 'Good', rim, used_at: '2026-11-01T10:00:00Z' },
      { name: 'Too wide', rim: { x: 0.5, y: 0.5, width: 0.9 }, used_at: '2026-11-01T10:00:00Z' },
      { name: '', rim, used_at: null },
      { name: 'Not an object', rim: 'x', used_at: null },
    ];
    expect(parseAccountRims(rows)).toEqual([{ name: 'Good', rim, usedAt: Date.parse('2026-11-01T10:00:00Z') }]);
  });
});

describe('exactLike', () => {
  it('escapes the characters ilike treats as wildcards', () => {
    // In: 50%_court\   Out: 50\%\_court\\
    expect(exactLike('50%_court\\')).toBe('50\\%\\_court\\\\');
  });
});
