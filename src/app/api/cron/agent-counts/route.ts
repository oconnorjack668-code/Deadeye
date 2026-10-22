// src/app/api/cron/agent-counts/route.ts
// Every Monday at 08:30 Irish time, before the 9:00 Agent OS run: works out this week's funnel and
// problem counts and saves them to docs/agent-os/data/ on the agent branch in
// GitHub, so the agents get fresh numbers without the founder pasting them.
// Agents never touch the database; only these counts leave it.
//
// Protected by CRON_SECRET (sent by Vercel Cron). Scheduled at 07:30 and 08:30
// UTC; only the one that is 08:30 in Ireland works (isIrishRunHour). Needs AGENT_DATA_GITHUB_TOKEN (githubFile.ts),
// a fine-grained GitHub token for this one repository with Contents read and
// write, and nothing else. AGENT_DATA_REPO and AGENT_DATA_BRANCH default to
// oconnorjack668-code/deadeye and agent-os.
import { createAdminClient } from '@/lib/supabase/admin';
import { loadClubCounts, loadFunnel } from '@/lib/funnel-server';
import { countsFile, countsPath, isIrishRunHour, type ReportCounts } from '@/lib/agentCounts';
import { saveToGitHub } from '@/lib/githubFile';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function reportCounts(): Promise<ReportCounts> {
  const admin = createAdminClient();
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const count = async (q: PromiseLike<{ count: number | null }>) => (await q).count ?? 0;
  const [reportsNew, reportsOpen, crashesOpen] = await Promise.all([
    count(admin.from('player_reports').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo)),
    count(admin.from('player_reports').select('id', { count: 'exact', head: true }).eq('resolved', false)),
    count(admin.from('app_errors').select('id', { count: 'exact', head: true }).eq('resolved', false)),
  ]);
  return { reportsNew, reportsOpen, crashesOpen };
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Not allowed.' }, { status: 401 });
  }
  // ?now=1 runs it at once, for a check by hand with the secret
  if (!isIrishRunHour(new Date()) && new URL(request.url).searchParams.get('now') !== '1') {
    return Response.json({ skipped: 'Not 08:30 in Ireland; the other Monday run does the work.' });
  }

  const [everyone, week] = await Promise.all([loadFunnel(0), loadFunnel(7)]);
  if ('problem' in everyone || 'problem' in week) {
    return Response.json({ error: 'problem' in everyone ? everyone.problem : (week as { problem: string }).problem }, { status: 500 });
  }
  const { date, path } = countsPath(new Date());
  // Club numbers are a bonus: if they fail, the funnel file still goes out
  const [reports, clubs] = await Promise.all([reportCounts(), loadClubCounts()]);
  const file = countsFile(date, everyone.funnel, week.funnel, reports, 'problem' in clubs ? undefined : clubs);
  const saved = await saveToGitHub(path, file, `Weekly counts for the Agent OS, ${date}`);
  if (!saved.ok) return Response.json({ error: saved.error }, { status: 502 });
  return Response.json({ saved: path });
}
