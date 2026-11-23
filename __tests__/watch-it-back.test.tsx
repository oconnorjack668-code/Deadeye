// __tests__/watch-it-back.test.tsx
// D1 "Watch it back": the player draws the corrected calls, a saved video uses
// them too, and a shot added while paused gets that moment's time. Plus the
// tracker's decode screen (D11): a real shot count, tips that stop moving.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
  clockAtMedia,
  createOverlayLog,
  nearestCall,
  overlayAt,
  pinsCrowded,
  replayPicks,
  shotsToTimeline,
  CALL_AFTER_MS,
  CALL_BEFORE_MS,
  type OverlayTimeline,
} from '@/lib/video/overlayTimeline';
import { exportPlan } from '@/components/video/TrackerVideoExport';
import { addShotAt, addedShot, fromDetected, insertShot, type TrackedShot } from '@/lib/video/trackedShots';
import { WatchItBack } from '@/components/video/WatchItBack';
import { DecodeProgress, TRACKER_TIPS, TIP_CHANGES, TIP_MS } from '@/components/video/DecodeProgress';
import { FREE } from '@/lib/video/drillModes';

vi.mock('@/lib/events', () => ({ track: vi.fn() }));

const RIM = { x: 0.5, y: 0.3, width: 0.1 };

/** A run whose tracker made these calls, with an optional hold (live camera re-aim). */
function run(calls: Array<[number, boolean]>, gaps: Array<[number, number]> = []): OverlayTimeline {
  const log = createOverlayLog();
  log.rim(0, RIM);
  for (const [at, ms] of gaps) log.gap(at, ms);
  for (let t = 0; t <= 20_000; t += 100) log.frame(t, null);
  for (const [t, made] of calls) log.call({ t, made, confident: true });
  return log.snapshot({ activity: calls.map(([t]) => t), mode: FREE, endT: 20_000 });
}

const shot = (id: number, t: number, made: boolean, confident = true): TrackedShot =>
  fromDetected({ t, made, confident }, id);

describe('shotsToTimeline', () => {
  const base = run([
    [2000, true],
    [4000, true],
    [6000, true],
  ]);

  it('draws a call the player flipped as they set it, not as the tracker first made it', () => {
    const shots = [shot(1, 2000, true), shot(2, 4000, true), { ...shot(3, 6000, true), made: false }];
    const tl = shotsToTimeline(base, shots);
    // The tracker's own log still says make; the corrected one says miss
    expect(base.calls[2].made).toBe(true);
    expect(tl.calls.map((c) => c.made)).toEqual([true, true, false]);
    expect(overlayAt(tl, 6100)).toMatchObject({ makes: 2, attempts: 3, flash: { made: false } });
    expect(overlayAt(base, 6100)).toMatchObject({ makes: 3, attempts: 3 });
  });

  it('leaves out a removed call and puts an added one in its place by time', () => {
    const shots = [shot(1, 2000, true), shot(3, 6000, true), addedShot(9, 3000, false)];
    const tl = shotsToTimeline(base, shots);
    expect(tl.calls.map((c) => [c.t, c.made])).toEqual([
      [2000, true],
      [3000, false],
      [6000, true],
    ]);
    // An added shot keeps the shooting clock going like a called one
    expect(tl.activity).toContain(3000);
    // The frames, rims and gaps are the run's own
    expect(tl.frameT).toBe(base.frameT);
    expect(tl.rims).toBe(base.rims);
  });
});

describe('a saved video uses the corrected calls', () => {
  it('no longer replays in slow motion a make the player changed to a miss', () => {
    const base = run([
      [2000, true],
      [4000, true],
      [6000, true],
    ]);
    const tracker = exportPlan(base, -1, -1, 20_000, 0, true).filter((s) => s.replay);
    const fixed = shotsToTimeline(base, [shot(1, 2000, true), shot(2, 4000, true), { ...shot(3, 6000, true), made: false }]);
    const corrected = exportPlan(fixed, -1, -1, 20_000, 0, true).filter((s) => s.replay);
    expect(replayPicks(base, 0, 20_000)).toContain(6000);
    expect(replayPicks(fixed, 0, 20_000)).not.toContain(6000);
    expect(corrected.length).toBe(tracker.length - 1);
  });
});

describe('nearestCall', () => {
  const calls = [{ t: 5000 }, { t: 5800 }, { t: 9000 }];

  it('offers a call from just before it until its MAKE or MISS has gone', () => {
    expect(nearestCall(calls, 9000 - CALL_BEFORE_MS)).toEqual({ t: 9000 });
    expect(nearestCall(calls, 9000 + CALL_AFTER_MS)).toEqual({ t: 9000 });
    expect(nearestCall(calls, 9000 - CALL_BEFORE_MS - 1)).toBeNull();
    expect(nearestCall(calls, 9000 + CALL_AFTER_MS + 1)).toBeNull();
  });

  it('picks the nearest when two calls are both in reach', () => {
    expect(nearestCall(calls, 5300)).toEqual({ t: 5000 });
    expect(nearestCall(calls, 5500)).toEqual({ t: 5800 });
  });
});

describe('pinsCrowded', () => {
  it('turns pins into bars when two would sit under 8 px apart', () => {
    expect(pinsCrowded([0.1, 0.5, 0.9], 300)).toBe(false);
    expect(pinsCrowded([0.5, 0.1, 0.52], 300)).toBe(true);
    expect(pinsCrowded([], 300)).toBe(false);
  });
});

