// src/lib/photos-server.ts
// SERVER-ONLY: short-lived links to profile photos in the private avatars
// bucket (00043). Only called after player_card or visible_photo_paths (00049),
// or the player themselves, has said the viewer may see the photo.
import { createAdminClient } from '@/lib/supabase/admin';
import type { createClient } from '@/lib/supabase/server';

type ViewerClient = Awaited<ReturnType<typeof createClient>>;

/** An hour: long enough for a page visit, short enough that a copied link dies. */
const LINK_SECONDS = 60 * 60;

export async function signedPhotoUrl(path: string | null | undefined): Promise<string | null> {
  if (!path) return null;
  try {
    const { data } = await createAdminClient().storage.from('avatars').createSignedUrl(path, LINK_SECONDS);
    return data?.signedUrl ?? null;
  } catch {
    // No service key, or the bucket is missing before 00043: the emoji shows instead
    return null;
  }
}

/**
 * Links to the photos this viewer may see, for many players at once: the
 * leaderboard rows and the avatar in the top bar. visible_photo_paths (00049)
 * decides which, under the viewer's own session, with the same approval and
 * visibility rule as player_card. A player with no photo, or one this viewer
 * may not see, is left out and shows their emoji.
 */
export async function visiblePhotoUrls(viewer: ViewerClient, userIds: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return urls;
  try {
    const { data: rows, error } = await viewer.rpc('visible_photo_paths', { p_users: ids });
    if (error || !rows?.length) return urls;
    const { data: signed } = await createAdminClient()
      .storage.from('avatars')
      .createSignedUrls(rows.map((r) => r.path), LINK_SECONDS);
    const linkFor = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
    for (const row of rows) {
      const url = linkFor.get(row.path);
      if (url) urls.set(row.user_id, url);
    }
  } catch {
    // No service key, or 00049 not run yet: everyone shows their emoji
  }
  return urls;
}
