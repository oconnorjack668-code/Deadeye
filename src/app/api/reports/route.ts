// src/app/api/reports/route.ts
// What players tell us themselves: feedback, ideas and problems (Send feedback
// or report a problem in Settings, and Report a problem on the crash screen).
// The kind is stored with it (00067), problem when none is sent. Stored in
// player_reports (00038); the owner reads them at /admin/errors. Unlike /api/errors this needs a signed-in player: it is free
// text, and an open form on the website would collect spam rather than bugs.
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseReportKind } from '@/lib/reportKinds';

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
  if (!message) return Response.json({ error: 'Write something first.' }, { status: 400 });
  const kind = parseReportKind(body?.kind);
  if (!kind) return Response.json({ error: 'Choose feedback, idea or problem.' }, { status: 400 });

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
    // Left to the column default (problem) when it is one, so a crash-screen
    // report still saves if this code is live before migration 00067 runs
    ...(kind === 'problem' ? {} : { kind }),
  });
  if (error) return Response.json({ error: 'Your report could not be sent. Please try again.' }, { status: 500 });
  return Response.json({ ok: true }, { status: 201 });
}
