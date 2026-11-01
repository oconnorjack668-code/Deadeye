// src/app/(app)/admin/tracker/page.tsx
// Owner-only: how accurate the shot tracker is on players' own sessions.
//
// Every session saved from the tracker keeps the tracker's call next to the
// player's corrected one (src/lib/video/trackedShots.ts), so each is a
// labelled run measured on a real phone, at a real court. This adds them up.
// The two bench clips stay the way to test a change; this is the way to see
// whether it helped anyone.
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { checkIsOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/layout/PageHeader';
import { parseSummary, totalAccuracy, type AccuracyTotals, type ShotTrackingSummary } from '@/lib/video/trackedShots';
import { Crosshair } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tracker accuracy - Deadeye' };

const WINDOWS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

/** Enough runs to be worth reading, few enough to add up in one request. */
const MAX_RUNS = 2000;

function pct(count: number, of: number): string {
  return of > 0 ? `${Math.round((count / of) * 100)}%` : '–';
}

async function load(days: number): Promise<ShotTrackingSummary[] | { problem: string }> {
  try {
    const since = new Date(Date.now() - days * 86_400_000).toISOString();
    const { data, error } = await createAdminClient()
      .from('video_analyses')
      .select('summary')
      .eq('kind', 'shot_tracking')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(MAX_RUNS);
    if (error) return { problem: error.message };
    return (data || []).map((r) => parseSummary(r.summary)).filter((s): s is ShotTrackingSummary => s !== null);
  } catch (e) {
    return { problem: e instanceof Error ? e.message : 'Could not load the sessions' };
  }
}

function Row({ label, total }: { label: string; total: AccuracyTotals }) {
  return (
    <div className="rounded-xl bg-zinc-950/60 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-white">{label}</span>
        <span className="text-xs text-zinc-500 tabular-nums">
          {total.runs} {total.runs === 1 ? 'session' : 'sessions'} · {total.shots} shots
        </span>
      </div>
      {total.runs === 0 ? (
        <p className="mt-1 text-sm text-zinc-500">No sessions saved with the tracker&apos;s calls yet.</p>
      ) : (
        <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-3">
          <div>
            <dt className="text-zinc-500">Called right</dt>
            <dd className="text-lg font-black tabular-nums text-emerald-400">{pct(total.right, total.shots)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Switched by player</dt>
            <dd className="text-lg font-black tabular-nums text-zinc-100">{pct(total.flipped, total.shots)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Never called</dt>
            <dd className="text-lg font-black tabular-nums text-zinc-100">{pct(total.added, total.shots)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Calls with no shot</dt>
            <dd className="text-lg font-black tabular-nums text-zinc-100">{pct(total.removed, total.calls)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Marked unsure</dt>
            <dd className="text-lg font-black tabular-nums text-amber-400">{pct(total.unsure, total.calls)}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Median frame rate</dt>
            <dd className="text-lg font-black tabular-nums text-zinc-100">
              {total.medianFps === null ? '–' : `${Math.round(total.medianFps)} fps`}
            </dd>
          </div>
        </dl>
      )}
      {total.unsure > 0 && (
        <p className="mt-2 text-sm text-zinc-500">
          Unsure calls the tracker guessed right: {pct(total.unsureRight, total.unsure)}. Runs under 12 fps: {total.slowRuns}.
        </p>
      )}
    </div>
  );
}

export default async function TrackerAccuracyPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  if (!(await checkIsOwner())) notFound();
  const asked = Number((await searchParams).days ?? 30);
  const days = WINDOWS.some((w) => w.days === asked) ? asked : 30;
  const result = await load(days);

  const groups: Array<{ label: string; filter: (s: ShotTrackingSummary) => boolean }> = [
    { label: 'Everything', filter: () => true },
    { label: 'Live camera', filter: (s) => s.source === 'camera' },
    { label: 'Video from the phone', filter: (s) => s.source === 'file' },
    { label: 'iPhone and iPad', filter: (s) => s.device?.os === 'ios' },
    { label: 'Android', filter: (s) => s.device?.os === 'android' },
    { label: 'Computers and other', filter: (s) => s.device?.os === 'other' },
  ];

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5">
        <PageHeader tone="hoops" icon={Crosshair} title="Tracker accuracy" subtitle="The tracker's calls against what players kept" />

        <div className="flex gap-1 rounded-xl bg-zinc-900 p-1">
          {WINDOWS.map((w) => (
            <Link
              key={w.days}
              href={`/admin/tracker?days=${w.days}`}
              className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold ${w.days === days ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
            >
              {w.label}
            </Link>
          ))}
        </div>

        {'problem' in result ? (
          <p className="rounded-2xl border border-amber-600/40 bg-amber-600/10 p-4 text-sm text-amber-300">{result.problem}</p>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <Row key={g.label} label={g.label} total={totalAccuracy(result.filter(g.filter))} />
            ))}
            <p className="text-sm text-zinc-500">
              Counted from sessions saved since the tracker began keeping its own calls. A player who saves without checking
              the list makes the tracker look better than it is, so read &ldquo;called right&rdquo; as an upper bound.
              {result.length >= MAX_RUNS ? ` Only the latest ${MAX_RUNS} sessions are counted.` : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
