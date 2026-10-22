// src/app/(app)/admin/funnel/page.tsx
// Owner-only: how far the players who joined recently got (src/lib/funnel.ts).
// Joining and sessions come from the tables they already live in; the welcome
// and tracker steps come from app_events (00045).
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { checkIsOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { testAccountEmails } from '@/lib/testAccounts';
import { PageHeader } from '@/components/layout/PageHeader';
import { buildFunnel, type Funnel, type FunnelSession } from '@/lib/funnel';
import { Filter } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Player funnel - Deadeye' };

const WINDOWS = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 0, label: 'Everyone' },
];

type Admin = ReturnType<typeof createAdminClient>;

/** Ids in batches: a few hundred uuids in one `in` filter make a URL too long to send. */
async function inBatches<T>(ids: string[], load: (batch: string[]) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await load(ids.slice(i, i + 200));
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
  }
  return rows;
}

/**
 * The owner and test accounts, which would otherwise count as players: the
 * owner by OWNER_EMAIL or the owner role, test accounts by TEST_ACCOUNT_EMAILS
 * (comma separated).
 */
async function excludedIds(admin: Admin, users: Array<{ id: string; email?: string }>): Promise<Set<string>> {
  const emails = new Set(
    [process.env.OWNER_EMAIL, ...testAccountEmails()]
      .map((e) => e?.toLowerCase().trim())
      .filter((e): e is string => !!e)
  );
  const ids = new Set(users.filter((u) => u.email && emails.has(u.email.toLowerCase())).map((u) => u.id));
  const { data: owners } = await admin.from('user_roles').select('user_id').eq('role', 'owner');
  for (const o of owners ?? []) ids.add(o.user_id);
  return ids;
}

async function loadFunnel(days: number): Promise<{ funnel: Funnel; excluded: number; eventsSince: string | null } | { problem: string }> {
  try {
    const admin = createAdminClient();
    const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) return { problem: listError.message };
    const users = list.users;
    const excluded = await excludedIds(admin, users);
    const since = days > 0 ? Date.now() - days * 86_400_000 : 0;
    const cohort = users.filter((u) => !excluded.has(u.id) && Date.parse(u.created_at) >= since).map((u) => u.id);

    const [profiles, events, sessions, first] = await Promise.all([
      inBatches<{ id: string; onboarding_completed: boolean }>(cohort, (b) => admin.from('profiles').select('id, onboarding_completed').in('id', b)),
      inBatches<{ user_id: string; name: string }>(cohort, (b) => admin.from('app_events').select('user_id, name').in('user_id', b)),
      inBatches<FunnelSession>(cohort, (b) => admin.from('training_sessions').select('user_id, verified_by_video').in('user_id', b)),
      admin.from('app_events').select('day').order('day', { ascending: true }).limit(1).maybeSingle(),
    ]);
    const setup = new Set(profiles.filter((p) => p.onboarding_completed).map((p) => p.id));
    const funnel = buildFunnel(
      cohort.map((id) => ({ id, setupDone: setup.has(id) })),
      events,
      sessions
    );
    return { funnel, excluded: excluded.size, eventsSince: first.data?.day ?? null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'could not load';
    return {
      problem: /app_events/.test(message) ? 'Run 00045_app_events.sql in the Supabase SQL editor to turn this on.' : message,
    };
  }
}

function pct(count: number, of: number): string {
  return of > 0 ? `${Math.round((count / of) * 100)}%` : '–';
}

export default async function FunnelPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  if (!(await checkIsOwner())) notFound();
  const asked = Number((await searchParams).days ?? 30);
  const days = WINDOWS.some((w) => w.days === asked) ? asked : 30;
  const result = await loadFunnel(days);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5">
        <PageHeader tone="hoops" icon={Filter} title="Player funnel" subtitle="How far new players get, and where they stop" />

        <div className="flex gap-1 rounded-xl bg-zinc-900 p-1">
          {WINDOWS.map((w) => (
            <Link
              key={w.days}
              href={`/admin/funnel?days=${w.days}`}
              className={`flex-1 rounded-lg py-2 text-center text-xs font-semibold ${w.days === days ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
            >
              {w.days > 0 ? `Joined in ${w.label}` : w.label}
            </Link>
          ))}
        </div>

        {'problem' in result ? (
          <p className="rounded-2xl border border-amber-600/40 bg-amber-600/10 p-4 text-sm text-amber-300">{result.problem}</p>
        ) : (
          <>
            {result.funnel.biggestDrop && (
              <div className="rounded-2xl border border-orange-600/40 bg-orange-600/10 p-4">
                <div className="text-xs font-semibold uppercase text-orange-300">Most players stop here</div>
                <p className="mt-1 font-semibold text-white">
                  {result.funnel.biggestDrop.from} → {result.funnel.biggestDrop.to}
                </p>
                <p className="text-sm text-zinc-300">
                  {result.funnel.biggestDrop.lost} of {result.funnel.joined} players are lost at this step.
                </p>
              </div>
            )}

            {result.funnel.groups.map((g) => (
              <section key={g.title} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <h2 className="mb-3 text-sm font-bold text-white">{g.title}</h2>
                <ul className="space-y-3">
                  {g.steps.map((s) => (
                    <li key={s.key}>
                      <div className="flex items-baseline justify-between gap-3 text-sm">
                        <span className="text-zinc-300">{s.label}</span>
                        <span className="tabular-nums text-white">
                          <span className="font-bold">{s.count}</span>
                          <span className="ml-2 text-xs text-zinc-500">{pct(s.count, result.funnel.joined)}</span>
                        </span>
                      </div>
                      <div className="mt-1 h-2 overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-orange-500"
                          style={{ width: pct(s.count, result.funnel.joined) === '–' ? '0%' : pct(s.count, result.funnel.joined) }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            <p className="text-xs text-zinc-500">
              Percentages are of players who joined in this window. Your own account
              {result.excluded > 1 ? ' and test accounts are' : ' is'} left out ({result.excluded}); add test logins to
              TEST_ACCOUNT_EMAILS in Vercel to leave them out too.{' '}
              {result.eventsSince
                ? `Welcome and tracker steps are recorded from ${result.eventsSince}, so players who joined before that show lower there.`
                : 'No welcome or tracker steps are recorded yet.'}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
