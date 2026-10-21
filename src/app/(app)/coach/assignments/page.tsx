// src/app/(app)/coach/assignments/page.tsx
// Every assignment across the teams you coach, with how many players have done
// it, and a form to post a new one.
import React from 'react';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { assignmentProgress } from '@/lib/coachSide';
import { userCalendarNow } from '@/lib/userTime';
import { PostAssignment } from './PostAssignment';
import { ClipboardList } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Assignments - Deadeye' };

type Team = { id: string; name: string };
type Row = { id: string; team_id: string; title: string; due_date: string | null; done: number; of: number; team: string };

export default async function CoachAssignmentsPage({ searchParams }: { searchParams: Promise<{ team?: string }> }) {
  const user = await requireUser();
  const { team: defaultTeam } = await searchParams;
  const supabase = await createClient();
  const [{ data: memberships }, { today }] = await Promise.all([
    supabase.from('team_members').select('teams(id, name)').eq('user_id', user.id).in('role', ['coach', 'assistant']),
    userCalendarNow(),
  ]);
  const teams = ((memberships || []) as unknown as Array<{ teams: Team | null }>).map((m) => m.teams).filter(Boolean) as Team[];
  const teamIds = teams.map((t) => t.id);

  let rows: Row[] = [];
  if (teamIds.length) {
    const [{ data: assignments }, { data: players }] = await Promise.all([
      supabase.from('team_assignments').select('id, team_id, title, due_date').in('team_id', teamIds).order('created_at', { ascending: false }).limit(60),
      supabase.from('team_members').select('team_id, user_id').in('team_id', teamIds).eq('role', 'player'),
    ]);
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
          <Link href={`/teams/${a.team_id}`} className="block rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 hover:bg-zinc-900">
            <div className="flex items-baseline justify-between gap-3">
              <span className="min-w-0 truncate font-semibold text-white">{a.title}</span>
              <span className="flex-shrink-0 text-xs text-zinc-400">
                {a.done}/{a.of} done
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden>
              <div className="h-full rounded-full bg-cyan-500" style={{ width: `${a.of ? Math.round((a.done / a.of) * 100) : 0}%` }} />
            </div>
            <p className="mt-1 text-xs text-zinc-500">
              {[
                teams.length > 1 ? a.team : null,
                a.due_date
                  ? `Due ${new Date(`${a.due_date}T00:00:00`).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' })}`
                  : 'No due date',
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
            <PostAssignment teams={teams} defaultTeam={defaultTeam ?? null} myId={user.id} />
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
