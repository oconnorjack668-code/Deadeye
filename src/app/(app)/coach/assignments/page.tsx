// src/app/(app)/coach/assignments/page.tsx
// Every assignment across the teams you coach, with how many players have done
// it, and a form to post a new one (?play=<id> starts it on a play, from
// "Assign to team" on a play page; ?clip= and ?pack= do the same for film). A
// play or film assignment opens its progress view.
import React from 'react';
import Link from 'next/link';
import { getHasPro, requireUser } from '@/lib/auth';
import { filmOpenForMe } from '@/lib/film/live';
import { createClient } from '@/lib/supabase/server';
import { assignmentProgress } from '@/lib/coachSide';
import { userCalendarNow } from '@/lib/userTime';
import { PostAssignment, type FilmChoice, type PlayChoice } from './PostAssignment';
import { ClipboardList } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Assignments - Deadeye' };

type Team = { id: string; name: string };
type Row = { id: string; team_id: string; title: string; due_date: string | null; play_id: string | null; film: boolean; done: number; of: number; team: string };

/** The plays a coach can set: their own, their team playbooks, then the library (Pro plays locked on Free). */
async function playChoices(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, teamIds: string[]): Promise<PlayChoice[]> {
  const [{ data: own }, { data: book }, { data: library }, isPro] = await Promise.all([
    supabase.from('plays').select('id, title').eq('owner_id', userId).order('title'),
    teamIds.length
      ? (supabase.from('team_playbook').select('plays(id, title, owner_id)').in('team_id', teamIds) as unknown as Promise<{
          data: Array<{ plays: { id: string; title: string; owner_id: string | null } | null }> | null;
        }>)
      : Promise.resolve({ data: [] }),
    supabase.from('plays').select('id, title, is_free').is('owner_id', null).order('title'),
    getHasPro(),
  ]);
  const choices: PlayChoice[] = (own ?? []).map((p) => ({ id: p.id, title: p.title, group: 'Your plays' as const }));
  const seen = new Set(choices.map((c) => c.id));
  for (const row of book ?? []) {
    const p = row.plays;
    if (!p || seen.has(p.id) || p.owner_id === null) continue;
    seen.add(p.id);
    choices.push({ id: p.id, title: p.title, group: 'Team playbooks' });
  }
  for (const p of library ?? []) {
    choices.push({ id: p.id, title: p.title, group: 'Library', locked: !p.is_free && !isPro });
  }
  return choices;
}

/**
 * The film a coach can set: their own packs, published library packs, then
 * published clips. Film is never part of Pro (see opensFor), so nothing is
 * locked. Empty before 00062 has run.
 */
