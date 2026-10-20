// src/lib/leaderboard-server.ts
// SERVER-ONLY: the emoji avatar and level for each row on a leaderboard.
//
// Profiles and levels are readable only by their owner (00024, 00043), so this
// uses the service role. That shows nothing new: it is only ever given the
// user_ids leaderboard_page() already returned, and every one of those is
// public, a friend, a teammate or the viewer, which is exactly who player_card()
// shows the emoji and level to. Photos are left out on purpose; they have their
// own approval and visibility rules and live on the player card.
import { createAdminClient } from '@/lib/supabase/admin';

export interface RowLook {
  emoji: string | null;
  color: string | null;
  level: number | null;
}

export async function leaderboardLooks(userIds: string[]): Promise<Map<string, RowLook>> {
  const looks = new Map<string, RowLook>();
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return looks;
  try {
    const admin = createAdminClient();
    const [{ data: profiles }, { data: levels }] = await Promise.all([
      admin.from('profiles').select('id, avatar_emoji, avatar_color').in('id', ids),
      admin.from('player_levels').select('user_id, level').in('user_id', ids),
    ]);
    const levelOf = new Map((levels || []).map((l) => [l.user_id, l.level]));
    for (const p of profiles || []) {
      looks.set(p.id, { emoji: p.avatar_emoji, color: p.avatar_color, level: levelOf.get(p.id) ?? null });
    }
  } catch {
    // No service key, or 00043 not run yet: rows fall back to the first letter of the name
  }
  return looks;
}
