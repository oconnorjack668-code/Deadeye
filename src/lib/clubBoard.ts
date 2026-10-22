// src/lib/clubBoard.ts
// The club board (00053): one page per club for the players and coaches of
// its teams, once the founder has approved each team. Head coaches post
// notices and set a club challenge; everyone sees team totals, never a
// single player. The database enforces every rule; these mirror them so the
// screens can explain them first.

/** Team totals show only with this many players, so no one child can be picked out (club_teams) */
export const CLUB_TEAM_MIN = 3;
export const NOTICE_MAX = 500;
export const NOTICES_PER_DAY = 5;
export const CHALLENGE_MAX_DAYS = 92;

export type ChallengeMetric = 'sessions' | 'shots';

export interface ClubTeam {
  team_id: string;
  name: string;
  age_group: string | null;
  league_id: string | null;
  players: number;
  /** Null when the team has fewer than CLUB_TEAM_MIN players */
  sessions_7d: number | null;
  shots_7d: number | null;
  active_7d: number | null;
  mine: boolean;
}

export interface ClubNotice {
  id: string;
  body: string;
  created_at: string;
  author_name: string;
  team_name: string | null;
  mine: boolean;
}

export interface ClubChallenge {
  metric: ChallengeMetric;
  target: number;
  starts_on: string;
  ends_on: string;
  progress: number;
}

export interface ClubLink {
  club_id: string;
  status: 'pending' | 'approved';
}

/**
 * True when text holds an email address, a phone number (8 digits or more),
 * a link or a social account. Mirrors has_contact_details in 00053, so a coach
 * hears why before the database refuses it.
 */
export function hasContactDetails(text: string): boolean {
  if (/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(text)) return true;
  for (const m of text.matchAll(/\+?[0-9][0-9 ()-]{6,}[0-9]/g)) {
    if (m[0].replace(/[^0-9]/g, '').length >= 8) return true;
  }
  if (/(https?:\/\/|www\.|\b[a-z0-9-]+\.(com|ie|net|org|co|uk|ly|me|io|app)\b)/i.test(text)) return true;
  return /(snapchat|whatsapp|insta(gram)?|tiktok|telegram|discord)\b/i.test(text);
}

/** What is wrong with a notice before it is sent, or null */
export function noticeProblem(raw: string): string | null {
  const text = raw.replace(/[ \t]+/g, ' ').trim();
  if (text.length < 2) return 'Write your notice first.';
  if (text.length > NOTICE_MAX) return `Keep it to ${NOTICE_MAX} characters.`;
  if (hasContactDetails(text)) return 'Notices cannot include emails, phone numbers, links or social accounts.';
  return null;
}

/** Days left including today, from Irish dates (YYYY-MM-DD); 0 once it has ended */
export function daysLeft(endsOn: string, today: string): number {
  const ms = Date.parse(`${endsOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.max(0, Math.round(ms / 86_400_000) + 1);
}

export function challengePercent(c: Pick<ClubChallenge, 'progress' | 'target'>): number {
  return c.target > 0 ? Math.min(100, Math.round((c.progress / c.target) * 100)) : 0;
}

export function metricLabel(metric: ChallengeMetric, n: number): string {
  return metric === 'shots' ? (n === 1 ? 'shot' : 'shots') : n === 1 ? 'session' : 'sessions';
}

/**
 * Teams in the order of the week: most sessions first, then the teams too
 * small to show, by name. Each gets its share of the busiest team, for bars.
 */
export function teamRace(teams: ClubTeam[]): Array<ClubTeam & { share: number; rank: number | null }> {
  const shown = teams.filter((t) => t.sessions_7d !== null).sort((a, b) => b.sessions_7d! - a.sessions_7d! || a.name.localeCompare(b.name, 'en'));
  const hidden = teams.filter((t) => t.sessions_7d === null).sort((a, b) => a.name.localeCompare(b.name, 'en'));
  const top = Math.max(1, ...shown.map((t) => t.sessions_7d!));
  return [
    ...shown.map((t, i) => ({ ...t, share: t.sessions_7d! / top, rank: t.sessions_7d! > 0 ? i + 1 : null })),
    ...hidden.map((t) => ({ ...t, share: 0, rank: null })),
  ];
}

/** "WB" for Wexford BC: the crest when a club has no badge of its own */
export function clubInitials(name: string): string {
  const words = name
    .replace(/\(.*?\)/g, '')
    .split(/[\s-]+/)
    .filter((w) => w && !/^(of|the|and|&)$/i.test(w));
  const letters = words.length === 1 ? words[0].slice(0, 2) : words.slice(0, 2).map((w) => w[0]).join('');
  return letters.toUpperCase();
}

/** "just now", "5m", "3h", "2d", or a date for anything older than a week */
export function timeAgo(iso: string, now: number = Date.now()): string {
  const s = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 7 * 86_400) return `${Math.floor(s / 86_400)}d ago`;
  return new Date(iso).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', timeZone: 'Europe/Dublin' });
}

/** Today in Irish time, as the database counts the week and the challenge */
export function irishToday(now: Date = new Date()): string {
  return now.toLocaleDateString('en-CA', { timeZone: 'Europe/Dublin' });
}
