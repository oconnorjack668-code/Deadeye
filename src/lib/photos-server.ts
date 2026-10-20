// src/lib/photos-server.ts
// SERVER-ONLY: short-lived links to profile photos in the private avatars
// bucket (00043). Only called after player_card, or the player themselves, has
// said the viewer may see the photo.
import { createAdminClient } from '@/lib/supabase/admin';

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