async function filmChoices(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<FilmChoice[]> {
  const [{ data: packs }, { data: clips }] = await Promise.all([
    supabase.from('film_packs').select('id, title, owner_id, is_free').or(`owner_id.eq.${userId},owner_id.is.null`).order('title'),
    supabase.from('film_clips').select('id, title, is_free').order('title'),
  ]);
  const own = (packs ?? []).filter((p) => p.owner_id === userId);
  const choices: FilmChoice[] = own.map((p) => ({
    id: p.id,
    kind: 'pack' as const,
    title: p.title,
    group: 'Your packs' as const,
    // Film is never part of Pro (YouTube Developer Policies III.F.3.a; see opensFor)
    locked: false,
  }));
  for (const p of packs ?? []) {
    if (p.owner_id === null) choices.push({ id: p.id, kind: 'pack', title: p.title, group: 'Library packs', locked: false });
  }
  for (const c of clips ?? []) choices.push({ id: c.id, kind: 'clip', title: c.title, group: 'Clips', locked: false });
  return choices;
}

export default async function CoachAssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ team?: string; play?: string; clip?: string; pack?: string }>;
}) {
  const user = await requireUser();
  const { team: defaultTeam, play: defaultPlay, clip: defaultClip, pack: defaultPack } = await searchParams;
  const defaultFilm = defaultClip ? { kind: 'clip' as const, id: defaultClip } : defaultPack ? { kind: 'pack' as const, id: defaultPack } : null;
  const supabase = await createClient();
  const [{ data: memberships }, { today }] = await Promise.all([
    supabase.from('team_members').select('teams(id, name)').eq('user_id', user.id).in('role', ['coach', 'assistant']),
    userCalendarNow(),
  ]);
  const teams = ((memberships || []) as unknown as Array<{ teams: Team | null }>).map((m) => m.teams).filter(Boolean) as Team[];
  const teamIds = teams.map((t) => t.id);

  let rows: Row[] = [];
  let plays: PlayChoice[] = [];
  let film: FilmChoice[] = [];
  if (teamIds.length) {
    // '*' rather than a column list: play_id only exists once 00061 has run
    const [{ data: rawAssignments }, { data: players }, choices, filmList] = await Promise.all([
      supabase.from('team_assignments').select('*').in('team_id', teamIds).order('created_at', { ascending: false }).limit(60),
      supabase.from('team_members').select('team_id, user_id').in('team_id', teamIds).eq('role', 'player'),
      playChoices(supabase, user.id, teamIds),
      // Film is not set while it is closed (src/lib/film/live.ts)
      filmOpenForMe().then((open) => (open ? filmChoices(supabase, user.id) : [])),
    ]);
    plays = choices;
    film = filmList;
    const assignments = (rawAssignments ?? []).map((a) => ({
      id: a.id,
      team_id: a.team_id,
      title: a.title,
      due_date: a.due_date,
      play_id: a.play_id ?? null,
      film: !!(a.film_clip_id || a.film_pack_id),
    }));
    const ids = (assignments || []).map((a) => a.id);
    const { data: completions } = ids.length
      ? await supabase.from('team_assignment_completions').select('assignment_id, user_id').in('assignment_id', ids)
      : { data: [] as Array<{ assignment_id: string; user_id: string }> };
    rows = (assignments || []).map((a) => {
      const teamPlayers = (players || []).filter((p) => p.team_id === a.team_id).map((p) => p.user_id);
      const [progress] = assignmentProgress([a], completions || [], teamPlayers);
      return { ...a, done: progress.done, of: progress.of, team: teams.find((t) => t.id === a.team_id)?.name ?? '' };
    });
  }
  const isOpen = (r: Row) => !r.due_date || r.due_date >= today;
  const open = rows.filter(isOpen);
  const past = rows.filter((r) => !isOpen(r)).slice(0, 10);

  const list = (items: Row[]) => (
    <ul className="space-y-2">
      {items.map((a) => (
        <li key={a.id}>
          <Link
            href={a.play_id || a.film ? `/coach/assignments/${a.id}` : `/teams/${a.team_id}`}
            className="block rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 hover:bg-zinc-900"
          >
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate font-semibold text-white">{a.title}</span>
              <span className="flex-shrink-0 text-xs text-zinc-400">
                {a.done}/{a.of} done
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden>
              <div className="h-full rounded-full bg-cyan-500" style={{ width: `${a.of ? Math.round((a.done / a.of) * 100) : 0}%` }} />
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              {[
                teams.length > 1 ? a.team : null,
                a.due_date
                  ? `Due ${new Date(`${a.due_date}T00:00:00`).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' })}`
                  : 'No due date',
                a.play_id ? 'Play: see who knows it' : null,
                a.film ? 'Film: see who has watched it' : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-500 flex items-center justify-center shadow-lg">
            <ClipboardList className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Assignments</h1>
            <p className="text-sm text-zinc-400">Training for between sessions</p>
          </div>
        </div>

        {teams.length === 0 ? (
          <p className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-sm text-zinc-400">
            You&apos;re not coaching a team yet.{' '}
            <Link href="/coach/setup?step=team" className="text-cyan-400 underline">
              Set one up
            </Link>
          </p>
        ) : (
          <>
            <PostAssignment teams={teams} defaultTeam={defaultTeam ?? null} myId={user.id} plays={plays} defaultPlay={defaultPlay ?? null} film={film} defaultFilm={defaultFilm} />
            <section className="space-y-2">
              <h2 className="font-bold text-white">Open</h2>
              {open.length ? list(open) : <p className="text-sm text-zinc-500">Nothing open. Post one above.</p>}
            </section>
            {past.length > 0 && (
              <section className="space-y-2">
                <h2 className="font-bold text-zinc-400">Finished</h2>
                {list(past)}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
