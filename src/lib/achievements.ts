// src/lib/achievements.ts
// Weekly challenges, badges, XP and ranks. Pure helpers here; the server loader
// (loadAchievements in achievements-server.ts) gathers stats and awards.

export interface PlayerStats {
  totalSessions: number;
  totalWorkouts: number;
  totalMakes: number;
  totalLessons: number;
  sectionsWithLesson: number;
  totalPRs: number;
  programsCompleted: number;
  videoTracked: number;
  longestStreak: number;
  currentStreak: number;
  week: {
    trainingDays: number;
    makes: number;
    lessons: number;
    workouts: number;
    sessions: number;
    programSessions: number;
  };
}

export interface ChallengeRules {
  metric: 'training_days' | 'makes' | 'study_lessons' | 'workouts' | 'balanced' | 'program_sessions';
  target: number;
}

export function challengeProgress(rules: ChallengeRules, s: PlayerStats): { current: number; target: number; done: boolean } {
  const w = s.week;
  const current = {
    training_days: w.trainingDays,
    makes: w.makes,
    study_lessons: w.lessons,
    workouts: w.workouts,
    // One point each for a basketball session, a workout and a lesson this week
    balanced: (w.sessions > 0 ? 1 : 0) + (w.workouts > 0 ? 1 : 0) + (w.lessons > 0 ? 1 : 0),
    program_sessions: w.programSessions,
  }[rules.metric] ?? 0;
  return { current: Math.min(current, rules.target), target: rules.target, done: current >= rules.target };
}

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'diamond' | 'legend';

export interface Badge {
  id: string;
  title: string;
  description: string;
  tier: BadgeTier;
  icon: string; // lucide icon name
  earned: (s: PlayerStats) => boolean;
}

export const BADGES: Badge[] = [
  { id: 'first-session', title: 'First Session', description: 'Log your first basketball session', tier: 'bronze', icon: 'Target', earned: (s) => s.totalSessions >= 1 },
  { id: 'sessions-10', title: 'Getting Reps', description: 'Log 10 basketball sessions', tier: 'silver', icon: 'Target', earned: (s) => s.totalSessions >= 10 },
  { id: 'sessions-50', title: 'Gym Rat', description: 'Log 50 basketball sessions', tier: 'gold', icon: 'Flame', earned: (s) => s.totalSessions >= 50 },
  { id: 'sessions-100', title: 'Century', description: 'Log 100 basketball sessions', tier: 'diamond', icon: 'Crown', earned: (s) => s.totalSessions >= 100 },
  { id: 'makes-1000', title: '1K Makes', description: 'Make 1,000 shots', tier: 'silver', icon: 'CircleDot', earned: (s) => s.totalMakes >= 1000 },
  { id: 'makes-5000', title: '5K Makes', description: 'Make 5,000 shots', tier: 'gold', icon: 'CircleDot', earned: (s) => s.totalMakes >= 5000 },
  { id: 'makes-10000', title: '10K Club', description: 'Make 10,000 shots', tier: 'diamond', icon: 'Gem', earned: (s) => s.totalMakes >= 10000 },
  // "in a row" stopped being true when STREAK_REST_DAYS allowed a rest day, and
  // a badge that describes a rule the app no longer applies is worse than a
  // less punchy one. Making these use a strict streak instead would be worse
  // still: the dashboard would show a 12-day streak beside a 7-day badge the
  // player had not earned.
  { id: 'streak-7', title: 'Week Warrior', description: 'Train 7 days without ever missing two in a row', tier: 'silver', icon: 'Flame', earned: (s) => s.longestStreak >= 7 },
  { id: 'streak-30', title: 'Unstoppable', description: 'Train 30 days without ever missing two in a row', tier: 'legend', icon: 'Zap', earned: (s) => s.longestStreak >= 30 },
  { id: 'first-pr', title: 'New Personal Best', description: 'Set your first personal record', tier: 'bronze', icon: 'Trophy', earned: (s) => s.totalPRs >= 1 },
  { id: 'prs-10', title: 'Record Breaker', description: 'Set 10 personal records', tier: 'gold', icon: 'Trophy', earned: (s) => s.totalPRs >= 10 },
  { id: 'gym-20', title: 'Iron Hooper', description: 'Log 20 gym workouts', tier: 'silver', icon: 'Dumbbell', earned: (s) => s.totalWorkouts >= 20 },
  { id: 'student', title: 'Student of the Game', description: 'Complete your first IQ lesson', tier: 'bronze', icon: 'BookOpen', earned: (s) => s.totalLessons >= 1 },
  { id: 'scholar', title: 'IQ Scholar', description: 'Complete a lesson in all 12 IQ sections', tier: 'gold', icon: 'GraduationCap', earned: (s) => s.sectionsWithLesson >= 12 },
  { id: 'program-finisher', title: 'Program Finisher', description: 'Complete a full training program', tier: 'gold', icon: 'CalendarCheck', earned: (s) => s.programsCompleted >= 1 },
  { id: 'video-tracker', title: 'On Camera', description: 'Track a shooting session with Video AI', tier: 'bronze', icon: 'Video', earned: (s) => s.videoTracked >= 1 },
];

