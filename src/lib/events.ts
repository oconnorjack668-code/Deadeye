// src/lib/events.ts
// The steps a new player reaches that leave nothing else in the database
// (00045_app_events.sql). Saved sessions are already in training_sessions, so
// they are counted from there, not recorded here. The owner reads the counts
// at /admin/funnel.

export const EVENT_NAMES = [
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
  /** Saved their training days, or turned reminders on, on a reminders card */
  'reminder_set',
  /** Opened a play from the plays library on the IQ tab */
  'play_opened',
  /** Finished the role quiz on a play (all three questions, answers saved) */
  'play_quiz_done',
  /** A coach saved a new play they drew or copied in the play editor */
  'play_drawn',
  /** Opened a film clip on the IQ tab (the clip page, before tapping play) */
  'film_opened',
  /** Answered every question on a film clip, and the attempt was saved */
  'film_done',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

// Nothing is recorded for visitors who are not signed in, and nothing is put on
// their device to count them later: the old landing-demo mark in localStorage
// needed ePrivacy consent (safety review of PR #97, F4). Where a player heard
// about Deadeye comes from the optional sign-up question (src/lib/heardFrom.ts).

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
