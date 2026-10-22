// @vitest-environment node
// __tests__/agentCounts.test.ts
// The weekly counts job (api/cron/agent-counts): Vercel's secret is required,
// the file holds counts only, and it lands on the agent branch in GitHub.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Funnel } from '@/lib/funnel';

const funnel = (joined: number, setup: number, first: number): Funnel => ({
  joined,
  groups: [
    {
      title: 'Joining and logging',
      steps: [
        { key: 'joined', label: 'Joined', count: joined },
        { key: 'setup', label: 'Finished setup', count: setup },
        { key: 'session_1', label: 'Logged a 1st hoops session', count: first },
      ],
    },
  ],
  biggestDrop: { from: 'Finished setup', to: 'Logged a 1st hoops session', lost: setup - first },
});

vi.mock('@/lib/funnel-server', () => ({
  loadFunnel: async (days: number) => ({ funnel: days === 0 ? funnel(24, 18, 2) : funnel(17, 12, 0), excluded: 2, eventsSince: null }),
  loadClubCounts: async () => ({ coaches: 2, teams: 1, playersOnTeams: 9, assignmentsThisWeek: 3, playersWithClub: 7, bigClubs: [{ name: 'Wexford BC', players: 6 }], suggestionsOpen: 1, teamsWithLeague: 1, teamsLeagueNotListed: 0, clubBoards: 1, teamsOnBoards: 2, boardRequests: 0, noticesThisWeek: 3 }),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => ({
        gte: async () => ({ count: 1 }),
        eq: async () => ({ count: table === 'app_errors' ? 3 : 2 }),
      }),
    }),
  }),
}));

import { clubCounts, countsFile, countsPath } from '@/lib/agentCounts';
import { GET } from '@/app/api/cron/agent-counts/route';

const fetchMock = vi.fn();
beforeEach(() => {
  // A Monday at 07:30 UTC in summer: 08:30 in Ireland, the run that works
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-07-27T07:30:00Z'));
  process.env.CRON_SECRET = 'cron-secret';
  process.env.AGENT_DATA_GITHUB_TOKEN = 'gh-token';
  fetchMock.mockReset();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
});

const call = (auth?: string) => GET(new Request('http://localhost/api/cron/agent-counts', { headers: auth ? { authorization: auth } : {} }));

describe('countsFile', () => {
  it('writes both windows, the biggest drop and the problem counts, and nothing else', () => {
    const file = countsFile('2026-10-26', funnel(24, 18, 2), funnel(17, 12, 0), { reportsNew: 1, reportsOpen: 2, crashesOpen: 3 });
    expect(file).toContain('# Funnel, 2026-10-26');
    expect(file).toContain('| Finished setup | 18 (75%) | 12 (71%) |');
    expect(file).toContain('| Logged a 1st hoops session | 2 (8%) | 0 (0%) |');
    expect(file).toContain('Biggest drop (everyone): Finished setup to Logged a 1st hoops session, 16 lost.');
    expect(file).toContain('- Crash reports open: 3');
    expect(file).not.toMatch(/@|[0-9a-f]{8}-[0-9a-f]{4}/);
  });

  it('dates the file by Irish time', () => {
    // 23:30 UTC on Sunday is 00:30 on Monday in Dublin in summer
    expect(countsPath(new Date('2026-07-26T23:30:00Z'))).toEqual({ date: '2026-07-27', path: 'docs/agent-os/data/2026-07-27-funnel.md' });
  });
});

