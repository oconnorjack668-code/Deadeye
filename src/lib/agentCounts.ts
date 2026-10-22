// src/lib/agentCounts.ts
// The weekly counts file the Agent OS reads (docs/agent-os/data/), written by
// api/cron/agent-counts every Monday so the founder no longer pastes it.
// Counts only: no names, emails, ids or report text ever go in it.
import type { Funnel } from '@/lib/funnel';
import { clubById } from '@/lib/clubs';

/** A club is named in counts only with this many players or more, so no child can be picked out */
export const CLUB_COUNT_MIN = 5;

export interface ReportCounts {
  /** Problem reports players sent in the last 7 days */
  reportsNew: number;
  /** Problem reports not marked resolved */
  reportsOpen: number;
  /** Crash reports not marked resolved */
  crashesOpen: number;
}

/** How clubs use Deadeye, for club-growth. Owner and test accounts are left out. */
export interface ClubCounts {
  coaches: number;
  teams: number;
  playersOnTeams: number;
  assignmentsThisWeek: number;
  /** Players who picked a home club (00051) */
  playersWithClub: number;
  /** Home clubs with CLUB_COUNT_MIN players or more, biggest first */
  bigClubs: Array<{ name: string; players: number }>;
  /** "My club is not listed" suggestions waiting for the founder */
  suggestionsOpen: number;
}

export interface ClubRows {
  coachProfiles: Array<{ user_id: string }>;
  teams: Array<{ id: string; created_by: string | null }>;
  members: Array<{ team_id: string; user_id: string; role: string }>;
  assignmentsThisWeek: Array<{ team_id: string; created_by: string | null }>;
  playerClubs?: Array<{ user_id: string; club_id: string }>;
  suggestionsOpen?: number;
}

export function clubCounts(rows: ClubRows, excluded: Set<string>): ClubCounts {
  const realTeams = new Set(rows.teams.filter((t) => !t.created_by || !excluded.has(t.created_by)).map((t) => t.id));
  const players = new Set(
    rows.members.filter((m) => m.role === 'player' && realTeams.has(m.team_id) && !excluded.has(m.user_id)).map((m) => m.user_id)
  );
  return {
    coaches: rows.coachProfiles.filter((c) => !excluded.has(c.user_id)).length,
    teams: realTeams.size,
    playersOnTeams: players.size,
    assignmentsThisWeek: rows.assignmentsThisWeek.filter((a) => realTeams.has(a.team_id) && !(a.created_by && excluded.has(a.created_by))).length,
    ...homeClubCounts(rows.playerClubs ?? [], excluded),
    suggestionsOpen: rows.suggestionsOpen ?? 0,
  };
}

function homeClubCounts(rows: Array<{ user_id: string; club_id: string }>, excluded: Set<string>) {
  const real = rows.filter((r) => !excluded.has(r.user_id));
  const perClub = new Map<string, number>();
  for (const r of real) perClub.set(r.club_id, (perClub.get(r.club_id) ?? 0) + 1);
  const bigClubs = [...perClub]
    .filter(([, n]) => n >= CLUB_COUNT_MIN)
    .map(([id, players]) => ({ name: clubById(id)?.name ?? id, players }))
    .sort((a, b) => b.players - a.players || a.name.localeCompare(b.name, 'en'));
  return { playersWithClub: real.length, bigClubs };
}

function pct(count: number, of: number): string {
  return of > 0 ? ` (${Math.round((count / of) * 100)}%)` : '';
}

export function countsFile(date: string, everyone: Funnel, week: Funnel, reports: ReportCounts, clubs?: ClubCounts): string {
  const lines = [
    `# Funnel, ${date}`,
    '',
    'Written by the weekly counts job (`api/cron/agent-counts`) from the same',
    'numbers as `/admin/funnel`, owner and test accounts left out. Percentages',
    'are of players who joined in the window. Counts only.',
  ];
  everyone.groups.forEach((group, g) => {
    lines.push('', `## ${group.title}`, '', '| Step | Everyone | Joined in 7 days |', '| --- | --- | --- |');
    group.steps.forEach((step, i) => {
      const w = week.groups[g]?.steps[i]?.count ?? 0;
      lines.push(`| ${step.label} | ${step.count}${pct(step.count, everyone.joined)} | ${w}${pct(w, week.joined)} |`);
    });
  });
  lines.push('');
  if (everyone.biggestDrop) {
    lines.push(`Biggest drop (everyone): ${everyone.biggestDrop.from} to ${everyone.biggestDrop.to}, ${everyone.biggestDrop.lost} lost.`, '');
  }
  if (clubs) {
    lines.push(
      '## Clubs',
      '',
      `- Coaches set up: ${clubs.coaches}`,
      `- Teams: ${clubs.teams}`,
      `- Players on a team: ${clubs.playersOnTeams}`,
      `- Assignments posted in the last 7 days: ${clubs.assignmentsThisWeek}`,
      `- Players who picked a home club: ${clubs.playersWithClub}`,
      `- Clubs with ${CLUB_COUNT_MIN} or more players: ${
        clubs.bigClubs.length ? clubs.bigClubs.map((c) => `${c.name} (${c.players})`).join(', ') : 'none yet'
      }`,
      `- "Club not listed" suggestions waiting: ${clubs.suggestionsOpen}`,
      ''
    );
  }
  lines.push(
    '## Problems',
    '',
    `- Problem reports in the last 7 days: ${reports.reportsNew}`,
    `- Problem reports open: ${reports.reportsOpen}`,
    `- Crash reports open: ${reports.crashesOpen}`,
    '',
    'Report text is not in this file. For support-triage, the founder copies',
    'it from Owner tools → Player reports → "Copy for the agents", which takes',
    'out names and contact details.',
    ''
  );
  return lines.join('\n');
}

/**
 * Vercel Cron runs in UTC, so the job is scheduled at 07:30 and 08:30 UTC on
 * Mondays and only works on the run that is 08:30 in Ireland: 07:30 UTC in
 * summer time, 08:30 UTC in winter. The other run does nothing.
 */
export function isIrishRunHour(now: Date): boolean {
  const hour = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Dublin', hour: '2-digit', hourCycle: 'h23' }).format(now);
  return hour === '08';
}

/** The file's date and path: the Monday it runs, in Irish time */
export function countsPath(now: Date): { date: string; path: string } {
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Dublin' }).format(now);
  return { date, path: `docs/agent-os/data/${date}-funnel.md` };
}
