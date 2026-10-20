// src/app/(app)/leaderboard/page.tsx
// Season leaderboard (standings stored by the database, refreshed at most every 10 minutes,
// counted on each player's own calendar — migration 00024).
// Scoring: +10 per training day (hoops session or workout, max 1 per day), +10 per study
// topic quiz passed at 80%+, plus challenge points.
import React from 'react';
import Link from 'next/link';
import { requireUser, getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Avatar } from '@/components/Avatar';
import { countryName } from '@/lib/regions';
import { chaseFor } from '@/lib/leaderboard';
import { leaderboardLooks, type RowLook } from '@/lib/leaderboard-server';
import { Podium, StandingRow, type Standing } from './Standings';
import { Trophy, Flame, Star, Target, Users, MapPin, CalendarCheck, ChevronRight, Check, Dumbbell, BookOpen } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Leaderboard - Deadeye' };

type Scope = 'everyone' | 'country' | 'region' | 'friends' | 'team';
const AGE_GROUPS = [
  { id: 'all', label: 'All ages' },
  { id: 'u14', label: 'U14' },
  { id: '14-17', label: '14–17' },
  { id: '18+', label: '18+' },
] as const;
const LIST_LIMIT = 100;

function href(scope: Scope, age: string, team?: string | null) {
  const q = new URLSearchParams({ scope });
  if (age !== 'all') q.set('age', age);
  if (scope === 'team' && team) q.set('team', team);
  return `/leaderboard?${q.toString()}`;
}

