// src/lib/leagues.ts
// The competitions a coach can pick for a team (src/data/leagues.json, built
// from docs/agent-os/clubs/leagues.csv by scripts/build-clubs.mjs). The team
// keeps the league's id in teams.league_id (00052).
import leaguesData from '@/data/leagues.json';

export interface League {
  id: string;
  name: string;
  kind: 'national' | 'area' | 'schools';
  cup: boolean;
  gender: string | null;
  /** Team age groups it is for; area board leagues run every grade */
  ages: string[] | 'all';
  region: string | null;
}

export const LEAGUES: League[] = leaguesData as League[];

/** Stored when a coach says their league is not in the list, so club-growth can count the gaps */
export const LEAGUE_NOT_LISTED = 'other';

const byId = new Map(LEAGUES.map((l) => [l.id, l]));

export function leagueById(id: string | null | undefined): League | null {
  return id ? byId.get(id) ?? null : null;
}

/** A region as the source gives it, without notes still to check: "Kilkenny and the South East" */
function cleanRegion(region: string | null): string | null {
  return region ? region.replace(/\s*\([^)]*\)\s*$/, '').trim() || null : null;
}

/** "Super League (women)" or "Cork area board leagues · Cork" */
export function leagueLabel(league: League): string {
  const region = cleanRegion(league.region);
  const name = league.gender ? `${league.name} (${league.gender})` : league.name;
  return league.kind === 'area' && region && !league.name.toLowerCase().startsWith(region.toLowerCase()) ? `${name} · ${region}` : name;
}

/** What a team page shows for its league, or null for none */
export function teamLeagueText(id: string | null | undefined): string | null {
  if (id === LEAGUE_NOT_LISTED) return 'League not listed';
  const league = leagueById(id);
  return league ? leagueLabel(league) : null;
}

function fitsAge(league: League, ageGroup: string): boolean {
  if (league.ages === 'all') return true;
  // Schools U19 competitions are for the oldest school teams, U18 in the app
  return league.ages.includes(ageGroup) || (ageGroup === 'U18' && league.ages.includes('U19'));
}

export interface LeagueGroup {
  title: string;
  leagues: League[];
}

/**
 * The competitions in the order a coach should see them: the ones that fit
 * the team first (its age group, its county's area board, schools for a
 * school team), then everything else by kind, so any league can still be
 * picked.
 */
export function leagueGroups(team: { ageGroup?: string | null; level?: string | null; county?: string | null }): LeagueGroup[] {
  const county = team.county?.toLowerCase() ?? null;
  const suggested = LEAGUES.filter((l) => {
    if (l.kind === 'area') return !!county && !!cleanRegion(l.region)?.toLowerCase().includes(county);
    if (l.kind === 'schools' && team.level === 'school') return l.ages.length === 0 || (!!team.ageGroup && fitsAge(l, team.ageGroup));
    if (l.kind === 'schools') return false;
    return !!team.ageGroup && l.ages !== 'all' && l.ages.length > 0 && fitsAge(l, team.ageGroup);
  });
  const shown = new Set(suggested.map((l) => l.id));
  const rest = (kind: League['kind']) => LEAGUES.filter((l) => l.kind === kind && !shown.has(l.id));
  const groups: LeagueGroup[] = [
    { title: team.ageGroup ? `Suggested for ${team.ageGroup}` : 'Suggested', leagues: suggested },
    { title: 'Area board leagues', leagues: rest('area') },
    { title: 'National leagues and cups', leagues: rest('national') },
    { title: 'Schools', leagues: rest('schools') },
  ];
  return groups.filter((g) => g.leagues.length > 0);
}

/** A league id a team may store: one in the list, "not listed", or none */
export function validLeagueId(id: unknown): id is string | null {
  return id === null || id === LEAGUE_NOT_LISTED || (typeof id === 'string' && byId.has(id));
}
