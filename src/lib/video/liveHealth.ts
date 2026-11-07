// src/lib/video/liveHealth.ts
// What the live overlay should say about how the tracking is going.
//
// The overlay used to show "Looking for ball", pulsing amber, whenever no ball
// was in the air - which the tracker only reports for a ball in flight, under
// a tenth of the frames of a normal session. So it read as broken nearly all
// the time, from exactly the distance a player can't walk back from to check.
// Now the resting state is calm ("Watching the hoop"), a ball in the air
// shows as it is seen, and amber means something really is wrong - and says
// what: the phone too slow, the camera moved, too dark, or a run of calls the
// tracker could not make. Each is something the player can fix mid-session,
// rather than finding out at the end that the counts are off.

/** Frame rate below which shots start to fall between frames. Matches the review's warning. */
export const SLOW_FPS = 12;
/** The frame rate is judged over this much of the latest run. */
const FPS_WINDOW_MS = 5000;
/** Average brightness of the hoop picture (0..255) below which it is too dark to track well. */
export const DARK_LIGHT = 45;
/** Of the latest calls, this many unsure says the setup is the problem. */
const UNSURE_OF = 6;
const UNSURE_AT = 3;
/** The ball counts as in view for this long after it was last seen, so the badge does not flicker. */
const BALL_HOLD_MS = 350;

export type HealthIssue = 'slow' | 'moved' | 'dark' | 'unsure';

export interface HealthReading {
  /** A ball in flight was seen just now. */
  ball: boolean;
  /** Problems worth telling the player about, most urgent first. */
  issues: HealthIssue[];
  /** Frames scored a second over the latest window, or null this early in the run. */
  fps: number | null;
}

export const ISSUE_TEXT: Record<HealthIssue, { short: string; tip: string }> = {
  moved: { short: 'Camera moved', tip: 'The hoop has moved in the picture since you set the rim. Fix the rim so the calls stay right.' },
  slow: { short: 'Phone is slow', tip: 'Shots can be missed between frames. Close other apps, or film a clip and check it afterwards.' },
  dark: { short: 'Too dark', tip: 'The hoop is dim in the picture. More light, or a spot not facing a window, helps.' },
  unsure: { short: 'Hard to call', tip: 'Several shots in a row could not be called. A closer camera, better light or the rim set again usually fixes it.' },
};

export interface HealthMonitor {
  /** A scored frame at time t (ms), with whether a ball was found and the crop's brightness if measured. */
  frame(t: number, ball: boolean, light: number | null): void;
  /** A shot was called. */
  shot(confident: boolean): void;
  /** The camera watcher's state. */
  setMoved(moved: boolean): void;
  read(): HealthReading;
}

export function createHealthMonitor(): HealthMonitor {
  const times: number[] = [];
  let first: number | null = null;
  let lastBall = -Infinity;
  let now = 0;
  const lights: number[] = [];
  const calls: boolean[] = [];
  let moved = false;

  return {
    frame(t, ball, light) {
      now = t;
      if (first === null) first = t;
      times.push(t);
      while (times.length && times[0] < t - FPS_WINDOW_MS) times.shift();
      if (ball) lastBall = t;
      if (light !== null) {
        lights.push(light);
        if (lights.length > 5) lights.shift();
      }
    },
    shot(confident) {
      calls.push(confident);
      if (calls.length > UNSURE_OF) calls.shift();
    },
    setMoved(m) {
      moved = m;
    },
    read() {
      const issues: HealthIssue[] = [];
      if (moved) issues.push('moved');
      // Only once a whole window has gone by: the first second is all start-up
      const running = first !== null && now - first >= FPS_WINDOW_MS;
      const fps = running && times.length > 1 ? ((times.length - 1) * 1000) / (times[times.length - 1] - times[0] || 1) : null;
      if (fps !== null && fps < SLOW_FPS) issues.push('slow');
      if (lights.length >= 3) {
        const sorted = [...lights].sort((a, b) => a - b);
        if (sorted[Math.floor(sorted.length / 2)] < DARK_LIGHT) issues.push('dark');
      }
      if (calls.length >= UNSURE_AT && calls.filter((c) => !c).length >= UNSURE_AT) issues.push('unsure');
      return { ball: now - lastBall <= BALL_HOLD_MS, issues, fps };
    },
  };
}