describe('clubCounts', () => {
  it('counts coaches, teams, players and this week assignments, leaving out owner and test accounts', () => {
    const excluded = new Set(['owner', 'tester']);
    const counts = clubCounts(
      {
        coachProfiles: [{ user_id: 'coach-1' }, { user_id: 'tester' }],
        teams: [
          { id: 'blazers', created_by: 'coach-1' },
          { id: 'test-team', created_by: 'tester' },
        ],
        members: [
          { team_id: 'blazers', user_id: 'coach-1', role: 'coach' },
          { team_id: 'blazers', user_id: 'p1', role: 'player' },
          { team_id: 'blazers', user_id: 'p2', role: 'player' },
          { team_id: 'blazers', user_id: 'owner', role: 'player' },
          { team_id: 'test-team', user_id: 'p3', role: 'player' },
        ],
        assignmentsThisWeek: [
          { team_id: 'blazers', created_by: 'coach-1' },
          { team_id: 'test-team', created_by: 'tester' },
        ],
      },
      excluded
    );
    expect(counts).toEqual({ coaches: 1, teams: 1, playersOnTeams: 2, assignmentsThisWeek: 1, playersWithClub: 0, bigClubs: [], suggestionsOpen: 0, teamsWithLeague: 0, teamsLeagueNotListed: 0, clubBoards: 0, teamsOnBoards: 0, boardRequests: 0, noticesThisWeek: 0 });
  });

  it('names a home club only with 5 or more players, leaving out owner and test accounts', () => {
    const picks = (club: string, n: number, prefix: string) => Array.from({ length: n }, (_, i) => ({ user_id: `${prefix}${i}`, club_id: club }));
    const counts = clubCounts(
      {
        coachProfiles: [],
        teams: [],
        members: [],
        assignmentsThisWeek: [],
        playerClubs: [
          ...picks('wexford-bc-wexford', 5, 'w'),
          ...picks('gorey-basketball-club-wexford', 4, 'g'),
          { user_id: 'tester', club_id: 'gorey-basketball-club-wexford' },
        ],
        suggestionsOpen: 2,
      },
      new Set(['tester'])
    );
    expect(counts.playersWithClub).toBe(9);
    expect(counts.bigClubs).toEqual([{ name: 'Wexford BC', players: 5 }]);
    expect(counts.suggestionsOpen).toBe(2);
  });

  it('counts teams with a league and teams whose league is not listed, leaving out test teams', () => {
    const counts = clubCounts(
      {
        coachProfiles: [],
        teams: [
          { id: 'a', created_by: 'coach-1' },
          { id: 'b', created_by: 'coach-2' },
          { id: 'c', created_by: 'coach-3' },
          { id: 'd', created_by: 'tester' },
        ],
        members: [],
        assignmentsThisWeek: [],
        teamLeagues: [
          { id: 'a', league_id: 'super-league-men' },
          { id: 'b', league_id: 'other' },
          { id: 'c', league_id: null },
          { id: 'd', league_id: 'cork-area-board-leagues' },
        ],
      },
      new Set(['tester'])
    );
    expect(counts.teamsWithLeague).toBe(1);
    expect(counts.teamsLeagueNotListed).toBe(1);
  });

  it('counts club boards, the teams on them and requests waiting, leaving out test teams', () => {
    const counts = clubCounts(
      {
        coachProfiles: [],
        teams: [
          { id: 'a', created_by: 'coach-1' },
          { id: 'b', created_by: 'coach-2' },
          { id: 'c', created_by: 'coach-3' },
          { id: 'd', created_by: 'tester' },
        ],
        members: [],
        assignmentsThisWeek: [],
        boardLinks: [
          { team_id: 'a', club_id: 'wexford-bc-wexford', status: 'approved' },
          { team_id: 'b', club_id: 'wexford-bc-wexford', status: 'approved' },
          { team_id: 'c', club_id: 'gorey-basketball-club-wexford', status: 'pending' },
          { team_id: 'd', club_id: 'cork-club', status: 'approved' },
        ],
        noticesThisWeek: 4,
      },
      new Set(['tester'])
    );
    expect(counts).toMatchObject({ clubBoards: 1, teamsOnBoards: 2, boardRequests: 1, noticesThisWeek: 4 });
  });

  it('adds a Clubs section to the file only when there are club counts', () => {
    const base = [funnel(24, 18, 2), funnel(17, 12, 0), { reportsNew: 0, reportsOpen: 0, crashesOpen: 0 }] as const;
    expect(countsFile('2026-10-26', ...base)).not.toContain('## Clubs');
    expect(countsFile('2026-10-26', ...base, { coaches: 1, teams: 1, playersOnTeams: 2, assignmentsThisWeek: 1, playersWithClub: 0, bigClubs: [], suggestionsOpen: 0, teamsWithLeague: 0, teamsLeagueNotListed: 0, clubBoards: 0, teamsOnBoards: 0, boardRequests: 0, noticesThisWeek: 0 })).toContain(
      '- Players on a team: 2'
    );
  });
});

describe('GET /api/cron/agent-counts', () => {
  it('refuses a request without Vercel Cron secret', async () => {
    expect((await call()).status).toBe(401);
    expect((await call('Bearer wrong')).status).toBe(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('saves the counts file to the agent branch', async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 }).mockResolvedValueOnce({ ok: true, status: 201 });
    const res = await call('Bearer cron-secret');
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[1] as [string, { method: string; body: string; headers: Record<string, string> }];
    expect(url).toMatch(/^https:\/\/api\.github\.com\/repos\/oconnorjack668-code\/deadeye\/contents\/docs\/agent-os\/data\/\d{4}-\d{2}-\d{2}-funnel\.md$/);
    expect(init.method).toBe('PUT');
    expect(init.headers.Authorization).toBe('Bearer gh-token');
    const body = JSON.parse(init.body) as { branch: string; content: string; sha?: string };
    expect(body.branch).toBe('agent-os');
    expect(body.sha).toBeUndefined();
    const saved = Buffer.from(body.content, 'base64').toString('utf8');
    expect(saved).toContain('| Joined | 24 (100%) | 17 (100%) |');
    expect(saved).toContain('- Assignments posted in the last 7 days: 3');
    expect(saved).toContain('- Clubs with 5 or more players: Wexford BC (6)');
    expect(saved).toContain('- "Club not listed" suggestions waiting: 1');
  });

  it('replaces this week file when the job runs twice', async () => {
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ sha: 'abc' }) }).mockResolvedValueOnce({ ok: true, status: 200 });
    await call('Bearer cron-secret');
    expect(JSON.parse((fetchMock.mock.calls[1][1] as { body: string }).body).sha).toBe('abc');
  });

  it('works only on the Monday run that is 08:30 in Ireland, summer or winter', async () => {
    // Summer: the 08:30 UTC run is 09:30 in Ireland, so it does nothing
    vi.setSystemTime(new Date('2026-07-27T08:30:00Z'));
    expect((await (await call('Bearer cron-secret')).json()).skipped).toBeTruthy();
    // Winter: 07:30 UTC is 07:30 in Ireland, so that one does nothing
    vi.setSystemTime(new Date('2026-01-26T07:30:00Z'));
    expect((await (await call('Bearer cron-secret')).json()).skipped).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    // Winter: 08:30 UTC is 08:30 in Ireland, so it works
    vi.setSystemTime(new Date('2026-01-26T08:30:00Z'));
    fetchMock.mockResolvedValueOnce({ ok: false, status: 404 }).mockResolvedValueOnce({ ok: true, status: 201 });
    expect((await call('Bearer cron-secret')).status).toBe(200);
  });

  it('says so when the GitHub token is missing', async () => {
    delete process.env.AGENT_DATA_GITHUB_TOKEN;
    const res = await call('Bearer cron-secret');
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/AGENT_DATA_GITHUB_TOKEN/);
  });
});
