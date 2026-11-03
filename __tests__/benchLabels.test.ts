// __tests__/benchLabels.test.ts
import { describe, it, expect } from 'vitest';
import { benchClip } from '@/lib/video/benchLabels';
import { mediaAtClock } from '@/lib/video/overlayTimeline';

describe('benchClip', () => {
  const rim = { x: 0.5, y: 0.3, width: 0.1, tilt: 0.2 };
  const call = { made: true, confident: true };
  const shots = [
    { t: 4100, made: true, called: call },
    // Called a miss, corrected to a make in review: the label is the correction
    { t: 9000, made: true, called: { made: false, confident: false } },
    { t: 15_000, made: false, called: call },
    // Added by hand: stamped with the end of the run, so not a real time
    { t: 60_000, made: true, called: null },
  ];

  it('labels the checked calls at their times in the video, and leaves out hand-added shots', () => {
    const clip = benchClip({ shots, rim, toVideoMs: (t) => t, id: 'owner-1', extension: 'webm', note: 'test' });
    expect(clip).toMatchObject({ id: 'owner-1', file: 'owner-1.webm', makes: [4.1, 9], attempts: [4.1, 9, 15], untimed: 1 });
  });

  it('gives the rim as the two taps the bench takes, following its tilt', () => {
    const clip = benchClip({ shots, rim, toVideoMs: (t) => t, id: 'x', extension: 'mp4', note: '' });
    expect(clip.rim).toEqual([0.45, 0.29, 0.55, 0.31]);
  });

  it('puts shots after a re-aim at their place in the recording', () => {
    const gaps = [{ at: 5000, ms: 3000 }];
    const clip = benchClip({ shots, rim, toVideoMs: (t) => mediaAtClock(gaps, t), id: 'x', extension: 'mp4', note: '' });
    expect(clip.attempts).toEqual([4.1, 12, 18]);
  });
});
