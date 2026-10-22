// src/app/(app)/teams/page.tsx
import React from 'react';
import Link from 'next/link';
import { ClubBoardLink } from '@/components/clubs/ClubBoardLink';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { TeamsActions } from './TeamsActions';
import { Shield, ChevronRight } from 'lucide-react';
import { isStaff, ROLE_LABELS, type TeamRole } from '@/lib/coachSide';
import { clubById } from '@/lib/clubs';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Teams - Deadeye' };

export default async function TeamsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.from('team_members').select('role, teams(id, name)').eq('user_id', user.id);
  const teams = ((data || []) as unknown as Array<{ role: TeamRole; teams: { id: string; name: string } | null }>).filter((m) => m.teams);
  // The club boards your teams are on (00053); none before the migration
  const { data: links } = teams.length
    ? await supabase.from('club_team_links').select('club_id').eq('status', 'approved').in('team_id', teams.map((m) => m.teams!.id))
    : { data: [] };
  const boards = [...new Set((links || []).map((l) => l.club_id))].map(clubById).filter((c) => c !== null);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center shadow-lg">
            <Shield className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">Teams</h1>
            <p className="text-sm text-zinc-400">Your club or school team on Deadeye</p>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-amber-600/40 bg-amber-600/10 p-4 text-sm text-amber-200">
            Teams aren&apos;t switched on yet. Run migration <code>00022_games_and_teams.sql</code> in Supabase.
          </p>
        ) : (
          <>
            {teams.some((m) => isStaff(m.role)) && (
              <Link href="/coach" className="flex items-center justify-between rounded-2xl border border-indigo-600/40 bg-indigo-600/10 px-4 py-3 text-sm font-semibold text-indigo-200 hover:bg-indigo-600/15">
                Coach home: all your teams this week <ChevronRight className="h-4 w-4" />
              </Link>
            )}
            {boards.map((club) => (
              <ClubBoardLink key={club.id} club={club} />
            ))}
            {teams.length > 0 && (
              <section className="space-y-2">
                {teams.map((m) => (
                  <Link
                    key={m.teams!.id}
                    href={`/teams/${m.teams!.id}`}
                    className="flex items-center justify-between rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 hover:bg-zinc-900"
                  >
                    <div>
                      <div className="font-bold text-white">{m.teams!.name}</div>
                      <div className="text-xs text-zinc-500">{ROLE_LABELS[m.role] ?? 'Player'}</div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-zinc-600" />
                  </Link>
                ))}
              </section>
            )}
            <TeamsActions />
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400 space-y-1">
              <p className="font-semibold text-zinc-200">How teams work</p>
              <p>Coaches create a team and share its code or link. Players join for free.</p>
              <p>
                Everyone on the team sees the roster&apos;s training totals and game averages. Coaches post assignments players tick off.
                Notes, videos and AI reports always stay private.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
