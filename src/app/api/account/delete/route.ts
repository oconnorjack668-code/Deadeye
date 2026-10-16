// src/app/api/account/delete/route.ts
// Permanently deletes the signed-in player's account (required by the App Store and Google Play).
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { deleteAccount } from '@/lib/accountDeletion';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: 'Please log in again.' }, { status: 401 });
  }

  const result = await deleteAccount(createAdminClient(), user.id);
  if (!result.ok) return Response.json({ error: result.error }, { status: 500 });

  return Response.json({ deleted: true });
}
