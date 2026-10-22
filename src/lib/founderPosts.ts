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

export interface FounderPost {
  id: string;
  kind: FounderPostKind;
  body: string;
  created_at: string;
}

export function postKindLabel(kind: string): string {
  return FOUNDER_POST_KINDS.find((k) => k.id === kind)?.label ?? 'Post';
}

/** The post to save, or what is wrong with it */
export function checkFounderPost(input: { kind?: unknown; body?: unknown }): { kind: FounderPostKind; body: string } | { error: string } {
  const kind = FOUNDER_POST_KINDS.find((k) => k.id === input.kind)?.id;
  if (!kind) return { error: 'Pick a challenge, a tip or an app update.' };
  const body = typeof input.body === 'string' ? input.body.trim() : '';
  if (!body) return { error: 'Write something first.' };
  if (body.length > FOUNDER_POST_MAX) return { error: `Keep it to ${FOUNDER_POST_MAX} characters.` };
  return { kind, body };
}
