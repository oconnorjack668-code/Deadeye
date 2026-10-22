// src/components/clubs/ClubBoard.tsx
// The club board screen: the club, its challenge, how each team trained this
// week, and notices from head coaches. Team totals only, never a player; the
// database (00053) decides who sees it and who can post.
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarDays, Flame, MapPin, Megaphone, Send, ShieldCheck, Target, Trash2, Trophy, Users } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { teamLeagueText } from '@/lib/leagues';
import {
  NOTICE_MAX,
  challengePercent,
  clubInitials,
  daysLeft,
  metricLabel,
  noticeProblem,
  teamRace,
  timeAgo,
  type ChallengeMetric,
  type ClubChallenge,
  type ClubNotice,
  type ClubTeam,
} from '@/lib/clubBoard';

const num = (n: number) => n.toLocaleString('en-IE');
const shortDate = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', timeZone: 'UTC' });

type CoachTeam = { id: string; name: string };

export function ClubBoard({
  club,
  teams,
  notices,
  challenge,
  myCoachTeams,
  canModerate,
  today,
  now,
}: {
  club: { id: string; name: string; place: string };
  teams: ClubTeam[];
  notices: ClubNotice[];
  challenge: ClubChallenge | null;
  /** Teams on this board the viewer is head coach of: they can post and set the challenge */
  myCoachTeams: CoachTeam[];
  /** The owner, who can remove any notice */
  canModerate: boolean;
  /** Irish date, YYYY-MM-DD */
  today: string;
  /** Server time, so "2h ago" matches between server and browser */
  now: number;
}) {
  const race = teamRace(teams);
  const weekSessions = race.reduce((sum, t) => sum + (t.sessions_7d ?? 0), 0);
  const leader = race[0]?.rank === 1 ? race[0] : null;

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-5xl space-y-5 p-4 md:p-8">
        <Link href="/teams" className="inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200">
          <ArrowLeft className="h-4 w-4" /> Teams
        </Link>

        {/* The club */}
        <section className="relative overflow-hidden rounded-3xl border border-orange-500/25 bg-gradient-to-br from-orange-600/30 via-zinc-900 to-zinc-950 p-5 md:p-7">
          <CourtLines />
          <div className="relative flex items-center gap-4">
            <span className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-300 text-xl font-black text-zinc-950 shadow-lg shadow-orange-950/60 ring-1 ring-white/25 md:h-20 md:w-20 md:text-2xl">
              {clubInitials(club.name)}
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-300">Club board</p>
              <h1 className="truncate text-2xl font-black tracking-tight text-white md:text-4xl">{club.name}</h1>
              {club.place && (
                <p className="mt-0.5 flex items-center gap-1 text-sm text-zinc-400">
                  <MapPin className="h-3.5 w-3.5" /> {club.place}
                </p>
              )}
            </div>
          </div>
          <dl className="relative mt-5 grid grid-cols-3 gap-2">
            <Stat label={teams.length === 1 ? 'Team' : 'Teams'} value={num(teams.length)} />
            <Stat label="Sessions this week" value={num(weekSessions)} />
            <Stat label="Top team" value={leader ? leader.name : '-'} small />
          </dl>
        </section>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
          <div className="md:col-start-2 md:row-start-1">
            <ChallengeCard challenge={challenge} coachTeams={myCoachTeams} today={today} />
          </div>
          <div className="md:col-start-1 md:row-span-2 md:row-start-1">
            <Notices clubName={club.name} notices={notices} coachTeams={myCoachTeams} canModerate={canModerate} now={now} />
          </div>
          <div className="md:col-start-2 md:row-start-2">
            <TeamRace race={race} />
          </div>
        </div>

        <p className="flex items-start gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-400">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
          <span>
            Only the players and coaches of {club.name}&apos;s teams can see this board, and Deadeye checks with the club before a team
            joins. Head coaches post to everyone. Nobody can reply or message anyone here, and no player&apos;s name or numbers are
            ever shown.
          </span>
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value, small = false }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/5 bg-zinc-950/50 px-3 py-2.5 backdrop-blur-sm">
      <dd className={`truncate font-black tabular-nums text-white ${small ? 'text-sm leading-6' : 'text-xl'}`}>{value}</dd>
      <dt className="text-[11px] leading-tight text-zinc-400">{label}</dt>
    </div>
  );
}

