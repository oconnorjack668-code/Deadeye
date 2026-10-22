// src/lib/coachSide.ts
// The coach side (00047_coach_side.sql): which side of the app opens, the
// team details a coach picks at setup, team roles, the join link and the
// messages a coach sends to players and parents. Pure, so the rules are
// testable without a database.
import type { AppMode } from './supabase/types';

export type AccountRole = 'player' | 'coach' | 'both';
export type TeamRole = 'coach' | 'assistant' | 'player';

/**
 * The side of the app this account sees. A coach-only account has nothing on
 * the playing side to show (no player setup, no sessions), and a player-only
 * account has no team to coach, so only "both" switches, and it opens in the
 * mode used last.
 */
export function appModeFor(profile: { account_role?: string | null; app_mode?: string | null } | null | undefined): AppMode {
  if (!profile) return 'playing';
  if (profile.account_role === 'coach') return 'coaching';
  if (profile.account_role === 'both') return profile.app_mode === 'coaching' ? 'coaching' : 'playing';
  return 'playing';
}

/**
 * The mode the menus show. The coach pages always show coaching, whatever was
 * saved: Coach home opened from the Train hub kept the player menu, with the
 * floating log button over its quick actions.
 */
export function shownMode(saved: AppMode, pathname: string): AppMode {
  return pathname === '/coach' || pathname.startsWith('/coach/') ? 'coaching' : saved;
}

/** Where each mode starts. */
export const MODE_HOME: Record<AppMode, string> = { playing: '/dashboard', coaching: '/coach' };

/** Age groups and levels, exactly as teams_details_check (00024) accepts them. */
// Basketball Ireland grades U9 to U18 by year of birth, then U20 (00052)
export const AGE_GROUPS = ['U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'U20', 'Senior', 'Masters', 'Mixed'] as const;
export const TEAM_LEVELS = [
  { value: 'recreational', label: 'Recreational' },
  { value: 'school', label: 'School' },
  { value: 'club', label: 'Club league' },
  { value: 'regional', label: 'Regional' },
  { value: 'national', label: 'National League' },
  { value: 'elite', label: 'Elite / academy' },
] as const;

// In-app places a coach can point an assignment at
export const ASSIGNMENT_LINKS = [
  { value: '', label: 'No link' },
  { value: '/basketball/new', label: 'Log a hoops session' },
  { value: '/workouts/new', label: 'Log a workout' },
  { value: '/games/new', label: 'Log a game' },
  { value: '/video', label: 'Video: shot tracker / form check' },
  { value: '/programs', label: 'Programs' },
  { value: '/drills', label: 'Drill library' },
  { value: '/study', label: 'IQ Study' },
  { value: '/workouts/tests', label: 'Athletic tests' },
];

export const ROLE_LABELS: Record<TeamRole, string> = { coach: 'Head coach', assistant: 'Assistant coach', player: 'Player' };

/** Head and assistant coaches can post assignments and share the code. */
export function isStaff(role: string | null | undefined): boolean {
  return role === 'coach' || role === 'assistant';
}

/** The page a team code opens. Shared as a link and in the QR code. */
export function teamJoinPath(code: string): string {
  return `/teams/join/${encodeURIComponent(code.toUpperCase())}`;
}

/** What a coach sends the team's players. */
export function playerInviteMessage(team: { name: string }, code: string, link: string): string {
  return `Join ${team.name} on Deadeye, the basketball training app. Tap ${link} or enter the team code ${code}. It's free.`;
}

/**
 * What a coach sends parents. It says what the coach sees and what they do
 * not, because that is the first thing a parent of a 14 year old asks, and
 * the answer has to match the app: totals always, details only if the player
 * shares them, never notes or videos, and no private messages.
 */
export function parentMessage(team: { name: string }, code: string, link: string, coachName: string): string {
  return [
    `Hi, I'm using Deadeye with ${team.name} this season to set training for between sessions.`,
    `Players join for free at ${link} (team code ${code}).`,
    'I see how much each player trains each week. I only see more detail if your child chooses to share it, and never their notes or videos. There are no private messages: I post to the whole team.',
    'Players under 16 need a parent to approve their account, and the app will ask you.',
    `Thanks, ${coachName}`,
  ].join('\n\n');
}

export interface AssignmentProgress {
  id: string;
  done: number;
  of: number;
}

/**
 * How many of the team's players have ticked off each assignment. Only
 * players count: coaches and assistants are on the team but not doing it.
 */
export function assignmentProgress(
  assignments: Array<{ id: string }>,
  completions: Array<{ assignment_id: string; user_id: string }>,
  playerIds: string[]
): AssignmentProgress[] {
  const players = new Set(playerIds);
  return assignments.map((a) => ({
    id: a.id,
    done: completions.filter((c) => c.assignment_id === a.id && players.has(c.user_id)).length,
    of: players.size,
  }));
}

/**
 * A join link opened by someone without an account sends them to log in, and
 * from there to sign up, setup and the welcome screen, and the team was lost.
 * The code is kept on the device and the welcome screen and coach setup offer
 * it, as friend invites do (src/lib/friends.ts).
 */
const PENDING_TEAM_KEY = 'deadeye-pending-team';

export function rememberTeamInvite(redirectTo: string): void {
  const match = redirectTo.match(/^\/teams\/join\/([A-Za-z0-9]{6})$/);
  if (!match) return;
  try {
    localStorage.setItem(PENDING_TEAM_KEY, match[1].toUpperCase());
  } catch {
    // Storage blocked: they can still join with the code
  }
}

export function pendingTeamInvite(): string | null {
  try {
    return localStorage.getItem(PENDING_TEAM_KEY);
  } catch {
    return null;
  }
}

export function clearTeamInvite(): void {
  try {
    localStorage.removeItem(PENDING_TEAM_KEY);
  } catch {
    // Nothing to clear
  }
}
