// @vitest-environment node
// __tests__/clubBoard.test.ts
// The club board (00053): who gets in, what a notice may hold, and how
// teams show, matching the database rules.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const auth = { user: { id: 'coach-1', email: 'c@example.com' } as { id: string; email: string } | null };
vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => auth.user }));
const rpc = vi.fn<(name: string, args: unknown) => Promise<{ data?: unknown; error: { message: string } | null }>>(async () => ({ data: 'pending' as unknown, error: null as { message: string } | null }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ rpc }) }));

import { POST } from '@/app/api/teams/[id]/club/route';
import {
  CHALLENGE_MAX_DAYS,
  CLUB_TEAM_MIN,
  NOTICES_PER_DAY,
  NOTICE_MAX,
  challengePercent,
  clubInitials,
  daysLeft,
  hasContactDetails,
  noticeProblem,
  teamRace,
  timeAgo,
  type ClubTeam,
} from '@/lib/clubBoard';

const sql = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '00053_club_board.sql'), 'utf8');
const TEAM = '10000000-0000-0000-0000-000000000001';
const post = (body: unknown, id = TEAM) =>
  POST(new Request('http://localhost/api', { method: 'POST', body: JSON.stringify(body) }), { params: Promise.resolve({ id }) });
const team = (name: string, sessions: number | null, extra: Partial<ClubTeam> = {}): ClubTeam => ({
  team_id: name,
  name,
  age_group: 'U14',
  league_id: null,
  players: sessions === null ? 2 : 5,
  sessions_7d: sessions,
  shots_7d: sessions === null ? null : sessions * 10,
  active_7d: sessions === null ? null : 3,
  mine: false,
  ...extra,
});

beforeEach(() => {
  auth.user = { id: 'coach-1', email: 'c@example.com' };
  rpc.mockClear();
  rpc.mockImplementation(async () => ({ data: 'pending', error: null }));
});

describe('club board rules match the database', () => {
  it('uses the same limits as 00053', () => {
    expect(sql).toContain(`>= ${CLUB_TEAM_MIN} THEN x.sessions`);
    expect(sql).toContain(`BETWEEN 2 AND ${NOTICE_MAX}`);
    expect(sql).toContain(`>= ${NOTICES_PER_DAY} THEN`);
    expect(sql).toContain(`p_days > ${CHALLENGE_MAX_DAYS}`);
  });

  it('never lets a player ask whether someone else is at a club', () => {
    expect(sql).toMatch(/REVOKE EXECUTE ON FUNCTION public\.is_club_member\(text, uuid\) FROM PUBLIC, anon, authenticated;/);
    expect(sql).not.toMatch(/GRANT EXECUTE ON FUNCTION public\.is_club_member/);
  });

  it('keeps the migration comments free of apostrophes (see 00035)', () => {
    const comments = sql.split('\n').filter((l) => l.trim().startsWith('--'));
    expect(comments.filter((l) => l.includes("'"))).toEqual([]);
  });
});

describe('notices', () => {
  it('refuses contact details, like has_contact_details', () => {
    // The same cases were run against the SQL function on Postgres 16
    for (const text of ['Ring 0871234567', 'Text me on 087 123 4567', 'Mary.Smith@gmail.com', 'See www.example.com', 'clubsite.ie', 'Follow us on Instagram', 'Add me on snapchat']) {
      expect(hasContactDetails(text)).toBe(true);
    }
    for (const text of ['Game at 10:30 on 24/10', '2,000 shots by Friday', 'U14s train 6.30 to 8', 'Instant replay session', 'St. Marys hall']) {
      expect(hasContactDetails(text)).toBe(false);
    }
  });

  it('says what is wrong before a coach posts', () => {
    expect(noticeProblem(' ')).toBe('Write your notice first.');
    expect(noticeProblem('x'.repeat(NOTICE_MAX + 1))).toMatch(/500 characters/);
    expect(noticeProblem('Call 0871234567')).toMatch(/phone numbers/);
    expect(noticeProblem('Training moved to Thursday at 7')).toBeNull();
  });
});

describe('teams this week', () => {
  it('ranks teams by sessions, with small teams last and no rank for none', () => {
    const race = teamRace([team('U16', 4), team('U12', null), team('U14', 10), team('U18', 0)]);
    expect(race.map((t) => [t.name, t.rank])).toEqual([
      ['U14', 1],
      ['U16', 2],
      ['U18', null],
      ['U12', null],
    ]);
    expect(race[0].share).toBe(1);
    expect(race[1].share).toBeCloseTo(0.4);
  });

  it('works for a board with no sessions at all', () => {
    expect(teamRace([team('A', 0), team('B', 0)]).every((t) => t.share === 0 && t.rank === null)).toBe(true);
  });
});

describe('challenge and display helpers', () => {
  it('counts days left including today, and caps progress at 100%', () => {
    expect(daysLeft('2026-10-28', '2026-10-22')).toBe(7);
    expect(daysLeft('2026-10-22', '2026-10-22')).toBe(1);
    expect(daysLeft('2026-10-20', '2026-10-22')).toBe(0);
    expect(challengePercent({ progress: 2500, target: 10000 })).toBe(25);
    expect(challengePercent({ progress: 12000, target: 10000 })).toBe(100);
  });

  it('makes a crest from the club name', () => {
    expect(clubInitials('Wexford BC')).toBe('WB');
    expect(clubInitials('Gorey Basketball Club')).toBe('GB');
    expect(clubInitials('Ballincollig')).toBe('BA');
    expect(clubInitials('Templeogue')).toBe('TE');
  });

  it('says how long ago a notice was posted', () => {
    const now = Date.parse('2026-10-22T12:00:00Z');
    expect(timeAgo('2026-10-22T11:59:30Z', now)).toBe('just now');
    expect(timeAgo('2026-10-22T11:15:00Z', now)).toBe('45m ago');
    expect(timeAgo('2026-10-22T09:00:00Z', now)).toBe('3h ago');
    expect(timeAgo('2026-10-20T12:00:00Z', now)).toBe('2d ago');
    expect(timeAgo('2026-10-01T12:00:00Z', now)).toBe('1 Oct');
  });
});

describe('POST /api/teams/[id]/club', () => {
  it('asks the database to link the team to a club in the list', async () => {
    const res = await post({ clubId: 'wexford-bc-wexford' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ link: { club_id: 'wexford-bc-wexford', status: 'pending' } });
    expect(rpc).toHaveBeenCalledWith('request_club_link', { p_team: TEAM, p_club: 'wexford-bc-wexford' });
  });

  it('refuses a club not in the list, a bad team id and a signed-out visitor', async () => {
    expect((await post({ clubId: 'made-up-club' })).status).toBe(400);
    expect((await post({ clubId: 'wexford-bc-wexford' }, 'not-a-team')).status).toBe(404);
    auth.user = null;
    expect((await post({ clubId: 'wexford-bc-wexford' })).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('takes the team off with null, and passes on the database refusal', async () => {
    expect((await post({ clubId: null })).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('remove_club_link', { p_team: TEAM });
    rpc.mockImplementation(async () => ({ data: null, error: { message: 'Only a head coach of this team can do that' } }));
    const res = await post({ clubId: 'wexford-bc-wexford' });
    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe('Only a head coach of this team can do that');
  });
});
