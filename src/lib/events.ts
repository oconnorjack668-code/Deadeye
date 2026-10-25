// src/lib/events.ts
// The steps a new player reaches that leave nothing else in the database
// (00045_app_events.sql). Saved sessions are already in training_sessions, so
// they are counted from there, not recorded here. The owner reads the counts
// at /admin/funnel.

export const EVENT_NAMES = [
  /** Tapped sign-up under the landing page demo, then reached the welcome screen */
  'signup_from_demo',
  'welcome_seen',
  /** Picked "Yes, I'm at a court" on the welcome screen */
  'welcome_court',
  /** Picked "Not right now" on the welcome screen */
  'welcome_later',
  'sample_played',
  'sample_finished',
  'tracker_opened',
  /** Picked the camera or a video, and is setting the rim */
  'tracker_setup',
  'tracker_started',
  /** Reached the results, whether or not they then saved */
  'tracker_finished',
  'tracker_saved',
  /** Opened the shot logger, to track every shot or to enter totals */
  'log_opened',
  /** Pressed Finish with something logged, so the Finish panel opened */
  'log_finish_opened',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

/**
 * Visitors to the landing page are not signed in, so nothing can be recorded
 * against them there. Tapping sign-up under the demo leaves this mark on the
 * device instead, and the welcome screen records it once the account exists.
 */
const FROM_DEMO_KEY = 'deadeye-from-demo';

export function markFromDemo(): void {
  try {
    localStorage.setItem(FROM_DEMO_KEY, '1');
  } catch {
    // Storage blocked: that sign-up just is not counted as from the demo
  }
}

/** On the welcome screen: records signup_from_demo once, if this device came from the demo. */
export function trackIfFromDemo(): void {
  try {
    if (localStorage.getItem(FROM_DEMO_KEY) !== '1') return;
    localStorage.removeItem(FROM_DEMO_KEY);
  } catch {
    return;
  }
  track('signup_from_demo');
}

export function isEventName(value: unknown): value is EventName {
  return typeof value === 'string' && (EVENT_NAMES as readonly string[]).includes(value);
}

/**
 * Records that the signed-in player reached a step. Fire and forget: it never
 * throws and never holds anything up, and keepalive lets it finish when the
 * step is a page change. The server keeps one row per player, step and day.
 */
export function track(name: EventName): void {
  if (typeof window === 'undefined') return;
  try {
    fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // An event is never worth an error on the player's screen
  }
}
