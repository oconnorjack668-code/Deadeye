import { describe, it, expect } from 'vitest';
import { createHealthMonitor } from '@/lib/video/liveHealth';

describe('live health', () => {
  it('is calm while frames come at speed and nothing is wrong', () => {
    const h = createHealthMonitor();
    for (let t = 0; t <= 6000; t += 33) h.frame(t, false, 120);
    expect(h.read()).toMatchObject({ ball: false, issues: [] });
    expect(h.read().fps).toBeGreaterThan(29);
  });

  it('shows the ball briefly after it is seen', () => {
    const h = createHealthMonitor();
    h.frame(0, true, null);
    h.frame(200, false, null);
    expect(h.read().ball).toBe(true);
    h.frame(600, false, null);
    expect(h.read().ball).toBe(false);
  });

  it('says when the phone is too slow, but not in the first seconds', () => {
    const h = createHealthMonitor();
    for (let t = 0; t <= 3000; t += 125) h.frame(t, false, null);
    expect(h.read().issues).toEqual([]);
    for (let t = 3125; t <= 8000; t += 125) h.frame(t, false, null);
    expect(h.read().issues).toContain('slow');
  });

  it('says when it is dark, the camera moved, or calls keep coming out unsure', () => {
    const h = createHealthMonitor();
    for (let t = 0; t < 5; t++) h.frame(t * 33, false, 20);
    h.setMoved(true);
    h.shot(false);
    h.shot(true);
    h.shot(false);
    h.shot(false);
    expect(h.read().issues).toEqual(['moved', 'dark', 'unsure']);
  });
});
