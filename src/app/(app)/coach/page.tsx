// src/app/(app)/coach/page.tsx
// Coach home: "how is my team doing this week?" for every team you coach.
// Free for every coach (Coach Free in the plan); more teams and history are
// what will be paid for later.
import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { summarizeTeam, type RosterStats } from '@/lib/coach';
import { assignmentProgress, ROLE_LABELS, type TeamRole } from '@/lib/coachSide';
import { FilmQueue } from './FilmQueue';
import type { FilmQuestion } from '@/lib/filmQuestions';
import { userCalendarNow } from '@/lib/userTime';
import { ClipboardCheck, ClipboardList, Flame, Moon, Plus, QrCode, Shield, ShieldAlert, Users, Video } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Coach home - Deadeye' };

type CoachTeam = { id: string; name: string; age_group: string | null; club_name: string | null };

export default async function CoachPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const [{ data: memberships }, { today }, coachProfile] = await Promise.all([
    supabase.from('team_members').select('role, teams(id, name, age_group, club_name)').eq('user_id', user.id).in('role', ['coach', 'assistant']),
    userCalendarNow(),
    supabase.from('coach_profiles').select('is_adult').eq('user_id', user.id).maybeSingle(),
  ]);
  const teams = ((memberships || []) as unknown as Array<{ role: TeamRole; teams: CoachTeam | null }>)
    .filter((m) => m.teams)
    .map((m) => ({ ...m.teams!, role: m.role }));

  // An error means 00047 has not been run yet: show the teams as before
  // rather than sending everyone to a setup that cannot save.
  const setUp = !!coachProfile.data || !!coachProfile.error;
  if (!setUp && teams.length === 0) redirect('/coach/setup');
  const isAdult = coachProfile.data?.is_adult ?? true;

  // Film questions waiting on this coach, across every team they head coach.
  // Row level security does the filtering: 00035 only exposes a question to a
  // head coach of its team, so this needs no team list of its own.
  const { data: openQuestions } = await supabase
    .from('film_questions')
    .select('*')
    .is('answered_at', null)
    .not('team_id', 'is', null)
    .order('created_at', { ascending: true })
    .limit(30);

  const askers = [...new Set((openQuestions || []).map((q) => q.player_id))];
  const { data: askerProfiles } = askers.length
    ? await supabase.from('profiles').select('id, display_name').in('id', askers)
    : { data: [] as Array<{ id: string; display_name: string }> };
  const names = Object.fromEntries((askerProfiles || []).map((p) => [p.id, p.display_name]));

  const summaries = await Promise.all(
    teams.map(async (t) => {
      const [{ data: roster }, { data: open }] = await Promise.all([
        supabase.rpc('team_roster', { p_team: t.id }),
        supabase
          .from('team_assignments')
          .select('id, title, due_date')
          .eq('team_id', t.id)
          .or(`due_date.is.null,due_date.gte.${today}`)
          .order('created_at', { ascending: false })
          .limit(3),
      ]);
      const rows = (roster || []) as RosterStats[];
      const openIds = (open || []).map((a) => a.id);
      const { data: completions } = openIds.length
        ? await supabase.from('team_assignment_completions').select('assignment_id, user_id').in('assignment_id', openIds)
        : { data: [] as Array<{ assignment_id: string; user_id: string }> };
      const progress = assignmentProgress(
        open || [],
        completions || [],
        rows.filter((r) => r.role === 'player').map((r) => r.user_id)
      );
      return {
        team: t,
        summary: summarizeTeam(rows, today),
        assignments: (open || []).map((a, i) => ({ ...a, ...progress[i] })),
      };
    })
  );

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg">
            <ClipboardCheck className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Coach home</h1>
            <p className="text-sm text-zinc-400">How your {teams.length === 1 ? 'team is' : 'teams are'} doing this week</p>
          </div>
        </div>

        {/* Coaches who made a team before coach setup existed */}
        {!setUp && (
          <Link
            href="/coach/setup"
            className="flex items-start gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100 hover:bg-amber-500/15"
          >
            <ShieldAlert className="h-5 w-5 flex-shrink-0 text-amber-300" />
            <span>
              <span className="block font-semibold text-white">Finish coach setup</span>
              Two questions, including the safeguarding step every coach answers. Until then you can&apos;t add a team or make
              someone a head coach.
            </span>
          </Link>
        )}

        {/* Above the team summaries: a player waiting on an answer is the one
            thing here with somebody on the other end of it. */}
        <FilmQueue questions={(openQuestions || []) as unknown as FilmQuestion[]} names={names} />

        {teams.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-8 text-center space-y-3">
            <Shield className="h-10 w-10 text-zinc-600 mx-auto" />
            <p className="font-semibold text-white">You&apos;re not coaching a team yet</p>
            <p className="text-sm text-zinc-400">
              {isAdult ? 'Create your team, or join one another coach made.' : 'Ask your head coach for the team code and join it.'}
            </p>
            <Link href="/coach/setup?step=team" className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white">
              <Plus className="h-4 w-4" /> {isAdult ? 'Set up a team' : 'Join a team'}
            </Link>
          </div>
        ) : (
          summaries.map(({ team, summary: s, assignments }) => (
            <section key={team.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link href={`/teams/${team.id}`} className="text-xl font-black text-white hover:underline">
                    {team.name}
                  </Link>
                  <p className="text-xs text-zinc-500">
                    {[team.club_name, team.age_group, team.role === 'assistant' ? ROLE_LABELS.assistant : null].filter(Boolean).join(' · ') ||
                      `${s.players} players`}
                  </p>
                </div>
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

              <div>
                <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase text-zinc-500">
                  <ClipboardList className="h-3.5 w-3.5 text-cyan-400" /> Open assignments
                </h3>
                {assignments.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    None open.{' '}
                    <Link href={`/coach/assignments?team=${team.id}`} className="text-cyan-400 underline">
                      Post one
                    </Link>
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {assignments.map((a) => (
                      <li key={a.id} className="text-sm">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 truncate text-zinc-200">{a.title}</span>
                          <span className="flex-shrink-0 text-xs text-zinc-400">
                            {a.done}/{a.of} done
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden>
                          <div className="h-full rounded-full bg-cyan-500" style={{ width: `${a.of ? Math.round((a.done / a.of) * 100) : 0}%` }} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
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
                  {s.players === 0 ? (
                    <p className="text-zinc-500">No players yet. Share the team code to get them in.</p>
                  ) : s.quiet.length === 0 ? (
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

              <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
                <Link href={`/coach/assignments?team=${team.id}`} className="flex flex-col items-center gap-1 rounded-xl bg-zinc-800 px-2 py-2.5 text-center text-zinc-100 hover:bg-zinc-700">
                  <Plus className="h-4 w-4" /> Post assignment
                </Link>
                <Link href={`/teams/${team.id}?share=1`} className="flex flex-col items-center gap-1 rounded-xl bg-zinc-800 px-2 py-2.5 text-center text-zinc-100 hover:bg-zinc-700">
                  <QrCode className="h-4 w-4" /> Share team code
                </Link>
                <Link href={`/teams/${team.id}`} className="flex flex-col items-center gap-1 rounded-xl bg-zinc-800 px-2 py-2.5 text-center text-zinc-100 hover:bg-zinc-700">
                  <Users className="h-4 w-4" /> Roster
                </Link>
              </div>

              <p className="text-xs text-zinc-500">
                {s.sharing}/{s.players} share training details with you
              </p>
            </section>
          ))
        )}

        <p className="text-xs text-zinc-500">
          Players choose whether to share their training details with coaches (Settings → Privacy, or on the team page). You always see
          their weekly totals and game averages, never their notes or videos.
        </p>
      </div>
    </div>
  );
}