export const RANKS = [
  { name: 'Rookie', min: 0 },
  { name: 'Prospect', min: 300 },
  { name: 'Rotation Player', min: 800 },
  { name: 'Starter', min: 1600 },
  { name: 'All-Star', min: 3000 },
  { name: 'MVP', min: 5000 },
  { name: 'Hall of Famer', min: 8000 },
  { name: 'GOAT', min: 12000 },
] as const;

export function xpFor(s: PlayerStats, challengePoints: number, badgeCount: number): number {
  return (
    s.totalSessions * 20 +
    s.totalWorkouts * 20 +
    Math.floor(s.totalMakes / 10) +
    s.totalLessons * 25 +
    s.totalPRs * 30 +
    challengePoints +
    badgeCount * 50
  );
}

export function rankFor(xp: number): { name: string; next: { name: string; min: number } | null; progress: number } {
  let index = 0;
  RANKS.forEach((r, i) => {
    if (xp >= r.min) index = i;
  });
  const current = RANKS[index];
  const next = RANKS[index + 1] || null;
  const progress = next ? (xp - current.min) / (next.min - current.min) : 1;
  return { name: current.name, next: next ? { name: next.name, min: next.min } : null, progress };
}

/**
 * Days a streak survives without anything logged.
 *
 * One, so a rest day does not break a streak. A daily streak in a training app
 * is a mechanic arguing with itself: trainingLoad.ts tells a player to rest
 * after six straight days, and a streak that then punishes the rest it was just
 * advised to take teaches them to ignore one or the other. Forgiveness is also
 * what makes the mechanic work at all - Duolingo's streak freeze produces
 * roughly four and a half times longer streaks by three weeks in - and the
 * players here are teenagers with exams, and GAA or soccer the same evening.
 *
 * Two missed days in a row still breaks it. The streak has to mean something.
 */
export const STREAK_REST_DAYS = 1;

/**
 * Longest and current run of training days, plus whether the streak is live
 * but unprotected.
 *
 * Counts days trained, not days elapsed: a run of Mon/Wed/Fri is 3, not 5. A
 * number inflated by the days off would be a worse thing to show a player than
 * a smaller honest one.
 *
 * `atRisk` is true when the streak will actually end unless they train today -
 * that is, they have already used their rest day. Warning every time someone
 * has not trained *yet today* would cry wolf daily and get ignored, which is
 * the version of this mechanic that makes people quit.
 */
export function streaks(
  days: string[],
  today: string,
  restDays: number = STREAK_REST_DAYS
): { longest: number; current: number; atRisk: boolean } {
  const set = new Set(days);
  const sorted = [...set].sort();
  const dayMs = 86_400_000;
  const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
  // A gap this size or smaller keeps a run alive: +1 because consecutive days
  // are already 1 apart, so one rest day means a gap of 2.
  const maxGapMs = (restDays + 1) * dayMs;

  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const d of sorted) {
    const ms = toMs(d);
    run = prev !== null && ms - prev <= maxGapMs ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = ms;
  }

  // Walk back from the most recent training day, counting days trained while
  // the gaps stay inside the allowance.
  const last = sorted.length ? toMs(sorted[sorted.length - 1]) : null;
  const sinceLast = last === null ? Infinity : toMs(today) - last;
  let current = 0;
  if (last !== null && sinceLast >= 0 && sinceLast <= maxGapMs) {
    current = 1;
    let cursor = last;
    for (let i = sorted.length - 2; i >= 0; i--) {
      const ms = toMs(sorted[i]);
      if (cursor - ms > maxGapMs) break;
      current++;
      cursor = ms;
    }
  }

  // Only once the rest day is spent: train today or the run ends
  return { longest, current, atRisk: current > 0 && sinceLast === maxGapMs };
}
