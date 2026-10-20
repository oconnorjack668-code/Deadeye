// src/components/Avatar.tsx
import React from 'react';
import { AVATAR_COLORS, isAvatarColor, isAvatarEmoji } from '@/lib/avatars';

/**
 * A player's avatar: their photo if the viewer may see it, else their emoji on
 * its colour, else the first letter of their name.
 */
export function Avatar({
  name,
  emoji,
  color,
  photoUrl,
  size = 48,
  className = '',
}: {
  name: string;
  emoji?: string | null;
  color?: string | null;
  photoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const box = { width: size, height: size };
  if (photoUrl) {
    return (
      // A short-lived signed link, so next/image would only add a cache that outlives it
      // eslint-disable-next-line @next/next/no-img-element
      <img src={photoUrl} alt={name} style={box} className={`flex-shrink-0 rounded-full object-cover ring-2 ring-zinc-700 ${className}`} />
    );
  }
  const tone = AVATAR_COLORS[isAvatarColor(color) ? color : 'zinc'];
  return (
    <span
      role="img"
      aria-label={name}
      style={{ ...box, fontSize: size * 0.5 }}
      className={`flex flex-shrink-0 items-center justify-center rounded-full ring-2 ${tone} ${className}`}
    >
      {isAvatarEmoji(emoji) ? emoji : <span className="font-black text-orange-300">{name.charAt(0).toUpperCase()}</span>}
    </span>
  );
}
