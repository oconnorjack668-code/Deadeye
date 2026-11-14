// src/app/api/focus/plan/[id]/route.ts
// Delete one saved Focus Finder plan (GDPR Art 17, from the 13 Nov safety
// review). ai_reports has no DELETE policy for players, so the server checks
// the plan is the signed-in player's own Focus plan through RLS first, then
// deletes exactly that row with the service role. Other report types (session
// feedback, weekly reports) are not deletable here.
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function DELETE(_request: Request, ctx: RouteContext<'/api/focus/plan/[id]'>) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });

  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: 'Plan not found.' }, { status: 404 });

  // Row level security: only the player's own reports are visible
  const supabase = await createClient();
  const { data: own } = await supabase
    .from('ai_reports')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('report_type', 'development_plan')
    .maybeSingle();
  if (!own) return Response.json({ error: 'Plan not found.' }, { status: 404 });

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch {
    return Response.json({ error: 'Deleting plans is not available right now.' }, { status: 503 });
  }
  const { error } = await admin
    .from('ai_reports')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .eq('report_type', 'development_plan');
  if (error) return Response.json({ error: 'Could not delete the plan.' }, { status: 500 });
  return Response.json({ ok: true });
}