describe('adding a shot at a moment', () => {
  it('puts it in time order with an id no other shot has', () => {
    const shots = [shot(1, 2000, true), shot(2, 6000, false)];
    const next = addShotAt(shots, 4000, true);
    expect(next.map((s) => s.t)).toEqual([2000, 4000, 6000]);
    expect(next[1]).toMatchObject({ id: 3, made: true, confident: true, called: null });
    expect(shots).toHaveLength(2);
  });

  it('puts a removed shot back where it was', () => {
    const removed = shot(2, 4000, true);
    expect(insertShot([shot(1, 2000, true), shot(3, 6000, true)], removed).map((s) => s.id)).toEqual([1, 2, 3]);
  });

  it('reads a time in a live recording back onto the tracking clock across a re-aim', () => {
    // The camera kept recording 3 s while the hoop was re-set at 5 s on the clock
    const gaps = [{ at: 5000, ms: 3000 }];
    expect(clockAtMedia(gaps, 9000 + 250).clockMs).toBe(6250);
  });
});

describe('WatchItBack', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: vi.fn(() => 'blob:clip'), revokeObjectURL: vi.fn() }));
    Object.defineProperty(HTMLMediaElement.prototype, 'duration', { configurable: true, get: () => 20 });
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(() => Promise.resolve());
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function setup(shots: TrackedShot[], gaps: Array<[number, number]> = [], offsetMs = 0) {
    const handlers = { onSet: vi.fn(), onAdd: vi.fn(), onDelete: vi.fn(), onRestore: vi.fn() };
    const base = run(
      shots.map((s) => [s.t, s.made]),
      gaps
    );
    const file = new File(['x'], 'clip.mp4', { type: 'video/mp4' });
    const view = render(<WatchItBack file={file} offsetMs={offsetMs} timeline={shotsToTimeline(base, shots)} shots={shots} {...handlers} />);
    const video = view.container.querySelector('video')!;
    fireEvent.loadedMetadata(video);
    fireEvent.loadedData(video);
    return { handlers, slider: screen.getByRole('slider', { name: 'Position in the clip' }) };
  }

  it('paused on a call, flips it in one tap', async () => {
    const { handlers, slider } = setup([shot(1, 3000, true), shot(2, 8000, true)]);
    await act(async () => {});
    fireEvent.change(slider, { target: { value: '8200' } });
    expect(screen.getByText('Tracker said Make. Tap to change.')).toBeTruthy();
    expect(slider.getAttribute('aria-valuetext')).toBe('0:08 of 0:20, shot 2');
    expect(screen.getByRole('button', { name: 'Make' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Miss' }));
    expect(handlers.onSet).toHaveBeenCalledWith(2, false);
  });

  it('paused between calls, adds a shot at that moment on the tracking clock', async () => {
    // A live recording that starts 400 ms into the clock and held 3 s at 5 s
    const { handlers, slider } = setup([shot(1, 2000, true)], [[5000, 3000]], 400);
    await act(async () => {});
    fireEvent.change(slider, { target: { value: '9000' } });
    expect(screen.getByText('No call here')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Add a miss here/ }));
    // 9000 ms into the video is 9400 on the recording's clock, less the 3 s hold
    expect(handlers.onAdd).toHaveBeenCalledWith(false, 6400);
  });

  it('removes a false call with Undo until the player moves on', async () => {
    const shots = [shot(1, 3000, true)];
    const { handlers, slider } = setup(shots);
    await act(async () => {});
    fireEvent.change(slider, { target: { value: '3500' } });
    fireEvent.click(screen.getByRole('button', { name: /Not a shot/ }));
    expect(handlers.onDelete).toHaveBeenCalledWith(1);
    fireEvent.click(screen.getByRole('button', { name: /Undo/ }));
    expect(handlers.onRestore).toHaveBeenCalledWith(shots[0]);
  });

  it('steps to the next shot with Shift and an arrow key', async () => {
    const { slider } = setup([shot(1, 3000, true), shot(2, 8000, false)]);
    await act(async () => {});
    fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });
    // A shot review starts 2.5 s before the call
    expect(slider.getAttribute('aria-valuetext')).toBe('0:00 of 0:20');
    fireEvent.change(slider, { target: { value: '3200' } });
    fireEvent.keyDown(slider, { key: 'ArrowRight', shiftKey: true });
    expect((slider as HTMLInputElement).value).toBe('5500');
  });
});

describe('DecodeProgress', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('shows the real count of shots found and the percent', () => {
    render(<DecodeProgress progress={0.44} shotsFound={6} onStop={() => undefined} />);
    expect(screen.getByText('44%')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
  });

  it('changes the line three times, then holds on the last', () => {
    render(<DecodeProgress progress={0.1} shotsFound={0} onStop={() => undefined} />);
    expect(screen.getByText(TRACKER_TIPS[0].text)).toBeTruthy();
    for (let i = 1; i <= TIP_CHANGES; i++) {
      act(() => vi.advanceTimersByTime(TIP_MS));
      expect(screen.getByText(TRACKER_TIPS[i].text)).toBeTruthy();
    }
    act(() => vi.advanceTimersByTime(TIP_MS * 4));
    expect(screen.getByText(TRACKER_TIPS[TIP_CHANGES].text)).toBeTruthy();
    expect(screen.getByText('John Wooden')).toBeTruthy();
  });
});
