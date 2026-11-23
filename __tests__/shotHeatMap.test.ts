import { describe, it, expect } from 'vitest';
import { bandFor, sessionCrop, shotChartLayout, shotChartSvg, type Chip } from '@/lib/shotChart';
import { COURT_WIDTH_FT, ZONE_SPOTS, type CourtZone } from '@/lib/court';

const ALL = Object.keys(ZONE_SPOTS) as CourtZone[];

const overlap = (a: Chip, b: Chip) => Math.abs(a.cx - b.cx) * 2 < a.w + b.w && Math.abs(a.cy - b.cy) * 2 < a.h + b.h;

describe('shot chart v2: colour scale', () => {
  it('uses the classic bands: blue cold under 25%, red hot from 50%', () => {
    expect(bandFor(0).id).toBe('cold');
    expect(bandFor(24).id).toBe('cold');
    expect(bandFor(25).id).toBe('cool');
    expect(bandFor(33).id).toBe('avg');
    expect(bandFor(40).id).toBe('warm');
    expect(bandFor(49).id).toBe('warm');
    expect(bandFor(50).id).toBe('hot');
    expect(bandFor(50).fill).toBe('#dc2626'); // red-600
    expect(bandFor(10).fill).toBe('#2563eb'); // blue-600
  });
});

describe('shot chart v2: zones and chips', () => {
  it('fills only the real zones with shots and ignores the rest', () => {
    const l = shotChartLayout([
      { zone: 'paint', makes: 7, attempts: 12 },
      { zone: 'all-around', makes: 3, attempts: 5 },
      { zone: 'mid-center', makes: 0, attempts: 0 },
    ]);
    expect(l.zones.map((z) => z.zone)).toEqual(['paint']);
    expect(l.chips[0]).toMatchObject({ pct: 58, makes: 7, attempts: 12, solo: false });
    // the bare-wood zone gets no colour, the paint gets warm-hot red
    expect(l.courtMarkup).toContain('#dc2626');
  });

  it('shows the corner three as a percent only, inside the court', () => {
    const l = shotChartLayout([{ zone: 'three-left-corner', makes: 7, attempts: 12 }, { zone: 'three-right-corner', makes: 1, attempts: 2 }]);
    for (const c of l.chips) {
      expect(c.solo).toBe(true);
      expect(c.cx - c.w / 2).toBeGreaterThanOrEqual(0);
      expect(c.cx + c.w / 2).toBeLessThanOrEqual(COURT_WIDTH_FT * 10);
    }
  });

  it('drops the zone with fewer shots to the percent only when two chips overlap', () => {
    const l = shotChartLayout(
      ALL.map((zone, i) => ({ zone, makes: 5, attempts: 10 + i })),
      { renderW: 300 }
    );
    for (let i = 0; i < l.chips.length; i++) {
      for (let j = i + 1; j < l.chips.length; j++) {
        const [a, b] = [l.chips[i], l.chips[j]];
        if (!overlap(a, b)) continue;
        // Wherever two still touch, the smaller sample has given up its makes/attempts
        const smaller = a.attempts < b.attempts ? a : b;
        expect(smaller.solo, `${a.zone} / ${b.zone}`).toBe(true);
      }
    }
    // the biggest sample never loses its count
    const biggest = l.chips.reduce((m, c) => (c.attempts > m.attempts ? c : m));
    expect(biggest.solo).toBe(biggest.zone.includes('three-') && biggest.zone.endsWith('corner'));
  });

  it('steps a corner chip clear of its mid baseline neighbour', () => {
    const l = shotChartLayout(
      [
        { zone: 'three-left-corner', makes: 7, attempts: 12 },
        { zone: 'mid-left-corner', makes: 2, attempts: 9 },
      ],
      { renderW: 300 }
    );
    expect(overlap(l.chips[0], l.chips[1])).toBe(false);
  });

  it('keeps the makes/attempts at the 12 px floor even when asked smaller', () => {
    const l = shotChartLayout([{ zone: 'paint', makes: 1, attempts: 2 }], { renderW: 300, subPx: 10 });
    expect(l.fontSub * l.k).toBeCloseTo(12);
  });

  it('puts a lit mid top chip under the arc with a pointer on a session crop', () => {
    const zones = [{ zone: 'mid-center', makes: 6, attempts: 10 }];
    const l = shotChartLayout(zones, { renderW: 318, ...sessionCrop(zones) });
    expect(l.chips[0].pointer).toBe(true);
    expect(l.chips[0].cy).toBeGreaterThan(290); // below the three-point arc
  });

  it('sanitises the id and puts no player text into the markup', () => {
    const l = shotChartLayout([{ zone: 'paint', makes: 1, attempts: 2 }], { id: '"><script>' });
    expect(l.courtMarkup).not.toContain('<script');
    expect(shotChartSvg(l).startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
  });

  it('names every zone and its numbers for a screen reader', () => {
    const l = shotChartLayout([{ zone: 'paint', makes: 7, attempts: 12 }]);
    expect(l.ariaLabel).toBe('Shot chart. Paint: 58% on 12 shots.');
  });
});
