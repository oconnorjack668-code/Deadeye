// src/lib/leaderboard-server.ts
// SERVER-ONLY: the avatar and level for each row on a leaderboard.
//
// Profiles and levels are readable only by their owner (00024, 00043), so this
// uses the service role. That shows nothing new: it is only ever given the
// user_ids leaderboard_page() already returned, and every one of those is
// public, a friend, a teammate or the viewer, which is exactly who player_card()
// shows the emoji and level to. Photos have their own approval and visibility
// rules, so they are asked for under the viewer's session instead
// (visible_photo_paths, 00049), and a row only gets one this viewer may see.
import { createAdminClient } from '@/lib/supabase/admin';
import type { createClient } from '@/lib/supabase/server';
import { visiblePhotoUrls } from '@/lib/photos-server';

export interface RowLook {
  emoji: string | null;
  color: string | null;
  level: number | null;
  photoUrl: string | null;
}

export async function leaderboardLooks(
  viewer: Awaited<ReturnType<typeof createClient>>,
  userIds: string[]
): Promise<Map<string, RowLook>> {
  const looks = new Map<string, RowLook>();
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return looks;
  try {
    const admin = createAdminClient();
    const [{ data: profiles }, { data: levels }, photos] = await Promise.all([
      admin.from('profiles').select('id, avatar_emoji, avatar_color').in('id', ids),
      admin.from('player_levels').select('user_id, level').in('user_id', ids),
      visiblePhotoUrls(viewer, ids),
    ]);
    const levelOf = new Map((levels || []).map((l) => [l.user_id, l.level]));
    for (const p of profiles || []) {
      looks.set(p.id, {
        emoji: p.avatar_emoji,
        color: p.avatar_color,
        level: levelOf.get(p.id) ?? null,
        photoUrl: photos.get(p.id) ?? null,
      });
    }
  } catch {
    // No service key, or 00043 not run yet: rows fall back to the first letter of the name
  }
  return looks;
}
