// __tests__/coachSide.test.ts
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  AGE_GROUPS,
  TEAM_LEVELS,
  appModeFor,
  assignmentProgress,
  isStaff,
  parentMessage,
  playerInviteMessage,
  teamJoinPath,
} from '@/lib/coachSide';

const migrations = path.join(__dirname, '..', 'supabase', 'migrations');
const details = fs.readFileSync(path.join(migrations, '00024_settings_region_coach.sql'), 'utf8');
const coachSide = fs.readFileSync(path.join(migrations, '00047_coach_side.sql'), 'utf8');
const quoted = (sql: string) => [...sql.matchAll(/'([^']+)'/g)].map((m) => m[1]);

describe('coach side', () => {
  it('opens coach-only accounts in coaching, players in playing, and both in the last mode', () => {
    expect(appModeFor({ account_role: 'coach', app_mode: 'playing' })).toBe('coaching');
    expect(appModeFor({ account_role: 'player', app_mode: 'coaching' })).toBe('playing');
    expect(appModeFor({ account_role: 'both', app_mode: 'coaching' })).toBe('coaching');
    expect(appModeFor({ account_role: 'both', app_mode: null })).toBe('playing');
    expect(appModeFor(null)).toBe('playing');
  });

  it('offers exactly the age groups and levels the database accepts', () => {
    // A mismatch would let a coach pick a value that then fails to save
    expect([...AGE_GROUPS]).toEqual(quoted(details.match(/age_group IN \(([^)]*)\)/)?.[1] ?? ''));
    expect(TEAM_LEVELS.map((l) => l.value)).toEqual(quoted(details.match(/level IN \(([^)]*)\)/)?.[1] ?? ''));
  });

  it('knows the roles the database knows', () => {
    expect(quoted(coachSide.match(/role IN \(('coach', 'assistant', 'player')\)/)?.[1] ?? '')).toEqual(['coach', 'assistant', 'player']);
    expect(isStaff('coach')).toBe(true);
    expect(isStaff('assistant')).toBe(true);
    expect(isStaff('player')).toBe(false);
    expect(isStaff(undefined)).toBe(false);
  });

  it('builds a join link from a code', () => {
    expect(teamJoinPath('t4kx9p')).toBe('/teams/join/T4KX9P');
  });

  it('tells players the code and that joining is free', () => {
    const text = playerInviteMessage({ name: 'U16 Blazers' }, 'T4KX9P', 'https://x.test/teams/join/T4KX9P');
    expect(text).toContain('T4KX9P');
    expect(text).toContain('https://x.test/teams/join/T4KX9P');
    expect(text).toContain('free');
  });

  it('tells parents what the coach sees and that there are no private messages', () => {
    const text = parentMessage({ name: 'U16 Blazers' }, 'T4KX9P', 'https://x.test/j', 'Jack');
    expect(text).toContain('never their notes or videos');
    expect(text).toContain('no private messages');
    expect(text).toContain('Thanks, Jack');
  });

  it('counts only players towards an assignment', () => {
    const progress = assignmentProgress(
      [{ id: 'a' }, { id: 'b' }],
      [
        { assignment_id: 'a', user_id: 'p1' },
        { assignment_id: 'a', user_id: 'coach' },
        { assignment_id: 'b', user_id: 'p2' },
      ],
      ['p1', 'p2', 'p3']
    );
    expect(progress).toEqual([
      { id: 'a', done: 1, of: 3 },
      { id: 'b', done: 1, of: 3 },
    ]);
  });

  it('keeps every comment in the migration free of apostrophes', () => {
    // See the note at the top of 00035: the Supabase editor can read one as a string
    const comments = coachSide.split('\n').filter((l) => l.trim().startsWith('--'));
    expect(comments.filter((l) => l.includes("'"))).toEqual([]);
  });
});
