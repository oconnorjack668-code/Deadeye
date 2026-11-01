import { describe, it, expect } from 'vitest';
import {
  addedShot,
  buildSummary,
  deviceClass,
  fromDetected,
  parseSummary,
  runAccuracy,
  totalAccuracy,
  type TrackedShot,
} from '@/lib/video/trackedShots';

describe('deviceClass', () => {
  it('reads iPhone, Android and desktop', () => {
    expect(deviceClass('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5, 6)).toEqual({ os: 'ios', mobile: true, cores: 6 });
    expect(deviceClass('Mozilla/5.0 (Linux; Android 14; SM-A136B) Mobile', 5, 8)).toEqual({ os: 'android', mobile: true, cores: 8 });
    expect(deviceClass('Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 0, 12)).toEqual({ os: 'other', mobile: false, cores: 12 });
  });

  it('counts an iPad, which reports itself as a Mac, as iOS', () => {
    expect(deviceClass('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5, 8).os).toBe('ios');
    expect(deviceClass('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0, 8).os).toBe('other');
  });

  it('leaves out a core count the browser does not give', () => {
    expect(deviceClass('', 0, undefined).cores).toBeNull();
  });
});

describe('saved summaries', () => {
  const shots: TrackedShot[] = [
    fromDetected({ t: 1000.4, made: true, confident: true, crossMargin: 0.3, crossSide: -0.3 }, 1),
    // Called a miss, unsure; the player said make
    { ...fromDetected({ t: 4000, made: false, confident: false }, 2), made: true, confident: true },
    fromDetected({ t: 7000, made: false, confident: true, crossMargin: 1.9, crossSide: 1.912, touchedRim: true }, 3),
    addedShot(4, 9000, true),
  ];

  it('keeps the tracker call next to the final one', () => {
    const summary = buildSummary({ source: 'camera', zone: 'all-around', shots, removed: 1, quality: { fps: 28, frames: 900, ballSeenPct: 6 }, device: null });
    expect(summary.v).toBe(2);
    expect(summary.makes).toBe(3);
    expect(summary.attempts).toBe(4);
    expect(summary.shots[0]).toEqual({ t: 1000, made: true, called: 'make', side: -0.3 });
    expect(summary.shots[1]).toEqual({ t: 4000, made: true, called: 'miss', unsure: true });
    expect(summary.shots[2]).toEqual({ t: 7000, made: false, called: 'miss', side: 1.91, rim: true });
    expect(summary.shots[3]).toEqual({ t: 9000, made: true, called: null });
  });

  it('scores a run from the corrections', () => {
    const summary = buildSummary({ source: 'file', zone: 'paint', shots, removed: 1, quality: null, device: null });
    expect(runAccuracy(summary)).toEqual({ calls: 4, right: 2, flipped: 1, added: 1, removed: 1, unsure: 1, unsureRight: 0 });
  });

  it('round-trips through JSON', () => {
    const summary = buildSummary({ source: 'camera', zone: 'all-around', shots, removed: 0, quality: { fps: 20, frames: 10, ballSeenPct: 1 }, device: { os: 'ios', mobile: true, cores: 6 }, activeMinutes: 12 });
    expect(parseSummary(JSON.parse(JSON.stringify(summary)))).toEqual(summary);
  });

  it('reads sessions saved before calls were kept, without scoring them', () => {
    const old = parseSummary({ source: 'file', zone: 'paint', makes: 1, attempts: 2, shots: [{ t: 1, made: true }, { t: 2, made: false }] });
    expect(old?.shots).toHaveLength(2);
    expect(old && runAccuracy(old)).toBeNull();
  });

  it('drops what is not a shot rather than throwing', () => {
    expect(parseSummary(null)).toBeNull();
    expect(parseSummary({ shots: 'no' })).toBeNull();
    const parsed = parseSummary({ v: 2, shots: [{ t: 'x', made: true }, { t: 3, made: 'yes' }, { t: 5, made: false, side: 'left' }] });
    expect(parsed?.shots).toEqual([{ t: 5, made: false }]);
  });

  it('adds up runs and skips old ones', () => {
    const a = buildSummary({ source: 'camera', zone: 'all-around', shots, removed: 1, quality: { fps: 8, frames: 1, ballSeenPct: 1 }, device: null });
    const b = buildSummary({ source: 'file', zone: 'all-around', shots: shots.slice(0, 1), removed: 0, quality: { fps: 30, frames: 1, ballSeenPct: 1 }, device: null });
    const old = parseSummary({ shots: [{ t: 1, made: true }] })!;
    const total = totalAccuracy([a, b, old]);
    expect(total.runs).toBe(2);
    expect(total.right).toBe(3);
    expect(total.shots).toBe(5);
    expect(total.slowRuns).toBe(1);
    expect(total.medianFps).toBe(30);
  });
});
