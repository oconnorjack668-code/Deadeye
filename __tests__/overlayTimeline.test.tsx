// __tests__/overlayTimeline.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  clockAtMedia,
  createOverlayLog,
  heatLevel,
  mediaAtClock,
  milestoneFor,
  overlayAt,
  replayPicks,
  rimTone,
  BANNER_MS,
  FLASH_MS,
  MAX_FRAMES,
  type OverlayTimeline,
} from '@/lib/video/overlayTimeline';
import { bannerCurve, callSpot, flashCurve, heatLabel, hudUnit, verticalLayout } from '@/lib/video/overlayArt';
import { exportPlan, exportRange, planLengthMs } from '@/components/video/TrackerVideoExport';
import { TrackerHud } from '@/components/video/TrackerHud';
import { FREE } from '@/lib/video/drillModes';

const RIM = { x: 0.5, y: 0.3, width: 0.1 };
const RIM2 = { x: 0.55, y: 0.32, width: 0.1 };
const ball = (x: number, y: number) => ({ x, y, w: 0.02, h: 0.02 });

/** A run of shots at the given times and results, with a ball on a few frames before each. */
function timeline(calls: Array<[number, boolean]>, gaps: Array<[number, number]> = []): OverlayTimeline {
  const log = createOverlayLog();
  log.rim(0, RIM);
  for (const [at, ms] of gaps) log.gap(at, ms);
  for (let t = 0; t <= 20_000; t += 33) {
    const nearShot = calls.some(([c]) => c - t >= 0 && c - t < 400);
    log.frame(t, nearShot ? ball(0.5, 0.2 + (t % 400) / 4000) : null);
  }
  for (const [t, made] of calls) log.call({ t, made, confident: true });
  return log.snapshot({ activity: calls.map(([t]) => t), mode: FREE, endT: 20_000 });
}

describe('the two clocks', () => {
  const gaps = [
    { at: 5000, ms: 3000 },
    { at: 9000, ms: 1000 },
  ];

  it('puts a shot after a re-aim that much further into the recording', () => {
    expect(mediaAtClock(gaps, 4000)).toBe(4000);
    // A call made right as the clock stopped belongs before the hold
    expect(mediaAtClock(gaps, 5000)).toBe(5000);
    expect(mediaAtClock(gaps, 6000)).toBe(9000);
    expect(mediaAtClock(gaps, 10_000)).toBe(14_000);
  });

  it('reads the recording back onto the clock, holding through each re-aim', () => {
    expect(clockAtMedia(gaps, 4000)).toEqual({ clockMs: 4000, held: false });
    expect(clockAtMedia(gaps, 6500)).toEqual({ clockMs: 5000, held: true });
    expect(clockAtMedia(gaps, 9000)).toEqual({ clockMs: 6000, held: false });
    expect(clockAtMedia(gaps, 12_500)).toEqual({ clockMs: 9000, held: true });
    for (const t of [100, 4999, 6001, 8999, 9001, 15_000]) expect(clockAtMedia(gaps, mediaAtClock(gaps, t)).clockMs).toBe(t);
  });

  it('is the identity with no gaps, as for a video file', () => {
    expect(mediaAtClock([], 1234)).toBe(1234);
    expect(clockAtMedia([], 1234)).toEqual({ clockMs: 1234, held: false });
  });
});

describe('overlayAt', () => {
  const tl = timeline([
    [2000, true],
    [4000, true],
    [6000, true],
    [8000, false],
  ]);

  it('counts the score and streak as they stood at each moment', () => {
    expect(overlayAt(tl, 1000)).toMatchObject({ makes: 0, attempts: 0, streak: 0, flash: null });
    expect(overlayAt(tl, 4100)).toMatchObject({ makes: 2, attempts: 2, streak: 2 });
    expect(overlayAt(tl, 6100)).toMatchObject({ makes: 3, attempts: 3, streak: 3, recent: [true, true, true] });
    expect(overlayAt(tl, 9000)).toMatchObject({ makes: 3, attempts: 4, streak: 0, recent: [true, true, true, false] });
  });

  it('shows a call for the length of the flash, with the streak it made', () => {
    expect(overlayAt(tl, 6000).flash).toMatchObject({ made: true, makes: 3, attempts: 3, streak: 3, age: 0 });
    expect(overlayAt(tl, 6000 + FLASH_MS).flash).not.toBeNull();
    expect(overlayAt(tl, 6000 + FLASH_MS + 1).flash).toBeNull();
  });

  it('colours the rim for a moment after a call', () => {
    expect(overlayAt(tl, 6100).tone).toBe('make');
    expect(overlayAt(tl, 8100).tone).toBe('miss');
    expect(overlayAt(tl, 7000).tone).toBeNull();
    expect(rimTone(null, 100)).toBeNull();
  });

  it('draws the ball only near a frame that found it, with a trail of recent ones', () => {
    const near = overlayAt(tl, 1990);
    expect(near.ball).not.toBeNull();
    expect(near.trail.length).toBeGreaterThan(3);
    expect(near.ballInView).toBe(true);
    const far = overlayAt(tl, 3000);
    expect(far.ball).toBeNull();
    expect(far.trail).toEqual([]);
    expect(far.ballInView).toBe(false);
  });

  it('drops the rim and ball while re-aiming, and keeps the score', () => {
    const s = overlayAt(tl, 1990, true);
    expect(s.rim).toBeNull();
    expect(s.ball).toBeNull();
    expect(s.trail).toEqual([]);
    expect(overlayAt(tl, 6100, true).makes).toBe(3);
  });

  it('uses the rim set after a re-aim from then on', () => {
    const log = createOverlayLog();
    log.rim(0, RIM);
    log.rim(5000, RIM2);
    const t = log.snapshot({ activity: [], mode: FREE, endT: 9000 });
    expect(overlayAt(t, 4000).rim).toEqual(RIM);
    expect(overlayAt(t, 6000).rim).toEqual(RIM2);
  });
});

