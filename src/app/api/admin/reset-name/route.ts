// src/app/api/admin/reset-name/route.ts
// Owner only: resets a player's display name to "Player". For the rude names
// the filter (src/lib/nameFilter.ts, 00044) does not catch. Used from the
// player card, /players/[id].
import { checkIsOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!(await checkIsOwner().catch(() => false))) {
    return Response.json({ error: 'Not allowed.' }, { status: 403 });
  }
  const body = (await request.json().catch(() => null)) as { userId?: unknown } | null;
  const userId = typeof body?.userId === 'string' ? body.userId : '';
  if (!UUID.test(userId)) return Response.json({ error: 'No player given.' }, { status: 400 });

  const { error } = await createAdminClient().from('profiles').update({ display_name: 'Player' }).eq('id', userId);
  if (error) return Response.json({ error: 'The name could not be reset. Try again.' }, { status: 500 });
  return Response.json({ ok: true });
}
