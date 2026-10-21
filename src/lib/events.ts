// src/lib/events.ts
// The steps a new player reaches that leave nothing else in the database
// (00045_app_events.sql). Saved sessions are already in training_sessions, so
// they are counted from there, not recorded here. The owner reads the counts
// at /admin/funnel.

export const EVENT_NAMES = [
  'welcome_seen',
  'sample_played',
  'sample_finished',
  'tracker_opened',
  /** Picked the camera or a video, and is setting the rim */
  'tracker_setup',
  'tracker_started',
  /** Reached the results, whether or not they then saved */
  'tracker_finished',
  'tracker_saved',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

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
