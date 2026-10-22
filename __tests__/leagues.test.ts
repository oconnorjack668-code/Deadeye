// __tests__/leagues.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { LEAGUES, LEAGUE_NOT_LISTED, leagueById, leagueGroups, leagueLabel, teamLeagueText, validLeagueId } from '@/lib/leagues';
import { AGE_GROUPS } from '@/lib/coachSide';
import { CLUBS } from '@/lib/clubs';

const root = path.join(__dirname, '..');
const migration = fs.readFileSync(path.join(root, 'supabase', 'migrations', '00052_team_league.sql'), 'utf8');
const csvIds = (file: string) =>
  fs
    .readFileSync(path.join(root, 'docs', 'agent-os', 'clubs', file), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(1)
    .map((line) => line.split(',')[0]);
const ids = (groups: ReturnType<typeof leagueGroups>) => groups.flatMap((g) => g.leagues.map((l) => l.id));
const suggested = (team: Parameters<typeof leagueGroups>[0]) => leagueGroups(team).find((g) => g.title.startsWith('Suggested'))?.leagues ?? [];

describe('leagues list', () => {
  it('is built from leagues.csv, with every id fixed in the file and allowed by the database', () => {
    const pattern = new RegExp(migration.match(/league_id ~ '([^']+)'/)?.[1] ?? '^$');
    expect(LEAGUES.map((l) => l.id)).toEqual(csvIds('leagues.csv'));
    expect(new Set(LEAGUES.map((l) => l.id)).size).toBe(LEAGUES.length);
    for (const id of [...LEAGUES.map((l) => l.id), LEAGUE_NOT_LISTED]) expect(id).toMatch(pattern);
  });

  it('keeps every club id fixed in directory.csv, so a saved home club never changes', () => {
    const fixed = new Set(csvIds('directory.csv'));
    for (const club of CLUBS) expect(fixed.has(club.id)).toBe(true);
    expect(CLUBS.find((c) => c.aka.includes('Wexford Blazers'))?.id).toBe('wexford-bc-wexford');
  });

  it('suggests the competitions for the team age group first', () => {
    expect(suggested({ ageGroup: 'U16' }).map((l) => l.id)).toEqual([
      'all-ireland-club-championship-u16-girls',
      'all-ireland-club-championship-u16-boys',
    ]);
    expect(suggested({ ageGroup: 'U18' }).map((l) => l.id)).toEqual(['u18-national-cup-men-and-women', 'u18-shield']);
    expect(suggested({ ageGroup: 'Senior' }).map((l) => l.id)).toContain('super-league-women');
    expect(suggested({ ageGroup: 'U13' })).toEqual([]);
  });

  it('suggests the area board of the team county, and schools competitions for a school team', () => {
    expect(suggested({ ageGroup: 'U14', county: 'Cork' }).map((l) => l.id)).toContain('cork-area-board-leagues');
    expect(suggested({ ageGroup: 'U14', county: 'Clare' }).map((l) => l.id)).toContain('north-munster-area-board-leagues');
    const school = suggested({ ageGroup: 'U18', level: 'school' }).map((l) => l.id);
    expect(school).toContain('all-ireland-schools-cup-u19-a-b-and-c-girls');
    expect(school).toContain('schools-league-minor-a');
    expect(suggested({ ageGroup: 'U18', level: 'club' }).some((l) => l.kind === 'schools')).toBe(false);
  });

  it('never suggests an area board from a note still to check', () => {
    // The Kilkenny and South East row says "(Wexford to check)"
    expect(suggested({ ageGroup: 'U16', county: 'Wexford' }).some((l) => l.kind === 'area')).toBe(false);
  });

  it('lists every competition exactly once, whatever the team', () => {
    for (const ageGroup of [null, ...AGE_GROUPS]) {
      for (const level of [null, 'school', 'club']) {
        const all = ids(leagueGroups({ ageGroup, level, county: 'Dublin' }));
        expect(all.sort()).toEqual(LEAGUES.map((l) => l.id).sort());
      }
    }
  });

  it('labels competitions by gender and area', () => {
    expect(leagueLabel(leagueById('super-league-women')!)).toBe('Super League (women)');
    expect(leagueLabel(leagueById('cork-area-board-leagues')!)).toBe('Cork area board leagues');
    expect(leagueLabel(leagueById('kilkenny-and-south-east-area-board-leagues')!)).toBe(
      'Kilkenny and South East area board leagues · Kilkenny and the South East'
    );
    expect(teamLeagueText(LEAGUE_NOT_LISTED)).toBe('League not listed');
    expect(teamLeagueText('no-such-league')).toBeNull();
    expect(teamLeagueText(null)).toBeNull();
  });

  it('accepts only a listed league, "not listed" or none', () => {
    expect(validLeagueId('u18-shield')).toBe(true);
    expect(validLeagueId(LEAGUE_NOT_LISTED)).toBe(true);
    expect(validLeagueId(null)).toBe(true);
    expect(validLeagueId('made-up')).toBe(false);
    expect(validLeagueId(7)).toBe(false);
  });
});
