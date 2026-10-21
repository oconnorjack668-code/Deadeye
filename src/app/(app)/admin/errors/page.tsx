// src/app/(app)/admin/errors/page.tsx
// Owner-only viewer for what goes wrong: problems players report themselves
// (/api/reports, 00038) and crash reports (/api/errors and src/instrumentation.ts).
import React from 'react';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { checkIsOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { Bug, CheckCircle2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'App errors - Deadeye' };

interface ErrorRow {
  id: string;
  created_at: string;
  user_id: string | null;
  source: string;
  message: string;
  stack: string | null;
  digest: string | null;
  url: string | null;
  user_agent: string | null;
}

interface ReportRow {
  id: string;
  created_at: string;
  message: string;
  context: string | null;
  url: string | null;
  user_agent: string | null;
}

async function markReportRead(formData: FormData) {
  'use server';
  if (!(await checkIsOwner())) return;
  const id = String(formData.get('id') || '');
  if (!id) return;
  await createAdminClient().from('player_reports').update({ resolved: true }).eq('id', id);
  revalidatePath('/admin/errors');
}

/** In Irish time: this renders on the server, which runs in UTC, so 16:05 in Dublin showed as 15:05. */
function when(iso: string): string {
  return new Date(iso).toLocaleString('en-IE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: process.env.APP_TIME_ZONE || 'Europe/Dublin',
  });
}

async function markResolved(formData: FormData) {
  'use server';
  if (!(await checkIsOwner())) return;
  const message = String(formData.get('message') || '');
  if (!message) return;
  await createAdminClient().from('app_errors').update({ resolved: true }).eq('message', message).eq('resolved', false);
  revalidatePath('/admin/errors');
}

function device(userAgent: string | null): string {
  if (!userAgent) return 'unknown device';
  if (/iPhone|iPad/.test(userAgent)) return 'iPhone/iPad';
  if (/Android/.test(userAgent)) return 'Android';
  if (/Windows/.test(userAgent)) return 'Windows';
  if (/Mac OS/.test(userAgent)) return 'Mac';
  return 'other';
}

export default async function AdminErrorsPage() {
  if (!(await checkIsOwner())) notFound();

  let rows: ErrorRow[] = [];
  let loadError: string | null = null;
  try {
    const { data, error } = await createAdminClient()
      .from('app_errors')
      .select('id, created_at, user_id, source, message, stack, digest, url, user_agent')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) loadError = error.message;
    rows = (data || []) as ErrorRow[];
  } catch (e) {
    loadError = e instanceof Error ? e.message : 'Could not load errors';
  }

  // Loaded separately, so a missing 00038 does not hide the crash reports
  let reports: ReportRow[] = [];
  let reportsError: string | null = null;
  try {
    const { data, error } = await createAdminClient()
      .from('player_reports')
      .select('id, created_at, message, context, url, user_agent')
      .eq('resolved', false)
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) reportsError = error.message;
    reports = (data || []) as ReportRow[];
  } catch (e) {
    reportsError = e instanceof Error ? e.message : 'Could not load reports';
  }

  // Group identical messages so one bug hitting many players shows once
  const groups = new Map<string, { latest: ErrorRow; count: number; players: Set<string>; pages: Set<string> }>();
  for (const row of rows) {
    const g = groups.get(row.message) || { latest: row, count: 0, players: new Set<string>(), pages: new Set<string>() };
    g.count += 1;
    if (row.user_id) g.players.add(row.user_id);
    if (row.url) g.pages.add(row.url.split('?')[0]);
    groups.set(row.message, g);
  }
  const list = [...groups.values()].sort((a, b) => b.count - a.count);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-red-600/20 flex items-center justify-center">
            <Bug className="h-6 w-6 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white">App errors</h1>
            <p className="text-sm text-zinc-400">
              Problems players report, and crashes they hit. Both are kept for 90 days. Only you can see this.
            </p>
          </div>
        </div>

        {/* Player reports first: each is one person who took the time to say
            what went wrong, so they are listed one by one, never grouped */}
        <section id="reports" className="scroll-mt-4 space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Player reports</h2>
          {reportsError ? (
            <p className="rounded-xl border border-amber-600/40 bg-amber-600/10 p-3 text-sm text-amber-200">
              Could not load player reports: {reportsError}. Has migration 00038_player_reports.sql been run in Supabase?
            </p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-zinc-500">No new reports. Players send them from Settings, or from the crash screen.</p>
          ) : (
            reports.map((r) => (
              <div key={r.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <p className="whitespace-pre-wrap break-words text-sm text-zinc-100">{r.message}</p>
                {r.context && <p className="mt-2 break-words text-xs text-zinc-400">{r.context}</p>}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-zinc-500">
                    {(r.url || 'unknown page').split('?')[0]} · {when(r.created_at)} · {device(r.user_agent)}
                  </p>
                  <form action={markReportRead}>
                    <input type="hidden" name="id" value={r.id} />
                    <button type="submit" className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700">
                      Mark read
                    </button>
                  </form>
                </div>
              </div>
            ))
          )}
        </section>

        <h2 id="crashes" className="scroll-mt-4 pt-2 text-sm font-bold uppercase tracking-wide text-zinc-400">Crashes</h2>

        {loadError && (
          <p className="rounded-xl border border-amber-600/40 bg-amber-600/10 p-3 text-sm text-amber-200">
            Could not load errors: {loadError}. Has migration 00020_app_errors.sql been run in Supabase?
          </p>
        )}

        {!loadError && list.length === 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-2" />
            <p className="font-semibold text-white">No open errors</p>
            <p className="text-sm text-zinc-400">Nice. New crashes will show up here automatically.</p>
          </div>
        )}

        {list.map(({ latest, count, players, pages }) => (
          <details key={latest.message} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <summary className="cursor-pointer list-none">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-red-300 break-words">{latest.message}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {latest.source} · {[...pages].slice(0, 3).join(', ') || 'unknown page'} · last {when(latest.created_at)} ·{' '}
                    {device(latest.user_agent)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-lg font-black text-white">{count}×</div>
                  <div className="text-[11px] text-zinc-500">{players.size} {players.size === 1 ? 'player' : 'players'}</div>
                </div>
              </div>
            </summary>
            {latest.stack && (
              <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-zinc-950 p-3 text-[11px] text-zinc-400 whitespace-pre-wrap">{latest.stack}</pre>
            )}
            {latest.digest && <p className="mt-2 text-xs text-zinc-500">Digest: {latest.digest}</p>}
            <form action={markResolved} className="mt-3">
              <input type="hidden" name="message" value={latest.message} />
              <button type="submit" className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700">
                Mark fixed
              </button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
