// src/lib/friends.ts
// Shapes returned by the friends database functions (00021) and helpers for the friends screens.

export interface FriendRow {
  friendship_id: string | null;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  player_position: string | null;
  status: 'friend' | 'incoming' | 'outgoing';
  is_me: boolean;
  sessions_7d: number | null;
  workouts_7d: number | null;
  minutes_7d: number | null;
  makes_7d: number | null;
  attempts_7d: number | null;
  streak: number | null;
  last_active: string | null;
}

export interface FeedItem {
  user_id: string;
  display_name: string;
  kind: 'hoops' | 'gym' | 'game' | 'badge';
  happened_on: string;
  created_at: string;
  title: string;
  detail: string | null;
}

export type RequestResult = 'sent' | 'accepted' | 'already' | 'self' | 'not_found' | 'limit' | 'closed';

export const REQUEST_MESSAGES: Record<RequestResult, string> = {
  sent: 'Friend request sent.',
  accepted: 'You are now friends!',
  already: "You're already friends, or a request is waiting.",
  self: "That's your own code.",
  not_found: 'No player has that code. Check the 6 letters and numbers.',
  limit: "You've reached the friend request limit. Wait for some to be accepted first.",
  closed: "This player isn't accepting friend requests right now.",
};

/**
 * Friends leaderboard score for the last 7 days: rewards showing up (sessions/workouts),
 * time put in and shots made, so shooters and gym players can both compete.
 */
export function weeklyScore(r: Pick<FriendRow, 'sessions_7d' | 'workouts_7d' | 'minutes_7d' | 'makes_7d'>): number {
  return (r.sessions_7d || 0) * 20 + (r.workouts_7d || 0) * 20 + Math.round((r.minutes_7d || 0) / 5) + (r.makes_7d || 0);
}

export function rankFriends(rows: FriendRow[]): FriendRow[] {
  return rows
    .filter((r) => r.status === 'friend')
    .sort((a, b) => weeklyScore(b) - weeklyScore(a) || a.display_name.localeCompare(b.display_name));
}

/**
 * Friends who have logged something in the last 7 days, most active first.
 *
 * For the dashboard, where it is worth more than the global leaderboard:
 * players with friends on the platform churn at roughly half the rate of solo
 * ones, and for an individual-skill sport "three of your mates trained this
 * week" carries far more than a national rank the player will never reach. It
 * is also the social proof the app already has the data for and never showed -
 * this comes from the same friends_overview the Friends page loads.
 *
 * Excludes the player themselves: being told you trained is not social proof.
 */
export function activeFriendsThisWeek(rows: FriendRow[]): FriendRow[] {
  return rows
    .filter((r) => r.status === 'friend' && !r.is_me && (r.sessions_7d || 0) + (r.workouts_7d || 0) > 0)
    .sort((a, b) => weeklyScore(b) - weeklyScore(a) || a.display_name.localeCompare(b.display_name));
}

/**
 * How that reads on the dashboard, or null when there is nothing worth saying.
 *
 * Names up to two, because "Aoife and Cian trained this week" is a nudge from
 * people you know and "4 friends trained this week" is a statistic. Silent at
 * zero rather than reporting an empty week back at the player.
 */
export function squadActivityLine(rows: FriendRow[]): string | null {
  const active = activeFriendsThisWeek(rows);
  if (active.length === 0) return null;
  const [first, second] = active;
  if (active.length === 1) return `${first.display_name} trained this week`;
  if (active.length === 2) return `${first.display_name} and ${second.display_name} trained this week`;
  return `${first.display_name}, ${second.display_name} and ${active.length - 2} more trained this week`;
}

export function normaliseCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
}
