// src/app/(app)/admin/cron-runs/page.tsx
// Owner-only history of the scheduled jobs (cron_runs, 00056): when each one
// ran, whether it worked, and the numbers it answered with. Vercel keeps its
// own logs for about an hour on the Hobby plan; these rows are kept for a year.
import React from 'react';
import { notFound } from 'next/navigation';
import { checkIsOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { CRON_JOBS, type CronJob, type CronOutcome } from '@/lib/cronRuns';
import { Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Scheduled jobs - Deadeye' };

interface RunRow {
  id: string;
  job: string;
  started_at: string;
  duration_ms: number;
  status: number;
  outcome: CronOutcome;
  summary: unknown;
}

/** In Irish time: this renders on the server, which runs in UTC. */
function when(iso: string): string {
  return new Date(iso).toLocaleString('en-IE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: process.env.APP_TIME_ZONE || 'Europe/Dublin',
  });
}

const OUTCOME_STYLE: Record<CronOutcome, { label: string; className: string }> = {
  ok: { label: 'Worked', className: 'bg-emerald-600/20 text-emerald-300' },
  skipped: { label: 'Skipped', className: 'bg-zinc-800 text-zinc-300' },
  failed: { label: 'Failed', className: 'bg-red-600/20 text-red-300' },
};

/** The job's answer as label: value pairs; lists and nested values are shown as text. */
function summaryLines(summary: unknown): Array<[string, string]> {
  if (!summary || typeof summary !== 'object' || Array.isArray(summary)) return [];
  return Object.entries(summary as Record<string, unknown>).map(([key, value]) => [
    key,
    Array.isArray(value) ? value.map(String).join(' · ') : typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value),
  ]);
}

export default async function CronRunsPage() {
  if (!(await checkIsOwner())) notFound();

  let rows: RunRow[] = [];
  let loadError: string | null = null;
  try {
    const { data, error } = await createAdminClient()
      .from('cron_runs')
      .select('id, job, started_at, duration_ms, status, outcome, summary')
      .order('started_at', { ascending: false })
      .limit(200);
    if (error) loadError = error.message;
    rows = (data || []) as RunRow[];
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Could not load the runs';
  }

  const lastOf = (job: string) => rows.find((r) => r.job === job);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 flex-shrink-0 rounded-xl bg-sky-600/20 flex items-center justify-center">
            <Clock className="h-6 w-6 text-sky-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">Scheduled jobs</h1>
            <p className="text-sm text-zinc-400">
              Every run of the reminders, weekly report and agent counts, kept for a year. Only you can see this.
            </p>
          </div>
        </div>

        {loadError ? (
          <p className="rounded-xl border border-amber-600/40 bg-amber-600/10 p-3 text-sm text-amber-200">
            Could not load the runs: {loadError}. Has migration 00056_cron_runs.sql been run in Supabase?
          </p>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Last run of each job</h2>
              {(Object.keys(CRON_JOBS) as CronJob[]).map((job) => {
                const last = lastOf(job);
                return (
                  <div key={job} className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{CRON_JOBS[job].label}</p>
                      <p className="text-sm text-zinc-500">{CRON_JOBS[job].when}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {last ? (
                        <>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${OUTCOME_STYLE[last.outcome].className}`}>
                            {OUTCOME_STYLE[last.outcome].label}
                          </span>
                          <p className="mt-1 text-sm text-zinc-400">{when(last.started_at)}</p>
                        </>
                      ) : (
                        <p className="text-sm text-zinc-500">No runs saved yet</p>
                      )}
                    </div>
                  </div>
                );
              })}
              <p className="text-sm text-zinc-500">
                A refused call (wrong or missing CRON_SECRET) is not saved, so a scheduled day with no run here means the job
                did not run or was refused.
              </p>
            </section>

            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">All runs, newest first</h2>
              {rows.length === 0 ? (
                <p className="text-sm text-zinc-500">Nothing yet. Each job adds a row here the next time it runs.</p>
              ) : (
                rows.map((r) => {
                  const style = OUTCOME_STYLE[r.outcome] || OUTCOME_STYLE.failed;
                  const lines = summaryLines(r.summary);
                  return (
                    <div key={r.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-white">{CRON_JOBS[r.job as CronJob]?.label || r.job}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${style.className}`}>{style.label}</span>
                      </div>
                      <p className="mt-1 text-sm text-zinc-500">
                        {when(r.started_at)} · {(r.duration_ms / 1000).toFixed(1)}s · status {r.status}
                      </p>
                      {lines.length > 0 && (
                        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-xl bg-zinc-950/60 p-3 text-sm">
                          {lines.map(([key, value]) => (
                            <React.Fragment key={key}>
                              <dt className="text-zinc-400">{key}</dt>
                              <dd className="break-words text-zinc-200 tabular-nums">{value}</dd>
                            </React.Fragment>
                          ))}
                        </dl>
                      )}
                    </div>
                  );
                })
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
