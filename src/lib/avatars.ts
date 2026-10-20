// src/lib/avatars.ts
// Avatars: an emoji on a colour that anyone can pick, and an optional photo.
//
// The photo is optional and comes with a choice of who sees it. A player 16 or
// over consents for themselves. Under 16, a parent approves the photo and who
// can see it before anyone else does (00043), and widening who sees it later
// needs a parent again; narrowing it never does. The emoji list matches the
// check on profiles.avatar_emoji, so a player card can never carry words.

/** Must match profiles_avatar_emoji_check in 00043 exactly. */
export const AVATAR_EMOJIS = ['🏀', '🔥', '⚡', '🎯', '👑', '🦅', '🐐', '🚀', '💪', '🌟', '🐺', '🦁', '🐉', '☄️', '🏆', '🧊'] as const;

/** Must match profiles_avatar_color_check in 00043. Full class names so Tailwind keeps them. */
export const AVATAR_COLORS = {
  orange: 'bg-orange-500/25 ring-orange-500/40',
  red: 'bg-red-500/25 ring-red-500/40',
  amber: 'bg-amber-400/25 ring-amber-400/40',
  emerald: 'bg-emerald-500/25 ring-emerald-500/40',
  sky: 'bg-sky-500/25 ring-sky-500/40',
  blue: 'bg-blue-500/25 ring-blue-500/40',
  violet: 'bg-violet-500/25 ring-violet-500/40',
  pink: 'bg-pink-500/25 ring-pink-500/40',
  zinc: 'bg-zinc-600/40 ring-zinc-500/40',
} as const;

export type AvatarColor = keyof typeof AVATAR_COLORS;

export function isAvatarEmoji(value: unknown): value is (typeof AVATAR_EMOJIS)[number] {
  return AVATAR_EMOJIS.includes(value as (typeof AVATAR_EMOJIS)[number]);
}

export function isAvatarColor(value: unknown): value is AvatarColor {
  // Own keys only: 'in' would also say yes to 'constructor' and 'toString'
  return typeof value === 'string' && Object.hasOwn(AVATAR_COLORS, value);
}

export type PhotoVisibility = 'everyone' | 'friends' | 'me';

/** Widest last, so the order is also how much each one shows. */
export const PHOTO_VISIBILITY: Array<{ id: PhotoVisibility; label: string; hint: string }> = [
  { id: 'me', label: 'Only me', hint: 'Nobody else sees it. Everyone else sees your emoji.' },
  { id: 'friends', label: 'Friends and teammates', hint: 'Players you have added, and players on your teams.' },
  { id: 'everyone', label: 'Everyone', hint: 'Anyone who can open your player card.' },
];

export function isPhotoVisibility(value: unknown): value is PhotoVisibility {
  return value === 'everyone' || value === 'friends' || value === 'me';
}

const REACH: Record<PhotoVisibility, number> = { me: 0, friends: 1, everyone: 2 };

/**
 * Whether changing who sees a photo needs a parent again. Only for a player
 * under 16, and only when the photo would be shown to more people than the
 * parent agreed to.
 */
export function widensVisibility(from: PhotoVisibility, to: PhotoVisibility): boolean {
  return REACH[to] > REACH[from];
}

/** The largest photo the server accepts, after the phone has shrunk it. */
export const MAX_PHOTO_BYTES = 512 * 1024;

/** Whether bytes are a JPEG, by its first three bytes, whatever the upload claims. */
export function looksLikeJpeg(bytes: Uint8Array): boolean {
  return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}
