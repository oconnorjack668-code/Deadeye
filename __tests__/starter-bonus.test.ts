// __tests__/starter-bonus.test.ts
// POST /api/starter-bonus: the one-off XP bonus for finishing the starting
// steps. It must check the two steps the database can see, pay at most once,
// and count the bonus into XP only for a player who has it.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { xpBreakdown } from '@/lib/achievements';
import { STARTER_BONUS_ID, STARTER_BONUS_XP } from '@/lib/starter';
import { logGuideStep } from '@/components/basketball/FirstLogGuide';

let user: { id: string } | null = { id: 'user-1' };
let sessions = 1;
let answers = 1;
let alreadyPaid = false;
let insertError: { message: string; code?: string } | null = null;
const inserted: Array<Record<string, unknown>> = [];

vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => user }));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: (table: string) => ({
      select: () => {
        const chain = {
          eq: () => chain,
          maybeSingle: async () => ({ data: alreadyPaid ? { id: 'r1' } : null }),
          then: (resolve: (v: { count: number }) => void) =>
            resolve({ count: table === 'training_sessions' ? sessions : table === 'daily_iq_answers' ? answers : 0 }),
        };
        return chain;
      },
      insert: async (row: Record<string, unknown>) => {
        expect(table).toBe('reward_events');
        inserted.push(row);
        return { error: insertError };
      },
    }),
  }),
}));

async function claim() {
  const { POST } = await import('@/app/api/starter-bonus/route');
  const res = await POST();
  return { status: res.status, body: await res.json() };
}

describe('POST /api/starter-bonus', () => {
  beforeEach(() => {
    user = { id: 'user-1' };
    sessions = 1;
    answers = 1;
    alreadyPaid = false;
    insertError = null;
    inserted.length = 0;
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-key';
  });

  it('pays the bonus once both database steps are done', async () => {
    const { status, body } = await claim();
    expect(status).toBe(201);
    expect(body).toEqual({ ok: true, xp: STARTER_BONUS_XP });
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({ user_id: 'user-1', event_type: 'milestone_reached', badge_id: STARTER_BONUS_ID });
  });

  it('refuses before the first session or IQ answer, and pays nothing', async () => {
    sessions = 0;
    expect((await claim()).status).toBe(400);
    sessions = 1;
    answers = 0;
    expect((await claim()).status).toBe(400);
    expect(inserted).toHaveLength(0);
  });

  it('never pays twice', async () => {
    alreadyPaid = true;
    const { status, body } = await claim();
    expect(status).toBe(200);
    expect(body.already).toBe(true);
    expect(inserted).toHaveLength(0);
  });

  it('treats a claim that lost a race to another as already paid', async () => {
    insertError = { message: 'duplicate key', code: '23505' };
    expect((await claim()).status).toBe(201);
  });

  it('says so when the bonus could not be stored', async () => {
    insertError = { message: 'boom' };
    expect((await claim()).status).toBe(500);
  });

  it('refuses anyone signed out', async () => {
    user = null;
    expect((await claim()).status).toBe(401);
    expect(inserted).toHaveLength(0);
  });
});

describe('starting-steps XP', () => {
  const stats = {
    totalSessions: 1, totalWorkouts: 0, totalMakes: 0, totalLessons: 0, sectionsWithLesson: 0, totalPRs: 0,
    programsCompleted: 0, programDays: 0, videoTracked: 0, longestStreak: 1, currentStreak: 1,
    week: { trainingDays: 1, makes: 0, lessons: 0, workouts: 0, sessions: 1, programSessions: 0 },
  };

  it('adds the bonus to the total only when it was paid', () => {
    const without = xpBreakdown(stats, { challengePoints: 0, badgeXp: 0, streakXp: 0 });
    const withBonus = xpBreakdown(stats, { challengePoints: 0, badgeXp: 0, streakXp: 0, bonusXp: STARTER_BONUS_XP });
    expect(without.bonus).toBe(0);
    expect(withBonus.bonus).toBe(STARTER_BONUS_XP);
    expect(withBonus.total - without.total).toBe(STARTER_BONUS_XP);
  });
});

describe('first-time logging tips', () => {
  it('follows the player: spot, then shots, then finish', () => {
    expect(logGuideStep(false, 0)).toBe(1);
    expect(logGuideStep(true, 0)).toBe(2);
    expect(logGuideStep(true, 3)).toBe(3);
    // A spot is still the first thing asked for if it was cleared mid-session
    expect(logGuideStep(false, 3)).toBe(1);
  });
});
