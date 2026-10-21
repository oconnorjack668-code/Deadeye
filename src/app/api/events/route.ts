// src/app/api/events/route.ts
// Records a step a signed-in player reached (src/lib/events.ts) in app_events
// (00045). One row per player, step and day: a repeat the same day is ignored,
// which is also what stops one player filling the table.
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { isEventName } from '@/lib/events';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return new Response(null, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return new Response(null, { status: 503 });

  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  if (!isEventName(body?.name)) return new Response(null, { status: 400 });

  const { error } = await createAdminClient()
    .from('app_events')
    .upsert({ user_id: user.id, name: body.name }, { onConflict: 'user_id,name,day', ignoreDuplicates: true });
  // Before 00045 is run the table is missing; the player is not told either way
  if (error) return new Response(null, { status: 500 });
  return new Response(null, { status: 204 });
}
