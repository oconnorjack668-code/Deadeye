// src/app/api/reports/route.ts
// Problems players report themselves (Report a problem in Settings, and on the
// crash screen). Stored in player_reports (00038); the owner reads them at
// /admin/errors. Unlike /api/errors this needs a signed-in player: it is free
// text, and an open form on the website would collect spam rather than bugs.
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/** Reports one player can send in a day. Generous for real problems, a wall for a stuck button. */
const DAILY_REPORT_LIMIT = 10;

const clip = (value: unknown, max: number) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);

export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return Response.json({ error: 'Log in to Deadeye to send a report.' }, { status: 401 });
  // Without the service key nothing can be stored, and saying "sent" would be a lie
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Reports cannot be sent right now. Please try again later.' }, { status: 503 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const message = clip(body?.message, 1000);
  if (!message) return Response.json({ error: 'Tell us what went wrong first.' }, { status: 400 });

  const admin = createAdminClient();
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin
    .from('player_reports')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .gte('created_at', since);
  if ((count || 0) >= DAILY_REPORT_LIMIT) {
    return Response.json(
      { error: `That is ${DAILY_REPORT_LIMIT} reports today, thank you. Send any more tomorrow.` },
      { status: 429 }
    );
  }

  const { error } = await admin.from('player_reports').insert({
    user_id: user.id,
    message,
    context: clip(body?.context, 300),
    url: clip(body?.url, 500),
    user_agent: clip(request.headers.get('user-agent'), 300),
  });
  if (error) return Response.json({ error: 'Your report could not be sent. Please try again.' }, { status: 500 });
  return Response.json({ ok: true }, { status: 201 });
}
