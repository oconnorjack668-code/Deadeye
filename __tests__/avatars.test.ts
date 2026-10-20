// __tests__/avatars.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { AVATAR_COLORS, AVATAR_EMOJIS, isAvatarColor, isAvatarEmoji, looksLikeJpeg, widensVisibility } from '@/lib/avatars';

const migration = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '00043_avatars_photos_levels.sql'), 'utf8');

describe('avatars', () => {
  it('offers exactly the emojis and colours the database accepts', () => {
    // A mismatch would let a player pick an avatar that then fails to save
    const emojiCheck = migration.match(/avatar_emoji IN \(([\s\S]*?)\)/)?.[1] ?? '';
    const inSql = [...emojiCheck.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    expect(inSql).toEqual([...AVATAR_EMOJIS]);
    const colourCheck = migration.match(/avatar_color IN \(([\s\S]*?)\)/)?.[1] ?? '';
    expect([...colourCheck.matchAll(/'([^']+)'/g)].map((m) => m[1])).toEqual(Object.keys(AVATAR_COLORS));
  });

  it('accepts only listed emojis and colours', () => {
    expect(isAvatarEmoji('🏀')).toBe(true);
    expect(isAvatarEmoji('hello')).toBe(false);
    expect(isAvatarColor('violet')).toBe(true);
    expect(isAvatarColor('constructor')).toBe(false);
  });

  it('asks a parent again only when a photo would be shown to more people', () => {
    expect(widensVisibility('friends', 'everyone')).toBe(true);
    expect(widensVisibility('me', 'friends')).toBe(true);
    expect(widensVisibility('everyone', 'friends')).toBe(false);
    expect(widensVisibility('friends', 'me')).toBe(false);
    expect(widensVisibility('friends', 'friends')).toBe(false);
  });

  it('knows a JPEG by its bytes, not its name', () => {
    expect(looksLikeJpeg(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toBe(true);
    expect(looksLikeJpeg(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d]))).toBe(false);
  });
});
