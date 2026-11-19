// src/app/api/admin/competition/export/route.ts
// Owner only: the founding competition entries as CSV, for judging offline.
// Names only with ?names=1, since entries are judged without them (rules
// section 7). Parent emails are never in the file.
import { checkIsOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { judgingCsv, type JudgingRow } from '@/lib/competition';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  if (!(await checkIsOwner().catch(() => false))) return new Response('Not found', { status: 404 });
  const withNames = new URL(request.url).searchParams.get('names') === '1';

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('competition_entries')
    .select('id, user_id, kind, club_name, feedback, status, winner, created_at')
    .order('kind')
    .order('created_at')
    .limit(5000);
  if (error) return new Response('Could not load entries. Has migration 00067 been run?', { status: 500 });

  let names = new Map<string, string>();
  if (withNames && data?.length) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, display_name')
      .in('id', [...new Set(data.map((r) => r.user_id))]);
    names = new Map((profiles ?? []).map((p) => [p.id, p.display_name ?? '']));
  }

  const rows: JudgingRow[] = (data ?? []).map((r) => ({
    ref: r.id.slice(0, 8),
    kind: r.kind,
    name: r.kind === 'club' ? r.club_name : names.get(r.user_id) ?? null,
    feedback: r.feedback,
    status: r.status,
    created_at: r.created_at,
    winner: r.winner,
  }));

  return new Response(judgingCsv(rows, withNames), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="competition-entries${withNames ? '-with-names' : ''}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
