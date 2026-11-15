// src/lib/heardFrom.ts
// "Where did you hear about Deadeye?": an optional question on the sign-up
// form, saved on the account as user_metadata.heard_from. The funnel counts
// joined, set up and 1st session by answer, so outreach can see which routes
// bring players who train (docs/agent-os/outreach/routes.md).
//
// The player gives the answer, so nothing is read from links or the device
// (safety review 2026-11-13, option A: a code in a link would fall under the
// ePrivacy rules). Fixed answers only, no free text, and nothing picked by
// default; anything not on the list is dropped on save and again on read,
// because players can edit their own user_metadata.

export const HEARD_FROM = [
  { value: 'friend', label: 'A friend or teammate' },
  { value: 'coach-club', label: 'A coach or my club' },
  { value: 'youth-club', label: 'A youth club or youth service' },
  { value: 'tiktok', label: 'TikTok' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'radio-press', label: 'Radio or a newspaper' },
  { value: 'event', label: 'A basketball event or camp' },
  { value: 'other', label: 'Somewhere else' },
] as const;

export type HeardFrom = (typeof HEARD_FROM)[number]['value'];

/** A listed answer (any case, spaces trimmed), or null for anything else */
export function normaliseHeardFrom(value: unknown): HeardFrom | null {
  if (typeof value !== 'string') return null;
  const v = value.trim().toLowerCase();
  return HEARD_FROM.some((h) => h.value === v) ? (v as HeardFrom) : null;
}

/**
 * Kept this long after sign-up, then cleared by the daily job (privacy page;
 * safety re-review of PR #97, F1): by then it has done its job of judging
 * outreach routes. Players can clear it sooner in Settings.
 */
export const HEARD_FROM_KEEP_DAYS = 365;

interface AccountForRetention {
  id: string;
  created_at: string;
  user_metadata?: Record<string, unknown> | null;
}

/** Accounts older than HEARD_FROM_KEEP_DAYS that still hold an answer (any value, listed or not) */
export function heardFromToClear(users: AccountForRetention[], now = new Date()): string[] {
  const cutoff = now.getTime() - HEARD_FROM_KEEP_DAYS * 86_400_000;
  return users
    .filter((u) => u.user_metadata?.heard_from != null && Date.parse(u.created_at) < cutoff)
    .map((u) => u.id);
}

/** The answer as the player saw it, or "Didn't say" */
export function heardFromLabel(value: string | null): string {
  return HEARD_FROM.find((h) => h.value === value)?.label ?? "Didn't say";
}