const TRAIN_BUTTON =
  'inline-flex flex-shrink-0 items-center gap-1.5 rounded-full bg-red-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-red-950/50 hover:bg-red-500';

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  await requireUser();
  const params = await searchParams;
  const [profile, supabase] = await Promise.all([getCurrentProfile(), createClient()]);

  const age = AGE_GROUPS.some((g) => g.id === params.age) ? (params.age as string) : 'all';
  let scope: Scope = (['everyone', 'country', 'region', 'friends', 'team'] as const).includes(params.scope as Scope)
    ? (params.scope as Scope)
    : 'everyone';

  const [{ data: season }, { data: memberships }, { data: challenges }, { data: myChallenges }] = await Promise.all([
    supabase.from('leaderboard_seasons').select('id, name').eq('is_active', true).maybeSingle(),
    supabase.from('team_members').select('teams(id, name)').eq('user_id', profile?.id ?? ''),
    supabase.from('challenges').select('id, title, description, points, end_date').eq('is_active', true).limit(20),
    supabase.from('challenge_completions').select('challenge_id').eq('user_id', profile?.id ?? ''),
  ]);
  const teams = ((memberships || []) as unknown as Array<{ teams: { id: string; name: string } | null }>).map((m) => m.teams).filter(Boolean) as Array<{ id: string; name: string }>;
  const teamId = scope === 'team' ? teams.find((t) => t.id === params.team)?.id || teams[0]?.id || null : null;
  if (scope === 'team' && !teamId) scope = 'everyone';

  const rpc = (s: Scope, limit: number, team: string | null = null) =>
    supabase.rpc('leaderboard_page', { p_scope: s, p_age: age, p_team: team, p_limit: limit });

  // The main list plus "your rank" in each view, all in parallel
  const [main, meEveryone, meCountry, meRegion, meFriends] = await Promise.all([
    rpc(scope, LIST_LIMIT, teamId),
    rpc('everyone', 0),
    profile?.country ? rpc('country', 0) : Promise.resolve({ data: [] }),
    profile?.region ? rpc('region', 0) : Promise.resolve({ data: [] }),
    rpc('friends', 0),
  ]);
  const notReady = !!main.error;
  const standings = ((main.data || []) as Standing[]);
  const me = (res: { data?: unknown }) => ((res.data || []) as Standing[]).find((r) => r.is_me);
  const meRow = standings.find((s) => s.is_me);
  const rankIn: Partial<Record<Scope, Standing | undefined>> = {
    everyone: me(meEveryone),
    country: me(meCountry),
    region: me(meRegion),
    friends: me(meFriends),
  };

  const tabs: Array<{ scope: Scope; label: string; team?: string; row?: Standing }> = [
    { scope: 'everyone', label: 'Everyone', row: rankIn.everyone },
    { scope: 'country', label: profile?.country ? countryName(profile.country) : 'Country', row: rankIn.country },
    { scope: 'region', label: profile?.region || 'County', row: rankIn.region },
    { scope: 'friends', label: 'Friends', row: rankIn.friends },
    ...teams.map((t) => ({ scope: 'team' as Scope, label: t.name, team: t.id, row: t.id === teamId ? meRow : undefined })),
  ];
  const isActive = (t: { scope: Scope; team?: string }) => t.scope === scope && (t.scope !== 'team' || t.team === teamId);
  const activeLabel = tabs.find(isActive)?.label ?? 'Everyone';
  const needsLocation = (scope === 'country' && !profile?.country) || (scope === 'region' && !profile?.region);
  const done = new Set(((myChallenges || []) as Array<{ challenge_id: string }>).map((c) => c.challenge_id));

  // Everyone in the top 100 is listed; a player further down is pinned under the list instead
  const listed = standings.filter((s) => !s.is_me || s.rank <= LIST_LIMIT);
  const pinnedMe = meRow && meRow.rank > LIST_LIMIT ? meRow : null;
  const podium = listed.filter((s) => s.points > 0).slice(0, 3);
  const podiumIds = new Set(podium.map((p) => p.user_id));
  const rest = listed.filter((s) => !podiumIds.has(s.user_id));
  const leaderPoints = listed[0]?.points ?? 0;
  const looks = needsLocation ? new Map<string, RowLook>() : await leaderboardLooks(standings.map((s) => s.user_id));
  const chase = chaseFor(standings, LIST_LIMIT);
  const ranked = !!meRow && meRow.points > 0;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
        <header className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-red-700 to-red-500 flex items-center justify-center shadow-lg shadow-red-950/60">
            <Trophy className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-black tracking-tight text-white">Leaderboard</h1>
            <p className="text-sm text-zinc-400 truncate">{season?.name || 'This season'} · updates every few minutes</p>
          </div>
        </header>

        {notReady ? (
          <p className="rounded-xl border border-amber-600/40 bg-amber-600/10 p-4 text-sm text-amber-200">
            The new leaderboard isn&apos;t switched on yet. Run migration <code>00024_settings_region_coach.sql</code> in Supabase.
          </p>
        ) : (
          <>
            {/* Where you stand, and what it takes to move up */}
            {meRow && !needsLocation && (
              <section className="relative overflow-hidden rounded-3xl border border-red-500/30 bg-gradient-to-br from-red-950/70 via-zinc-900 to-zinc-950 p-5">
                <div aria-hidden className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-red-600/20 blur-3xl" />
                <div className="relative flex items-center gap-4">
                  <Avatar name={profile?.display_name || meRow.player_name} emoji={profile?.avatar_emoji} color={profile?.avatar_color} size={60} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold uppercase tracking-widest text-red-300/80">You · {activeLabel}</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-5xl font-black leading-tight tabular-nums text-white">{ranked ? `#${meRow.rank}` : '–'}</span>
                      {ranked && meRow.total > 1 && <span className="text-sm text-zinc-400">of {meRow.total}</span>}
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className="text-3xl font-black leading-none tabular-nums text-white">{meRow.points}</div>
                    <div className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">pts</div>
                  </div>
                </div>

                <div className="relative mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950/60 px-2.5 py-1 text-zinc-300">
                    <CalendarCheck className="h-3.5 w-3.5 text-emerald-400" /> {meRow.training_days} training days
                  </span>
                  {meRow.current_streak > 0 && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950/60 px-2.5 py-1 text-zinc-300">
                      <Flame className="h-3.5 w-3.5 text-orange-400" /> {meRow.current_streak} day streak
                    </span>
                  )}
                </div>

                <div className="relative mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/5 bg-zinc-950/50 p-3">
                  <p className="text-sm text-zinc-300">
                    {chase?.kind === 'chasing' ? (
                      <>
                        <span className="font-black text-white">{chase.gap} pts</span> to catch{' '}
                        <span className="font-bold text-white">{chase.outsideList ? `the top ${LIST_LIMIT}` : chase.target}</span>
                        <span className="block text-xs text-zinc-500">
                          About {chase.days} training {chase.days === 1 ? 'day' : 'days'}
                        </span>
                      </>
                    ) : chase?.kind === 'leading' ? (
                      chase.over ? (
                        chase.lead > 0 ? (
                          <>
                            You&apos;re top, <span className="font-black text-white">{chase.lead} pts</span> clear of {chase.over}. Keep training to stay there.
                          </>
                        ) : (
                          <>Level at the top with {chase.over}. One training day puts you clear.</>
                        )
                      ) : (
                        <>You&apos;re top of this board. Bring some friends to chase you.</>
                      )
                    ) : (
                      <>Every training day is +10. Log one to get on the board.</>
                    )}
                  </p>
                  <Link href="/train" className={TRAIN_BUTTON}>
                    Train
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>

                {!profile?.is_public && (
                  <p className="relative mt-3 text-xs text-zinc-400">
                    Only friends and teammates can see you.{' '}
                    <Link href="/settings" className="underline text-cyan-400">
                      Show me on the public board
                    </Link>
                  </p>
                )}
              </section>
            )}

            {/* Which board, with your rank on each */}
            <div className="space-y-3">
              <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] md:mx-0 md:px-0">
                {tabs.map((t) => {
                  const active = isActive(t);
                  const rank = t.row && t.row.points > 0 ? `#${t.row.rank}` : t.scope === 'team' && !active ? null : '–';
                  return (
                    <Link
                      key={`${t.scope}-${t.team || ''}`}
                      href={href(t.scope, age, t.team)}
                      aria-current={active ? 'page' : undefined}
                      className={`min-w-[5.5rem] flex-shrink-0 rounded-2xl border px-3.5 py-2 transition-colors ${
                        active ? 'border-red-500/70 bg-red-500/15 text-white' : 'border-zinc-800 bg-zinc-900/70 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      <div className="max-w-[9rem] truncate text-xs font-semibold">
                        {t.scope === 'team' && <Users className="mr-1 inline h-3 w-3" />}
                        {t.label}
                      </div>
                      <div className={`text-lg font-black leading-tight tabular-nums ${active ? 'text-white' : 'text-zinc-300'}`}>
                        {rank ?? <span className="text-xs font-semibold text-zinc-500">Team</span>}
                      </div>
                    </Link>
                  );
                })}
              </nav>
              <div className="inline-flex rounded-full border border-zinc-800 bg-zinc-900/70 p-1">
                {AGE_GROUPS.map((g) => (
                  <Link
                    key={g.id}
                    href={href(scope, g.id, teamId)}
                    aria-current={age === g.id ? 'page' : undefined}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                      age === g.id ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    {g.label}
                  </Link>
                ))}
              </div>
            </div>

            {needsLocation ? (
              <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8 text-center text-sm text-zinc-300">
                <MapPin className="mx-auto mb-3 h-8 w-8 text-zinc-500" />
                Add your {scope === 'country' ? 'country' : 'county'} in{' '}
                <Link href="/settings" className="underline text-cyan-400">
                  Settings → Region
                </Link>{' '}
                to see this leaderboard.
              </div>
            ) : listed.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-700 bg-zinc-900/40 p-8 text-center">
                <Trophy className="mx-auto mb-3 h-10 w-10 text-zinc-600" />
                {scope === 'friends' ? (
                  <>
                    <p className="font-bold text-white">No friends on this board yet</p>
                    <p className="mt-1 text-sm text-zinc-400">Add your teammates and see who trains the most.</p>
                    <Link href="/friends" className={`${TRAIN_BUTTON} mt-4`}>
                      Add friends
                    </Link>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-white">Nobody&apos;s on the board yet</p>
                    <p className="mt-1 text-sm text-zinc-400">Log a session and the top spot is yours.</p>
                    <Link href="/train" className={`${TRAIN_BUTTON} mt-4`}>
                      Start training
                    </Link>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {podium.length > 0 && <Podium top={podium} looks={looks} />}
                {rest.length > 0 && (
                  <ol className="divide-y divide-zinc-800/80 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/60">
                    {rest.map((player) => (
                      <li key={player.user_id}>
                        <StandingRow player={player} look={looks.get(player.user_id)} leaderPoints={leaderPoints} />
                      </li>
                    ))}
                  </ol>
                )}
                {pinnedMe && (
                  <>
                    <div className="text-center text-lg leading-none tracking-[0.4em] text-zinc-700" aria-hidden>
                      ···
                    </div>
                    <div className="overflow-hidden rounded-2xl border border-red-500/30 bg-zinc-900/60">
                      <StandingRow player={pinnedMe} look={looks.get(pinnedMe.user_id)} leaderPoints={leaderPoints} />
                    </div>
                  </>
                )}
              </div>
            )}

            <Link
              href="/friends"
              className="flex items-center gap-3 rounded-2xl border border-cyan-700/40 bg-cyan-950/30 p-4 transition-colors hover:bg-cyan-950/50"
            >
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-cyan-500/15">
                <Users className="h-5 w-5 text-cyan-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-cyan-200">Weekly friends leaderboard</div>
                <div className="text-xs text-zinc-400">Who trained most in the last 7 days</div>
              </div>
              <ChevronRight className="h-5 w-5 text-cyan-400/70" />
            </Link>

            <details className="group rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between font-semibold text-zinc-200">
                How points work
                <ChevronRight className="h-4 w-4 text-zinc-500 transition-transform group-open:rotate-90" />
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-xl bg-zinc-950/60 p-3">
                  <Dumbbell className="h-4 w-4 text-emerald-400" />
                  <div className="mt-1.5 font-bold text-white">+10 training</div>
                  <p className="mt-0.5 text-xs text-zinc-400">Each day you log a hoops session or workout (once a day, on your own calendar)</p>
                </div>
                <div className="rounded-xl bg-zinc-950/60 p-3">
                  <BookOpen className="h-4 w-4 text-amber-400" />
                  <div className="mt-1.5 font-bold text-white">+10 quiz</div>
                  <p className="mt-0.5 text-xs text-zinc-400">Each IQ Study topic quiz passed at 80%+</p>
                </div>
                <div className="rounded-xl bg-zinc-950/60 p-3">
                  <Target className="h-4 w-4 text-red-400" />
                  <div className="mt-1.5 font-bold text-white">Bonus</div>
                  <p className="mt-0.5 text-xs text-zinc-400">Extra points for weekly challenges</p>
                </div>
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Everyone, country and county boards show players who turned on &ldquo;Show me on the public leaderboard&rdquo;. Friends and
                team boards show your friends and teammates. Age groups use your age bracket, which is never shown to anyone.
              </p>
            </details>
          </>
        )}

        {challenges && challenges.length > 0 && (
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-white">
              <Target className="h-5 w-5 text-red-400" /> Active challenges
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {(challenges as Array<{ id: string; title: string; description: string; points: number }>).map((c) => {
                const complete = done.has(c.id);
                return (
                  <div
                    key={c.id}
                    className={`flex gap-3 rounded-2xl border p-4 ${complete ? 'border-emerald-600/30 bg-emerald-950/20' : 'border-zinc-800 bg-zinc-900/70'}`}
                  >
                    <div
                      className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${complete ? 'bg-emerald-500/15' : 'bg-red-500/15'}`}
                    >
                      {complete ? <Check className="h-5 w-5 text-emerald-400" /> : <Target className="h-5 w-5 text-red-400" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-white">{c.title}</h3>
                        <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-amber-400/10 px-2 py-0.5 text-xs font-black text-amber-300">
                          <Star className="h-3 w-3" /> +{c.points}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-400">{c.description}</p>
                      {complete && <p className="mt-2 text-xs font-semibold text-emerald-400">Done</p>}
                    </div>
                  </div>
                );
              })}
            </div>
            <Link href="/achievements" className="mt-2 inline-block text-xs text-cyan-400 underline">
              See your challenge progress
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
