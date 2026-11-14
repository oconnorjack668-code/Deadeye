// src/lib/plays/access.ts
// SERVER: the questions the plays pages ask about the signed-in user, run
// with their own Supabase client so row-level security still decides what
// comes back. Kept here so the pages and the server actions ask them the
// same way.
import type { createClient } from '@/lib/supabase/server';
import type { TeamRole } from '@/lib/coachSide';
import { buildQuiz, knowsIt } from './quiz';
import { PLAY_COLUMNS, toPlay, type Play, type PlayRow } from './rows';

type Client = Awaited<ReturnType<typeof createClient>>;

export interface StaffTeam {
  id: string;
  name: string;
  role: TeamRole;
}

/**
 * Whether this account coaches (a coach setup row, or a head or assistant
 * coach of some team, as is_coach_account in 00047), and the teams it is
 * staff on.
 */
export async function coachAccess(supabase: Client, userId: string): Promise<{ isCoach: boolean; staffTeams: StaffTeam[] }> {
  const [{ data: profile }, { data: memberships }] = await Promise.all([
    supabase.from('coach_profiles').select('user_id').eq('user_id', userId).maybeSingle(),
    supabase.from('team_members').select('role, teams(id, name)').eq('user_id', userId).in('role', ['coach', 'assistant']),
  ]);
  const staffTeams = ((memberships ?? []) as unknown as Array<{ role: TeamRole; teams: { id: string; name: string } | null }>)
    .filter((m) => m.teams)
    .map((m) => ({ id: m.teams!.id, name: m.teams!.name, role: m.role }));
  return { isCoach: !!profile || staffTeams.length > 0, staffTeams };
}

/**
 * Whether a play reaches this user from their coach: set for one of their
 * teams, or in one of their team playbooks. Row-level security only returns
 * assignments and playbook rows for teams they are on.
 */
export async function fromCoach(supabase: Client, playId: string): Promise<{ assigned: boolean; playbookTeams: string[] }> {
  const [{ data: assigned }, { data: playbook }] = await Promise.all([
    supabase.from('team_assignments').select('id').eq('play_id', playId).limit(1),
    supabase.from('team_playbook').select('team_id').eq('play_id', playId),
  ]);
  return { assigned: (assigned ?? []).length > 0, playbookTeams: (playbook ?? []).map((r) => r.team_id) };
}

export interface CoachPlays {
  /** Plays set for the player's teams, newest first. */
  assigned: Array<{ assignmentId: string; title: string; dueDate: string | null; play: Play }>;
  /** Plays in their team playbooks that are not also set above. */
  playbook: Play[];
  /** Plays the player has passed the quiz on. */
  knows: Set<string>;
}

/**
 * What the player's coaches have given them: plays set as assignments and
 * plays in their team playbooks, for the teams they play on. Empty before
 * 00061 has run (the queries fail and read as nothing).
 */
export async function coachPlaysFor(supabase: Client, userId: string): Promise<CoachPlays> {
  const empty: CoachPlays = { assigned: [], playbook: [], knows: new Set() };
  const { data: teams } = await supabase.from('team_members').select('team_id').eq('user_id', userId).eq('role', 'player');
  const teamIds = (teams ?? []).map((t) => t.team_id);
  if (!teamIds.length) return empty;

  // '*' so the query still works before 00061 adds play_id
  const [{ data: assignments }, { data: book }] = await Promise.all([
    supabase.from('team_assignments').select('*').in('team_id', teamIds).order('created_at', { ascending: false }).limit(30),
    supabase.from('team_playbook').select('play_id').in('team_id', teamIds),
  ]);
  const setRows = (assignments ?? []).filter((a) => a.play_id).slice(0, 5);
  const ids = [...new Set([...setRows.map((a) => a.play_id as string), ...(book ?? []).map((b) => b.play_id)])];
  if (!ids.length) return empty;

  const [{ data: rows }, { data: attempts }] = await Promise.all([
    supabase.from('plays').select(PLAY_COLUMNS).in('id', ids) as unknown as Promise<{ data: PlayRow[] | null }>,
    supabase.from('play_quiz_attempts').select('play_id, score').eq('user_id', userId).in('play_id', ids),
  ]);
  const plays = new Map<string, Play>();
  for (const row of rows ?? []) {
    const play = toPlay(row);
    if (play) plays.set(play.id, play);
  }
  const knows = new Set<string>();
  for (const a of attempts ?? []) {
    const play = plays.get(a.play_id);
    if (play && knowsIt(a.score, buildQuiz(play.diagram).length)) knows.add(a.play_id);
  }
  const assigned = setRows.flatMap((a) => {
    const play = plays.get(a.play_id as string);
    return play ? [{ assignmentId: a.id, title: a.title, dueDate: a.due_date, play }] : [];
  });
  const setIds = new Set(assigned.map((a) => a.play.id));
  const playbook = [...new Set((book ?? []).map((b) => b.play_id))].filter((id) => !setIds.has(id)).flatMap((id) => plays.get(id) ?? []);
  return { assigned, playbook, knows };
}
