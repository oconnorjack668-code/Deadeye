// __tests__/slogans.test.ts
// The slogan picker (src/lib/slogans.ts): the founder's picks only, quotes
// always with their speaker, short lines that fit under the logo, and a new
// line each visit that is never last visit's.
import { describe, it, expect, afterEach } from 'vitest';
import { ROOMY_SLOGANS, SHORT_SLOGANS, SLOGANS, pickSloganIndex, sloganLine, visitSlogan } from '@/lib/slogans';

afterEach(() => document.documentElement.removeAttribute('data-sl'));

describe('the slogan list', () => {
  it('shows every quote with its speaker, and "Hard work outweighs talent" with no name', () => {
    for (const s of SLOGANS.filter((x) => x.kind === 'quote')) expect(s.by, s.text).toBeTruthy();
    const hardWork = SLOGANS.find((s) => s.text === 'Hard work outweighs talent');
    expect(hardWork?.by).toBeUndefined();
    expect(sloganLine({ text: 'Be quick, but don’t hurry.', kind: 'quote', by: 'John Wooden' })).toBe(
      '“Be quick, but don’t hurry.” – John Wooden'
    );
  });

  it('keeps the opening and loader lines to one short line, with no quotes or tracker lines', () => {
    expect(SHORT_SLOGANS.length).toBeGreaterThan(5);
    for (const s of SHORT_SLOGANS) {
      expect(s.text.length, s.text).toBeLessThanOrEqual(26);
      expect(s.by).toBeUndefined();
      expect(s.kind === 'brand' || s.kind === 'motivation').toBe(true);
    }
    expect(SHORT_SLOGANS[0].text).toBe('Aim is earned');
    expect(ROOMY_SLOGANS.some((s) => s.kind === 'quote')).toBe(true);
    expect(ROOMY_SLOGANS.some((s) => s.kind === 'tracker')).toBe(false);
  });

  it('never claims the tracker catches every shot', () => {
    for (const s of SLOGANS) expect(s.text).not.toMatch(/every shot|never miss|100%/i);
  });
});

describe('picking a new line each visit', () => {
  it('never repeats last visit’s line, and can reach every other line', () => {
    const n = SHORT_SLOGANS.length;
    for (let last = 0; last < n; last++) {
      const seen = new Set<number>();
      for (let i = 0; i < 200; i++) seen.add(pickSloganIndex(n, last, i / 200));
      expect(seen.has(last)).toBe(false);
      expect(seen.size).toBe(n - 1);
    }
  });

  it('picks from all lines on a first visit or with a bad stored value', () => {
    expect(pickSloganIndex(10, null, 0.99)).toBe(9);
    expect(pickSloganIndex(10, 42, 0)).toBe(0);
    expect(pickSloganIndex(1, 0, 0.5)).toBe(0);
  });
});

describe("reading the visit's line", () => {
  it("uses the head script's pick, and the first line without one", () => {
    expect(visitSlogan().text).toBe('Aim is earned');
    document.documentElement.setAttribute('data-sl', '2');
    expect(visitSlogan()).toBe(SHORT_SLOGANS[2]);
    // a longer list wraps, so it still changes each visit
    document.documentElement.setAttribute('data-sl', String(ROOMY_SLOGANS.length + 1));
    expect(visitSlogan(ROOMY_SLOGANS)).toBe(ROOMY_SLOGANS[1]);
    document.documentElement.setAttribute('data-sl', 'x');
    expect(visitSlogan()).toBe(SHORT_SLOGANS[0]);
  });
});
