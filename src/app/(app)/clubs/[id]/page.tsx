// src/app/(app)/clubs/[id]/page.tsx
// A club board (00053): for the players and coaches of the club teams the
// founder approved, and the owner. Anyone else gets a 404, the same as for
// a club with no board.
import React from 'react';
import { notFound } from 'next/navigation';
import { checkIsOwner, requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { clubById, clubPlace } from '@/lib/clubs';
import { irishToday, type ClubChallenge, type ClubNotice, type ClubTeam } from '@/lib/clubBoard';
import { ClubBoard } from '@/components/clubs/ClubBoard';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return { title: `${clubById(id)?.name ?? 'Club'} board - Deadeye` };
}

export default async function ClubBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const club = clubById(id);
  if (!club) notFound();
  const user = await requireUser();
  const supabase = await createClient();
  const { data: canRead, error } = await supabase.rpc('can_read_club', { p_club: club.id });
  if (error || !canRead) notFound();

  const [teams, notices, challenge, coaching, isOwner] = await Promise.all([
    supabase.rpc('club_teams', { p_club: club.id }),
    supabase.rpc('club_notices_for', { p_club: club.id }),
    supabase.rpc('club_challenge_for', { p_club: club.id }),
    supabase.from('team_members').select('team_id').eq('user_id', user.id).eq('role', 'coach'),
    checkIsOwner(),
  ]);
  const boardTeams = (teams.data || []) as ClubTeam[];
  // Server time, passed down so "2h ago" renders the same in the browser
  const now = new Date();
  const headCoachOf = new Set((coaching.data || []).map((m) => m.team_id));

  return (
    <ClubBoard
      club={{ id: club.id, name: club.name, place: clubPlace(club) }}
      teams={boardTeams}
      notices={(notices.data || []) as ClubNotice[]}
      challenge={((challenge.data || [])[0] as ClubChallenge | undefined) ?? null}
      myCoachTeams={boardTeams.filter((t) => headCoachOf.has(t.team_id)).map((t) => ({ id: t.team_id, name: t.name }))}
      canModerate={isOwner}
      today={irishToday(now)}
      now={now.getTime()}
    />
  );
}