/** A half court, drawn faintly behind the club name */
function CourtLines() {
  return (
    <svg aria-hidden viewBox="0 0 200 200" className="pointer-events-none absolute -right-10 -top-12 h-56 w-56 text-orange-300/15 md:h-72 md:w-72">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="100" cy="100" r="96" />
        <rect x="70" y="4" width="60" height="70" />
        <circle cx="100" cy="74" r="30" />
        <path d="M30 4 V40 A70 70 0 0 0 170 40 V4" />
        <circle cx="100" cy="20" r="6" />
      </g>
    </svg>
  );
}

// -------------------------------------------------------------- challenge

function ChallengeCard({ challenge, coachTeams, today }: { challenge: ClubChallenge | null; coachTeams: CoachTeam[]; today: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCoach = coachTeams.length > 0;
  const left = challenge ? daysLeft(challenge.ends_on, today) : 0;
  const pct = challenge ? challengePercent(challenge) : 0;
  const done = !!challenge && challenge.progress >= challenge.target;

  async function end() {
    setBusy(true);
    setError(null);
    const { error: e } = await createClient().rpc('end_club_challenge', { p_team: coachTeams[0].id });
    setBusy(false);
    if (e) return setError(e.message);
    router.refresh();
  }

  return (
    <section className="rounded-3xl border border-amber-500/20 bg-gradient-to-b from-amber-500/10 via-zinc-900/90 to-zinc-900/90 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-400/20">
            <Trophy className="h-5 w-5 text-amber-300" />
          </span>
          <div>
            <h2 className="font-bold text-white">Club challenge</h2>
            {challenge && (
              <p className="text-xs text-zinc-400">
                {shortDate(challenge.starts_on)} to {shortDate(challenge.ends_on)}
              </p>
            )}
          </div>
        </div>
        {challenge && (
          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
              done ? 'bg-emerald-500/20 text-emerald-300' : left > 0 ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-800 text-zinc-500'
            }`}
          >
            {done ? 'Done!' : left > 0 ? `${left} ${left === 1 ? 'day' : 'days'} left` : 'Ended'}
          </span>
        )}
      </div>

      {editing ? (
        <ChallengeEditor coachTeams={coachTeams} onDone={() => setEditing(false)} />
      ) : challenge ? (
        <div className="mt-4">
          <div className="flex items-end justify-between gap-3">
            <p className="min-w-0">
              <span className="text-4xl font-black tabular-nums tracking-tight text-white">{num(challenge.progress)}</span>
              <span className="ml-1.5 text-sm text-zinc-400">
                of {num(challenge.target)} {metricLabel(challenge.metric, challenge.target)}
              </span>
            </p>
            <span className="text-2xl font-black tabular-nums text-amber-300">{pct}%</span>
          </div>
          <div
            role="progressbar"
            aria-label="Club challenge progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-800"
          >
            <div
              style={{ width: `${Math.max(pct, challenge.progress > 0 ? 3 : 0)}%` }}
              className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 shadow-[0_0_14px_rgba(251,191,36,0.45)] transition-[width] duration-700"
            />
          </div>
          <p className="mt-2.5 text-xs text-zinc-400">
            {done
              ? `The club hit ${num(challenge.target)} ${metricLabel(challenge.metric, challenge.target)}. Brilliant work, everyone.`
              : `${num(challenge.target - challenge.progress)} to go. Every ${challenge.metric === 'shots' ? 'shot' : 'session'} logged by a player on the club's teams counts.`}
          </p>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-dashed border-zinc-700 p-4 text-center">
          <Target className="mx-auto h-7 w-7 text-zinc-600" />
          <p className="mt-1.5 text-sm font-semibold text-zinc-200">No club challenge right now</p>
          <p className="text-xs text-zinc-500">
            {isCoach ? 'Set one for the whole club: sessions or shots, for up to 3 months.' : 'Your coaches can set one for the whole club.'}
          </p>
        </div>
      )}

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {isCoach && !editing && (
        <div className="mt-4 flex items-center gap-3">
          <Button size="sm" variant={challenge ? 'outline' : 'primary'} className="flex-1" onClick={() => setEditing(true)}>
            {challenge ? 'New challenge' : 'Set a club challenge'}
          </Button>
          {challenge && (
            <button type="button" disabled={busy} onClick={() => void end()} className="text-xs text-zinc-500 underline hover:text-zinc-300">
              End it
            </button>
          )}
        </div>
      )}
    </section>
  );
}

