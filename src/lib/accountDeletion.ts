// src/lib/accountDeletion.ts
// SERVER-ONLY: permanently deletes an account. Every table references
// auth.users with ON DELETE CASCADE, so deleting the auth user removes all
// rows; uploaded videos live in storage and are removed first.
import type { createAdminClient } from './supabase/admin';

type Admin = ReturnType<typeof createAdminClient>;

export async function deleteAccount(admin: Admin, userId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  // Remove the player's video files (stored under videos/<user_id>/)
  for (;;) {
    const { data: files, error } = await admin.storage.from('videos').list(userId, { limit: 100 });
    if (error) {
      console.error('Account deletion: listing videos failed', error);
      return { ok: false, error: 'Could not delete your videos. Please try again.' };
    }
    if (!files || files.length === 0) break;
    const { error: removeError } = await admin.storage.from('videos').remove(files.map((f) => `${userId}/${f.name}`));
    if (removeError) {
      console.error('Account deletion: removing videos failed', removeError);
      return { ok: false, error: 'Could not delete your videos. Please try again.' };
    }
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) {
    console.error('Account deletion failed', deleteError);
    return { ok: false, error: 'Could not delete your account. Please try again.' };
  }
  return { ok: true };
}
