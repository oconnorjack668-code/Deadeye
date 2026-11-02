// __tests__/overlayTimeline.test.tsx
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  clockAtMedia,
  createOverlayLog,
  heatLevel,
  mediaAtClock,
  overlayAt,
  rimTone,
  FLASH_MS,
  MAX_FRAMES,
  type OverlayTimeline,
} from '@/lib/video/overlayTimeline';
import { flashCurve, heatLabel, hudUnit } from '@/lib/video/overlayArt';
import { exportRange } from '@/components/video/TrackerVideoExport';
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

  it('stays plain below three', () => {
    render(<TrackerHud {...base} streak={{ current: 2, best: 2, coldRun: 0 }} flash={null} />);
    expect(screen.queryByText(/Heating up|On fire/)).toBeNull();
  });
});
