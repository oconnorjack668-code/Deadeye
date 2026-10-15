// src/app/(app)/coach/page.tsx
// Coach dashboard (Deadeye Pro): every team you coach at a glance.
import React from 'react';
import Link from 'next/link';
import { requireUser, getCurrentSubscription } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { summarizeTeam, type RosterStats } from '@/lib/coach';
import { userCalendarNow } from '@/lib/userTime';
import { ClipboardCheck, Crown, Flame, Moon, Plus, Shield, Users, Video } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Coach dashboard - Deadeye' };

export default async function CoachPage() {
  const user = await requireUser();
  const subscription = await getCurrentSubscription();
  const isPro = subscription?.plan_type === 'pro' || subscription?.plan_type === 'owner';

  const header = (
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg">
        <ClipboardCheck className="h-6 w-6 text-white" />
      </div>
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white">Coach dashboard</h1>
        <p className="text-sm text-zinc-400">Your teams this week</p>
      </div>
    </div>
  );

  if (!isPro) {
    return (
      <div className="flex-1 overflow-auto p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        {header}
        <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-6 space-y-2">
          <p className="flex items-center gap-2 font-bold text-white">
            <Crown className="h-5 w-5 text-amber-400" /> Coaching is part of Deadeye Pro
          </p>
          <p className="text-sm text-zinc-300">
            Create teams, post assignments, see every player&apos;s training and game stats (when they share), and track your whole squad from one
            dashboard. Players always join for free.
          </p>
          <Link href="/pro" className="inline-block rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-zinc-950">
            See Deadeye Pro
          </Link>
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: memberships }, { today }] = await Promise.all([
    supabase.from('team_members').select('role, teams(id, name, age_group, club_name)').eq('user_id', user.id).eq('role', 'coach'),
    userCalendarNow(),
  ]);
  const teams = ((memberships || []) as unknown as Array<{ teams: { id: string; name: string; age_group: string | null; club_name: string | null } | null }>)
    .map((m) => m.teams)
    .filter(Boolean) as Array<{ id: string; name: string; age_group: string | null; club_name: string | null }>;

  const summaries = await Promise.all(
    teams.map(async (t) => {
      const [{ data: roster }, { data: open }] = await Promise.all([
        supabase.rpc('team_roster', { p_team: t.id }),
        supabase.from('team_assignments').select('id', { count: 'exact' }).eq('team_id', t.id).or(`due_date.is.null,due_date.gte.${today}`),
      ]);
      return { team: t, summary: summarizeTeam((roster || []) as RosterStats[], today), openAssignments: (open || []).length };
    })
  );

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        {header}

        {teams.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center space-y-3">
            <Shield className="h-10 w-10 text-zinc-600 mx-auto" />
            <p className="font-semibold text-white">You don&apos;t coach a team yet</p>
            <Link href="/teams" className="inline-flex items-center gap-1.5 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white">
              <Plus className="h-4 w-4" /> Create a team
            </Link>
          </div>
        ) : (
          summaries.map(({ team, summary: s, openAssignments }) => (
            <section key={team.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/teams/${team.id}`} className="text-xl font-black text-white hover:underline">
                    {team.name}
                  </Link>
                  <p className="text-xs text-zinc-500">{[team.club_name, team.age_group].filter(Boolean).join(' · ') || `${s.players} players`}</p>
                </div>
                <Link href={`/teams/${team.id}`} className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700">
                  Open team
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                <div className="rounded-xl bg-zinc-950/60 p-3">
                  <div className="text-2xl font-black text-white">
                    {s.activeThisWeek}/{s.players}
                  </div>
                  <div className="text-[11px] text-zinc-500">trained this week</div>
                </div>
                <div className="rounded-xl bg-zinc-950/60 p-3">
                  <div className="text-2xl font-black text-white">{s.minutes}</div>
                  <div className="text-[11px] text-zinc-500">team minutes (7d)</div>
                </div>
                <div className="rounded-xl bg-zinc-950/60 p-3">
                  <div className="text-2xl font-black text-orange-400">{s.shootingPct != null ? `${s.shootingPct}%` : '–'}</div>
                  <div className="text-[11px] text-zinc-500">{s.attempts ? `${s.makes}/${s.attempts} shots` : 'team shooting'}</div>
                </div>
                <div className="rounded-xl bg-zinc-950/60 p-3">
                  <div className="text-2xl font-black text-white">{s.avgPpg ?? '–'}</div>
                  <div className="text-[11px] text-zinc-500">avg PPG</div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div>
                  <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-zinc-500">
                    <Flame className="h-3.5 w-3.5 text-orange-400" /> Most active
                  </h3>
                  {s.top.length === 0 ? (
                    <p className="text-zinc-500">Nobody has trained yet this week.</p>
                  ) : (
                    <ul className="space-y-0.5 text-zinc-200">
                      {s.top.map((p) => (
                        <li key={p.user_id}>
                          {p.display_name} · {p.sessions} sessions · {p.minutes} min
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div>
                  <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase text-zinc-500">
                    <Moon className="h-3.5 w-3.5 text-zinc-400" /> Quiet for 7+ days
                  </h3>
                  {s.quiet.length === 0 ? (
                    <p className="text-emerald-400/80">Everyone has trained this week 🙌</p>
                  ) : (
                    <p className="text-zinc-300">{s.quiet.map((q) => q.display_name).join(', ')}</p>
                  )}
                </div>
              </div>

              {/* Phrased as a count, never a share or a score. Most honest
                  training is not filmed - nobody props a phone up for a 6am
                  session alone - so a low number here means "not filmed", and
                  a coach reading it as "not trusted" would be the one way this
                  feature could do harm. */}
              {s.verifiedSessions > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-cyan-300/90">
                  <Video className="h-3.5 w-3.5 flex-shrink-0" />
                  {s.verifiedSessions} of this week&apos;s hoops sessions {s.verifiedSessions === 1 ? 'was' : 'were'} counted
                  from video
                </p>
              )}

              <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {s.sharing}/{s.players} share details with you
                </span>
                <span>{openAssignments} open assignments</span>
              </p>
            </section>
          ))
        )}

        <p className="text-xs text-zinc-500">
          Players choose whether to share their training details with coaches (Settings → Privacy, or on the team page). You always see
          their weekly totals and game averages.
        </p>
      </div>
    </div>
  );
}
