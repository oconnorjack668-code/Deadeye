// src/lib/founderPosts.ts
// Posts from the founder to the players who follow them (00050): a challenge,
// a tip or an app update, in plain text. Shared by the posting screen and
// /api/founder/posts, which checks them again before saving.

export type FounderPostKind = 'challenge' | 'tip' | 'update';

export const FOUNDER_POST_KINDS: Array<{ id: FounderPostKind; label: string }> = [
  { id: 'challenge', label: 'Challenge' },
  { id: 'tip', label: 'Tip' },
  { id: 'update', label: 'App update' },
];

export const FOUNDER_POST_MAX = 500;

/** How long a post sent to everyone keeps showing as a notice on the dashboard (00054) */
export const FOUNDER_NOTICE_DAYS = 14;

/** The oldest a post can be and still show as a notice */
export function founderNoticeCutoff(now: Date = new Date()): string {
  return new Date(now.getTime() - FOUNDER_NOTICE_DAYS * 86_400_000).toISOString();
}

export interface FounderPost {
  id: string;
  kind: FounderPostKind;
  body: string;
  created_at: string;
  /** Sent to every player as a dashboard notice, not only to followers (00054) */
  everyone?: boolean;
}

export function postKindLabel(kind: string): string {
  return FOUNDER_POST_KINDS.find((k) => k.id === kind)?.label ?? 'Post';
}

/** The post to save, or what is wrong with it */
export function checkFounderPost(input: {
  kind?: unknown;
  body?: unknown;
  everyone?: unknown;
}): { kind: FounderPostKind; body: string; everyone?: true } | { error: string } {
  const kind = FOUNDER_POST_KINDS.find((k) => k.id === input.kind)?.id;
  if (!kind) return { error: 'Pick a challenge, a tip or an app update.' };
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (!body) return { error: 'Write something first.' };
  if (body.length > FOUNDER_POST_MAX) return { error: `Keep it to ${FOUNDER_POST_MAX} characters.` };
  // Only ever present when true, so a post to followers is saved exactly as before 00054
  return input.everyone === true ? { kind, body, everyone: true } : { kind, body };
}
