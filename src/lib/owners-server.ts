// src/lib/owners-server.ts
// SERVER-ONLY: which of these players is the Deadeye owner, for the Founder
// badge on the player card and the leaderboard. Read from the owner role in
// user_roles (00001), which only the server can write, so a display name can
// never fake it. Roles are readable only by their owner, so this uses the
// service role, and it says nothing but yes or no about players the viewer
// can already see.
import { createAdminClient } from '@/lib/supabase/admin';

export async function ownersAmong(userIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return new Set();
  try {
    const { data } = await createAdminClient().from('user_roles').select('user_id').eq('role', 'owner').in('user_id', ids);
    return new Set((data || []).map((r) => r.user_id));
  } catch {
    // No service key: nobody gets the badge
    return new Set();
  }
}