describe('the log', () => {
  it('ignores frames out of order, and stops logging frames at the cap', () => {
    const log = createOverlayLog();
    log.frame(100, null);
    log.frame(50, ball(0.1, 0.1));
    expect(log.snapshot({ activity: [], mode: FREE, endT: 0 }).frameT).toEqual([100]);
    const big = createOverlayLog();
    for (let i = 0; i < MAX_FRAMES + 10; i++) big.frame(i, null);
    expect(big.snapshot({ activity: [], mode: FREE, endT: 0 }).frameT.length).toBe(MAX_FRAMES);
  });

  it('keeps no zero-length gap', () => {
    const log = createOverlayLog();
    log.gap(1000, 0);
    expect(log.gaps()).toEqual([]);
  });
});

describe('heat', () => {
  it('starts at three in a row and builds', () => {
    expect([0, 2, 3, 4, 5, 6, 7, 12].map(heatLevel)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(heatLabel(2)).toBeNull();
    expect(heatLabel(3)).toBe('Heating up · 3');
    expect(heatLabel(6)).toBe('On fire · 6');
  });
});

describe('the saved video', () => {
  const tl = timeline(
    [
      [2000, true],
      [6000, false],
      [12_000, true],
    ],
    [[5000, 4000]]
  );

  it('runs from a few seconds before the first chosen shot to just after the last, in recording time', () => {
    expect(exportRange(tl, -1, -1, 30_000)).toEqual({ startMs: 0, endMs: 30_000 });
    // Shot 2 is at 6000 on the clock, 10000 in the recording after the 4s re-aim
    expect(exportRange(tl, 1, 1, 30_000)).toEqual({ startMs: 7000, endMs: 12_500 });
    expect(exportRange(tl, 0, 2, 30_000)).toEqual({ startMs: 0, endMs: 18_500 });
    // Never past the end of the file
    expect(exportRange(tl, 2, -1, 17_000)).toEqual({ startMs: 13_000, endMs: 17_000 });
  });

  it('follows the flash animation, and sizes the overlay to the picture', () => {
    expect(flashCurve(0).opacity).toBe(0);
    expect(flashCurve(FLASH_MS * 0.18).opacity).toBeCloseTo(1);
    expect(flashCurve(FLASH_MS).opacity).toBeCloseTo(0);
    expect(flashCurve(FLASH_MS * 0.5).scale).toBe(1);
    expect(hudUnit(1920, 1080)).toBe(3);
    expect(hudUnit(1080, 1920)).toBe(3);
  });
});

describe('milestones', () => {
  const run = (makes: number, misses: number) => [...Array(misses).fill(false), ...Array(makes).fill(true)];

  it('marks round numbers of makes on the make that reaches them', () => {
    expect(milestoneFor(run(10, 4))).toBe('10 makes');
    expect(milestoneFor(run(9, 4))).toBeNull();
    // A miss after the tenth make does not repeat it
    expect(milestoneFor([...run(10, 4), false])).toBeNull();
  });

  it('marks a perfect start and round numbers of shots', () => {
    expect(milestoneFor(run(5, 0))).toBe('Perfect start · 5/5');
    expect(milestoneFor([true, true, true, true, false])).toBeNull();
    expect(milestoneFor([...Array(49).fill(true).map((_, i) => i % 3 === 0), false])).toBe('50 shots up');
    expect(milestoneFor([])).toBeNull();
  });

  it('puts the latest banner on the overlay for its time', () => {
    const tl = timeline([1, 2, 3, 4, 5].map((s) => [s * 1000, true] as [number, boolean]));
    expect(overlayAt(tl, 4900).banner).toBeNull();
    expect(overlayAt(tl, 5000).banner).toEqual({ label: 'Perfect start · 5/5', age: 0 });
    expect(overlayAt(tl, 5000 + BANNER_MS).banner).not.toBeNull();
    expect(overlayAt(tl, 5001 + BANNER_MS).banner).toBeNull();
    expect(bannerCurve(0).opacity).toBe(0);
    expect(bannerCurve(1000)).toEqual({ opacity: 1, scale: 1 });
    expect(bannerCurve(BANNER_MS).opacity).toBe(0);
  });
});

describe('slow-mo replays', () => {
  // make, make, miss, make, make, make, miss, make
  const tl = timeline([
    [1000, true],
    [2000, true],
    [3000, false],
    [4000, true],
    [5000, true],
    [6000, true],
    [7000, false],
    [8000, true],
  ]);

  it('picks the makes deepest into a streak, in the order they happened', () => {
    // Streaks at each make: 1, 2, -, 1, 2, 3, -, 1
    expect(replayPicks(tl, 0, 10_000)).toEqual([2000, 5000, 6000]);
    expect(replayPicks(tl, 0, 10_000, 1)).toEqual([6000]);
    // Only inside the range saved; the streak still counts makes from before it
    expect(replayPicks(tl, 5500, 10_000)).toEqual([6000, 8000]);
  });

  it('plays them at half speed after the session part', () => {
    const plan = exportPlan(tl, -1, -1, 12_000, 0, true);
    expect(plan[0]).toEqual({ startMs: 0, endMs: 12_000, rate: 1, replay: false });
    expect(plan.slice(1)).toEqual([
      { startMs: 200, endMs: 2700, rate: 0.5, replay: true },
      { startMs: 3200, endMs: 5700, rate: 0.5, replay: true },
      { startMs: 4200, endMs: 6700, rate: 0.5, replay: true },
    ]);
    // 12s, three 2.5s replays at half speed, the end card
    expect(planLengthMs(plan)).toBe(12_000 + 3 * 5000 + 2500);
    expect(exportPlan(tl, -1, -1, 12_000, 0, false)).toHaveLength(1);
  });
});

describe('vertical video', () => {
  it('shows sideways footage whole across the width, over a blurred copy, inside the safe area', () => {
    const { picture, area, backdrop } = verticalLayout(1920, 1080);
    expect(backdrop).toBe(true);
    expect(picture.w).toBe(1080);
    expect(picture.h).toBeCloseTo(607.5);
    expect(picture.y).toBeGreaterThanOrEqual(area.y);
    expect(picture.y + picture.h).toBeLessThanOrEqual(area.y + area.h);
    // Clear of the platforms' tabs at the top and caption at the bottom
    expect(area.y).toBe(192);
    expect(area.y + area.h).toBeLessThan(1920 * 0.8);
  });

  it('fills the frame with upright footage', () => {
    const { picture, backdrop } = verticalLayout(1080, 1920);
    expect(backdrop).toBe(false);
    expect(picture).toEqual({ x: 0, y: 0, w: 1080, h: 1920 });
    // A little wider than 9:16 still fills it, trimmed at the sides
    const wider = verticalLayout(900, 1500);
    expect(wider.backdrop).toBe(false);
    expect(wider.picture.h).toBe(1920);
    expect(wider.picture.x).toBeLessThan(0);
    // 2:3 is too wide to fill without losing a lot: it goes over the backdrop
    expect(verticalLayout(720, 1080).backdrop).toBe(true);
  });
});

describe('TrackerHud on a streak', () => {
  const base = {
    makes: 3,
    attempts: 3,
    clockMs: 30_000,
    paused: false,
    recent: [],
    health: { ball: false, issues: [], fps: null },
    drill: null,
    theatre: false,
    onToggleTheatre: () => undefined,
    onFixRim: () => undefined,
    canFixRim: false,
  };

  it('names the streak and says it on the call', () => {
    render(<TrackerHud {...base} streak={{ current: 3, best: 3, coldRun: 0 }} flash={{ id: 3, made: true, confident: true, makes: 3, attempts: 3, streak: 3 }} />);
    expect(screen.getByText('Heating up · 3')).toBeTruthy();
    expect(screen.getByText(/3 in a row/)).toBeTruthy();
  });

  it('shows a milestone banner', () => {
    render(<TrackerHud {...base} streak={{ current: 0, best: 3, coldRun: 1 }} flash={null} banner={{ id: 9, label: '10 makes' }} />);
    expect(screen.getByText('10 makes')).toBeTruthy();
  });

  it('stays plain below three', () => {
    render(<TrackerHud {...base} streak={{ current: 2, best: 2, coldRun: 0 }} flash={null} />);
    expect(screen.queryByText(/Heating up|On fire/)).toBeNull();
  });

  it('puts the call beside the rim', () => {
    render(
      <TrackerHud
        {...base}
        streak={{ current: 1, best: 1, coldRun: 0 }}
        flash={{ id: 1, made: true, confident: true, makes: 1, attempts: 1, streak: 1 }}
        rim={{ x: 0.35, y: 0.45, width: 0.12 }}
      />
    );
    // The visible call, not the unseen copy kept for measuring
    const word = screen.getAllByText('Make').find((el) => !el.closest('[aria-hidden="true"]')) as HTMLElement;
    const stack = word.parentElement as HTMLElement;
    expect(parseFloat(stack.style.left)).toBeCloseTo(44, 5);
    expect(stack.getAttribute('style')).toContain('45%');
    // Beside the rim the word stands alone: the score and streak are on the HUD already
    expect(stack.textContent).toBe('Make');
  });

  it('says "N in a row" under a make on a streak beside the rim, without the count', () => {
    render(
      <TrackerHud
        {...base}
        streak={{ current: 4, best: 4, coldRun: 0 }}
        flash={{ id: 4, made: true, confident: true, makes: 4, attempts: 5, streak: 4 }}
        rim={{ x: 0.35, y: 0.45, width: 0.12 }}
      />
    );
    const word = screen.getAllByText('Make').find((el) => !el.closest('[aria-hidden="true"]')) as HTMLElement;
    const stack = word.parentElement as HTMLElement;
    expect(stack.style.left).not.toBe('');
    expect(stack.textContent).toMatch(/4 in a row/i);
    expect(stack.textContent).not.toMatch(/4\/5/);
  });

  it('keeps "check this one" beside the rim', () => {
    render(
      <TrackerHud
        {...base}
        streak={{ current: 0, best: 1, coldRun: 1 }}
        flash={{ id: 2, made: false, confident: false, makes: 0, attempts: 1, streak: 0 }}
        rim={{ x: 0.35, y: 0.45, width: 0.12 }}
      />
    );
    const word = screen.getAllByText('Miss').find((el) => !el.closest('[aria-hidden="true"]')) as HTMLElement;
    expect(word.parentElement!.textContent).toMatch(/check this one/i);
  });

  it('centres the call, with its count, when there is no rim', () => {
    render(<TrackerHud {...base} streak={{ current: 1, best: 1, coldRun: 0 }} flash={{ id: 1, made: false, confident: true, makes: 0, attempts: 1, streak: 0 }} />);
    const word = screen.getByText('Miss');
    expect((word.parentElement as HTMLElement).style.left).toBe('');
    expect(screen.getByText('0/1')).toBeTruthy();
  });
});

describe('the make/miss call beside the rim', () => {
  it('goes right of the rim, away from the score, and left only when the right is full', () => {
    const right = callSpot({ x: 0.6, y: 0.45, width: 0.12 }, 0.2);
    expect(right?.side).toBe('right');
    expect(right!.x).toBeGreaterThan(0.66);
    const left = callSpot({ x: 0.82, y: 0.45, width: 0.12 }, 0.2);
    expect(left?.side).toBe('left');
    expect(left!.x).toBeLessThan(0.76);
  });

  it('asks for as much room as the word needs', () => {
    // 0.3 of the width left on the right: a narrow word fits there, a wide one goes left
    expect(callSpot({ x: 0.64, y: 0.45, width: 0.06 }, 0.2)?.side).toBe('right');
    expect(callSpot({ x: 0.64, y: 0.45, width: 0.06 }, 0.35)?.side).toBe('left');
  });

  it('keeps the word inside a safe zone short of the right edge', () => {
    // A 9:16 video stops text at 1015 of 1080
    const maxX = 1015 / 1080;
    expect(callSpot({ x: 0.7, y: 0.45, width: 0.1 }, 0.17)?.side).toBe('right');
    expect(callSpot({ x: 0.7, y: 0.45, width: 0.1 }, 0.17, maxX)?.side).toBe('left');
  });

  it('follows a tilted rim at the end it sits beside', () => {
    expect(callSpot({ x: 0.3, y: 0.5, width: 0.2, tilt: 0.5 }, 0.2)!.y).toBeCloseTo(0.55, 5);
  });

  it('is centred with no rim, or no room either side', () => {
    expect(callSpot(null, 0.2)).toBeNull();
    expect(callSpot({ x: 0.5, y: 0.5, width: 0.6 }, 0.2)).toBeNull();
  });
});
