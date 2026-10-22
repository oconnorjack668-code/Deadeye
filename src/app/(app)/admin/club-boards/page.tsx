// src/app/(app)/admin/club-boards/page.tsx
// Owner only: teams asking to join a club board (00053). The founder checks
// with the club that the team and its head coach are really theirs, then
// approves or declines. Only approved teams can see a club board, so this is
// what stops anyone making a team, naming a club and reading its board.
import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { checkIsOwner } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { PageHeader } from '@/components/layout/PageHeader';
import { clubById, clubPlace } from '@/lib/clubs';
import { teamLeagueText } from '@/lib/leagues';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Club boards - Deadeye' };

const UUID = /^[0-9a-f-]{36}$/i;

async function approve(formData: FormData) {
  'use server';
  if (!(await checkIsOwner())) return;
  const team = String(formData.get('team') || '');
  if (!UUID.test(team)) return;
  await createAdminClient()
    .from('club_team_links')
    .update({ status: 'approved', approved_at: new Date().toISOString() })
    .eq('team_id', team)
    .eq('status', 'pending');
  revalidatePath('/admin/club-boards');
}

/** Declining a request, or taking an approved team off its board */
async function remove(formData: FormData) {
  'use server';
  if (!(await checkIsOwner())) return;
  const team = String(formData.get('team') || '');
  if (!UUID.test(team)) return;
  await createAdminClient().from('club_team_links').delete().eq('team_id', team);
  revalidatePath('/admin/club-boards');
}

interface LinkRow {
  team_id: string;
  club_id: string;
  status: 'pending' | 'approved';
  requested_by: string | null;
  created_at: string;
}

function when(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', timeZone: 'Europe/Dublin' });
}

export default async function ClubBoardsAdminPage() {
  if (!(await checkIsOwner())) notFound();
  const admin = createAdminClient();
  const { data, error } = await admin.from('club_team_links').select('team_id, club_id, status, requested_by, created_at').order('created_at').limit(500);
  const links = (data || []) as LinkRow[];
  const teamIds = links.map((l) => l.team_id);
  const askers = [...new Set(links.map((l) => l.requested_by).filter((id): id is string => !!id))];

  const [teams, members, coaches, profiles] = teamIds.length
    ? await Promise.all([
        admin.from('teams').select('id, name, age_group, league_id').in('id', teamIds),
        admin.from('team_members').select('team_id, role').in('team_id', teamIds),
        admin.from('coach_profiles').select('user_id, club_name').in('user_id', askers),
        admin.from('profiles').select('id, display_name').in('id', askers),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }];
  const team = new Map((teams.data || []).map((t) => [t.id, t]));
  const players = new Map<string, number>();
  for (const m of members.data || []) if (m.role === 'player') players.set(m.team_id, (players.get(m.team_id) ?? 0) + 1);
  const coachClub = new Map((coaches.data || []).map((c) => [c.user_id, c.club_name]));
  const coachName = new Map((profiles.data || []).map((p) => [p.id, p.display_name]));

  const pending = links.filter((l) => l.status === 'pending');
  const boards = new Map<string, LinkRow[]>();
  for (const l of links.filter((x) => x.status === 'approved')) boards.set(l.club_id, [...(boards.get(l.club_id) ?? []), l]);

  const teamLine = (l: LinkRow) => {
    const t = team.get(l.team_id);
    const n = players.get(l.team_id) ?? 0;
    return [t?.age_group, teamLeagueText(t?.league_id), `${n} ${n === 1 ? 'player' : 'players'}`].filter(Boolean).join(' · ');
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-2xl space-y-5 p-4 md:p-8">
        <PageHeader tone="hoops" icon={Users} title="Club boards" subtitle="Teams asking to join their club's board" />
        {error ? (
          <p className="rounded-2xl border border-amber-600/40 bg-amber-600/10 p-4 text-sm text-amber-300">
            Run 00053_club_board.sql in the Supabase SQL editor to turn this on.
          </p>
        ) : (
          <>
            <section className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Waiting for you</h2>
              <p className="text-sm text-zinc-400">
                Before approving, check with the club (its Children&apos;s Officer or secretary, through its public channel) that this team
                and its head coach are theirs. An approved team sees the club&apos;s notices and team totals.
              </p>
              {pending.length === 0 ? (
                <p className="text-sm text-zinc-500">Nothing waiting.</p>
              ) : (
                <ul className="space-y-2">
                  {pending.map((l) => {
                    const club = clubById(l.club_id);
                    const others = boards.get(l.club_id)?.length ?? 0;
                    const typed = l.requested_by ? coachClub.get(l.requested_by) : null;
                    return (
                      <li key={l.team_id} className="rounded-2xl border border-amber-500/30 bg-zinc-900/70 p-4">
                        <div className="font-semibold text-white">{team.get(l.team_id)?.name ?? 'Team'}</div>
                        <div className="text-xs text-zinc-500">{teamLine(l)}</div>
                        <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
                          <dt className="text-zinc-500">Club</dt>
                          <dd className="text-zinc-200">
                            {club ? `${club.name}, ${clubPlace(club)}` : l.club_id}
                            {others > 0 && <span className="text-zinc-500"> · {others} {others === 1 ? 'team' : 'teams'} already on</span>}
                          </dd>
                          <dt className="text-zinc-500">Asked by</dt>
                          <dd className="text-zinc-200">
                            {(l.requested_by && coachName.get(l.requested_by)) || 'A head coach'}
                            {typed && <span className="text-zinc-500"> · club at setup: {typed}</span>}
                          </dd>
                          <dt className="text-zinc-500">Asked</dt>
                          <dd className="text-zinc-200">{when(l.created_at)}</dd>
                        </dl>
                        <div className="mt-3 flex gap-2">
                          <form action={approve} className="flex-1">
                            <input type="hidden" name="team" value={l.team_id} />
                            <button type="submit" className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-500">
                              Approve
                            </button>
                          </form>
                          <form action={remove}>
                            <input type="hidden" name="team" value={l.team_id} />
                            <button type="submit" className="rounded-xl bg-zinc-800 px-3 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700">
                              Decline
                            </button>
                          </form>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="space-y-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">Live boards</h2>
              {boards.size === 0 ? (
                <p className="text-sm text-zinc-500">No club boards yet.</p>
              ) : (
                <ul className="space-y-2">
                  {[...boards].map(([clubId, rows]) => (
                    <li key={clubId} className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                      <Link href={`/clubs/${clubId}`} className="font-semibold text-white underline-offset-2 hover:underline">
                        {clubById(clubId)?.name ?? clubId}
                      </Link>
                      <ul className="mt-2 space-y-1">
                        {rows.map((l) => (
                          <li key={l.team_id} className="flex items-center justify-between gap-3 text-sm">
                            <span className="min-w-0 truncate text-zinc-300">
                              {team.get(l.team_id)?.name ?? 'Team'} <span className="text-xs text-zinc-500">{teamLine(l)}</span>
                            </span>
                            <form action={remove}>
                              <input type="hidden" name="team" value={l.team_id} />
                              <button type="submit" className="text-xs text-zinc-500 underline hover:text-zinc-300">
                                Take off
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