const PRESETS: Record<ChallengeMetric, number[]> = { sessions: [50, 100, 250], shots: [2000, 5000, 10000] };
const LENGTHS = [
  { days: 7, label: '1 week' },
  { days: 14, label: '2 weeks' },
  { days: 28, label: '4 weeks' },
  { days: 56, label: '8 weeks' },
];

function ChallengeEditor({ coachTeams, onDone }: { coachTeams: CoachTeam[]; onDone: () => void }) {
  const router = useRouter();
  const [metric, setMetric] = useState<ChallengeMetric>('shots');
  const [target, setTarget] = useState('5000');
  const [days, setDays] = useState(28);
  const [teamId, setTeamId] = useState(coachTeams[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount = Number(target.replace(/[^0-9]/g, ''));

  async function start() {
    if (!amount || amount > 1_000_000) return setError('Pick a target from 1 to 1,000,000.');
    setBusy(true);
    setError(null);
    const { error: e } = await createClient().rpc('set_club_challenge', { p_team: teamId, p_metric: metric, p_target: amount, p_days: days });
    setBusy(false);
    if (e) return setError(e.message);
    onDone();
    router.refresh();
  }

  const chip = (on: boolean) =>
    `rounded-xl px-3 py-2 text-sm font-semibold transition ${on ? 'bg-orange-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`;

  return (
    <div className="mt-4 space-y-4">
      <fieldset className="space-y-1.5">
        <legend className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Count</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['shots', 'sessions'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={metric === m}
              onClick={() => {
                setMetric(m);
                setTarget(String(PRESETS[m][1]));
              }}
              className={chip(metric === m)}
            >
              {m === 'shots' ? 'Shots' : 'Sessions'}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="space-y-1.5">
        <legend className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Club target</legend>
        <div className="flex flex-wrap gap-2">
          {PRESETS[metric].map((p) => (
            <button key={p} type="button" aria-pressed={amount === p} onClick={() => setTarget(String(p))} className={chip(amount === p)}>
              {num(p)}
            </button>
          ))}
          <input
            aria-label="Target"
            inputMode="numeric"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="w-24 flex-1 rounded-xl border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:border-orange-500 focus:outline-none"
          />
        </div>
      </fieldset>
      <fieldset className="space-y-1.5">
        <legend className="text-xs font-semibold uppercase tracking-wider text-zinc-400">How long, from today</legend>
        <div className="grid grid-cols-4 gap-2">
          {LENGTHS.map((l) => (
            <button key={l.days} type="button" aria-pressed={days === l.days} onClick={() => setDays(l.days)} className={`${chip(days === l.days)} whitespace-nowrap px-1 text-xs`}>
              {l.label}
            </button>
          ))}
        </div>
      </fieldset>
      {coachTeams.length > 1 && (
        <TeamPicker teams={coachTeams} value={teamId} onChange={setTeamId} label="Set it as coach of" />
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" variant="primary" className="flex-1" isLoading={busy} onClick={() => void start()}>
          Start challenge
        </Button>
        <Button size="sm" variant="outline" onClick={onDone} disabled={busy}>
          Cancel
        </Button>
      </div>
      <p className="text-[11px] text-zinc-500">A new challenge replaces the current one. Everyone sees one club total, never a player.</p>
    </div>
  );
}

function TeamPicker({ teams, value, onChange, label }: { teams: CoachTeam[]; value: string; onChange: (id: string) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-xs text-zinc-400">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 focus:border-orange-500 focus:outline-none"
      >
        {teams.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
}

// ------------------------------------------------------------- team race

const MEDALS = ['bg-gradient-to-br from-yellow-300 to-amber-500 text-zinc-950', 'bg-gradient-to-br from-zinc-200 to-zinc-400 text-zinc-900', 'bg-gradient-to-br from-orange-300 to-orange-700 text-zinc-950'];

function TeamRace({ race }: { race: ReturnType<typeof teamRace> }) {
  return (
    <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/15">
          <Flame className="h-5 w-5 text-orange-400" />
        </span>
        <div>
          <h2 className="font-bold text-white">This week</h2>
          <p className="text-xs text-zinc-400">Sessions logged in the last 7 days, by team</p>
        </div>
      </div>
      {race.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No teams on the board yet.</p>
      ) : (
        <ol className="mt-4 space-y-3.5">
          {race.map((t) => {
            const details = [t.age_group, teamLeagueText(t.league_id)].filter(Boolean).join(' · ');
            return (
              <li key={t.team_id} className={`rounded-2xl p-2.5 ${t.mine ? 'bg-orange-500/10 ring-1 ring-orange-500/30' : ''}`}>
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-black ${
                      t.rank && t.rank <= 3 ? MEDALS[t.rank - 1] : 'bg-zinc-800 text-zinc-400'
                    }`}
                    aria-label={t.rank ? `Number ${t.rank}` : undefined}
                  >
                    {t.rank ?? '-'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="min-w-0 truncate text-sm font-semibold text-white">
                        {t.name}
                        {t.mine && <span className="ml-1.5 text-[11px] font-bold text-orange-300">Your team</span>}
                      </span>
                      {t.sessions_7d !== null && <span className="text-sm font-black tabular-nums text-white">{num(t.sessions_7d)}</span>}
                    </div>
                    {t.sessions_7d !== null ? (
                      <>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-800">
                          <div
                            style={{ width: `${t.sessions_7d > 0 ? Math.max(t.share * 100, 4) : 0}%` }}
                            className={`h-full rounded-full transition-[width] duration-700 ${
                              t.mine ? 'bg-gradient-to-r from-orange-500 to-amber-400' : 'bg-gradient-to-r from-zinc-500 to-zinc-400'
                            }`}
                          />
                        </div>
                        <p className="mt-1 truncate text-[11px] text-zinc-500">
                          {[`${t.active_7d} of ${t.players} trained`, `${num(t.shots_7d ?? 0)} shots`, details].filter(Boolean).join(' · ')}
                        </p>
                      </>
                    ) : (
                      <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                        {[details, 'Totals show from 3 players'].filter(Boolean).join(' · ')}
                      </p>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

// --------------------------------------------------------------- notices

function Notices({
  clubName,
  notices,
  coachTeams,
  canModerate,
  now,
}: {
  clubName: string;
  notices: ClubNotice[];
  coachTeams: CoachTeam[];
  canModerate: boolean;
  now: number;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/15">
          <Megaphone className="h-5 w-5 text-sky-300" />
        </span>
        <div>
          <h2 className="font-bold text-white">Notices</h2>
          <p className="text-xs text-zinc-400">From the head coaches, to everyone at {clubName}</p>
        </div>
      </div>
      {coachTeams.length > 0 && <Composer coachTeams={coachTeams} />}
      {notices.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-zinc-800 p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-zinc-700" />
          <p className="mt-2 text-sm font-semibold text-zinc-300">No notices yet</p>
          <p className="text-xs text-zinc-500">Training changes, game days and shout-outs from your coaches show up here.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {notices.map((n) => (
            <NoticeCard key={n.id} notice={n} canDelete={n.mine || canModerate} isNew={now - Date.parse(n.created_at) < 86_400_000} now={now} />
          ))}
        </ul>
      )}
    </section>
  );
}

function Composer({ coachTeams }: { coachTeams: CoachTeam[] }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [teamId, setTeamId] = useState(coachTeams[0].id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problem = body.trim() ? noticeProblem(body) : null;
  const length = body.trim().length;

  async function post() {
    const why = noticeProblem(body);
    if (why) return setError(why);
    setBusy(true);
    setError(null);
    const { error: e } = await createClient().rpc('post_club_notice', { p_team: teamId, p_body: body });
    setBusy(false);
    if (e) return setError(e.message);
    setBody('');
    router.refresh();
  }

  return (
    <div className="space-y-1.5">
      <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-3 transition focus-within:border-orange-500/60">
        <label htmlFor="notice" className="sr-only">
          New notice
        </label>
        <textarea
          id="notice"
          rows={3}
          value={body}
          maxLength={NOTICE_MAX + 50}
          onChange={(e) => {
            setBody(e.target.value);
            setError(null);
          }}
          placeholder="Post to the whole club: a training change, a game day, a shout-out..."
          className="w-full resize-none bg-transparent px-1 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
        />
        <div className="flex items-center justify-between gap-2 border-t border-zinc-800 pt-2">
          <div className="min-w-0 flex-1">
            {coachTeams.length > 1 ? (
              <TeamPicker teams={coachTeams} value={teamId} onChange={setTeamId} label="As coach of" />
            ) : (
              <p className="truncate text-xs text-zinc-500">As head coach of {coachTeams[0].name}</p>
            )}
          </div>
          <span className={`text-[11px] tabular-nums ${length > NOTICE_MAX ? 'text-red-400' : length > NOTICE_MAX - 50 ? 'text-amber-300' : 'text-zinc-600'}`}>
            {length}/{NOTICE_MAX}
          </span>
          <Button size="sm" variant="primary" isLoading={busy} disabled={!!problem || length < 2} onClick={() => void post()}>
            <Send className="mr-1.5 h-3.5 w-3.5" /> Post
          </Button>
        </div>
      </div>
      {(error || problem) && <p className="px-2 text-xs text-amber-300">{error || problem}</p>}
      <p className="px-2 text-[11px] text-zinc-500">Everyone on the club&apos;s teams sees it, and nobody can reply. No emails, phone numbers or links.</p>
    </div>
  );
}

function NoticeCard({ notice, canDelete, isNew, now }: { notice: ClubNotice; canDelete: boolean; isNew: boolean; now: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm('Delete this notice for everyone?')) return;
    setBusy(true);
    await createClient().rpc('delete_club_notice', { p_id: notice.id });
    setBusy(false);
    router.refresh();
  }

  return (
    <li className={`rounded-3xl border bg-zinc-900/70 p-4 ${isNew ? 'border-sky-500/30' : 'border-zinc-800'}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500/30 to-indigo-500/30 text-sm font-black text-sky-200 ring-1 ring-sky-400/30">
          {notice.author_name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-semibold text-white">{notice.author_name}</span>
            {notice.team_name && <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[11px] font-medium text-zinc-300">{notice.team_name}</span>}
            {isNew && <span className="rounded-full bg-sky-400 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-zinc-950">New</span>}
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-zinc-500">
            <CalendarDays className="h-3 w-3" /> Head coach · {timeAgo(notice.created_at, now)}
          </p>
          <p className="mt-2.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-zinc-100">{notice.body}</p>
        </div>
        {canDelete && (
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            aria-label="Delete notice"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-zinc-600 hover:bg-zinc-800 hover:text-zinc-300"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </li>
  );
}
