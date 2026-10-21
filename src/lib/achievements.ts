// src/lib/achievements.ts
// Weekly challenges, badges, XP, levels and streak rewards. Pure helpers here;
// the server loader (loadAchievements in achievements-server.ts) gathers stats
// and awards.
//
// Levelling up has to be something a player can feel happening. Eight ranks
// spread over 12,000 XP meant the first promotion took weeks and the rest
// months, with nothing in between, and a streak earned nothing but two badges.
// So there are now 50 levels, the first few close together, the old rank names
// kept as tiers a player climbs through, and every training day in a streak
// worth more than the last. Everything is derived from what the player has
// logged, so nothing has to be stored to keep it right.

export interface PlayerStats {
  totalSessions: number;
  totalWorkouts: number;
  totalMakes: number;
  totalLessons: number;
  sectionsWithLesson: number;
  totalPRs: number;
  programsCompleted: number;
  /** Program days completed, ever. */
  programDays: number;
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

/** XP a badge is worth, by tier. A legend badge is months of work and should feel like it. */
export const BADGE_XP: Record<BadgeTier, number> = {
  bronze: 50,
  silver: 100,
  gold: 250,
  diamond: 500,
  legend: 1000,
};

export type BadgeGroup = 'Shooting' | 'Sessions' | 'Streaks' | 'Gym' | 'IQ' | 'Programs' | 'Video';

export interface Badge {
  id: string;
  title: string;
  description: string;
  tier: BadgeTier;
  group: BadgeGroup;
  icon: string; // lucide icon name
  /** How far along the player is, against `target`. */
  metric: (s: PlayerStats) => number;
  target: number;
  earned: (s: PlayerStats) => boolean;
}

/**
 * Ids are stored in reward_events when a badge is earned, so an existing id
 * must never change or be removed: a player would lose a badge they have.
 */
function badge(b: Omit<Badge, 'earned'>): Badge {
  return { ...b, earned: (s) => b.metric(s) >= b.target };
}

const makes = (s: PlayerStats) => s.totalMakes;
const sessions = (s: PlayerStats) => s.totalSessions;
const longest = (s: PlayerStats) => s.longestStreak;
const workouts = (s: PlayerStats) => s.totalWorkouts;
const prs = (s: PlayerStats) => s.totalPRs;
const lessons = (s: PlayerStats) => s.totalLessons;
const programs = (s: PlayerStats) => s.programsCompleted;
const video = (s: PlayerStats) => s.videoTracked;

export const BADGES: Badge[] = [
  // Shooting
  badge({ id: 'makes-100', title: 'First 100', description: 'Make 100 shots', tier: 'bronze', group: 'Shooting', icon: 'CircleDot', metric: makes, target: 100 }),
  badge({ id: 'makes-500', title: 'Finding Range', description: 'Make 500 shots', tier: 'bronze', group: 'Shooting', icon: 'CircleDot', metric: makes, target: 500 }),
  badge({ id: 'makes-1000', title: '1K Makes', description: 'Make 1,000 shots', tier: 'silver', group: 'Shooting', icon: 'CircleDot', metric: makes, target: 1000 }),
  badge({ id: 'makes-5000', title: '5K Makes', description: 'Make 5,000 shots', tier: 'gold', group: 'Shooting', icon: 'CircleDot', metric: makes, target: 5000 }),
  badge({ id: 'makes-10000', title: '10K Club', description: 'Make 10,000 shots', tier: 'diamond', group: 'Shooting', icon: 'Gem', metric: makes, target: 10000 }),
  badge({ id: 'makes-25000', title: 'Sharpshooter', description: 'Make 25,000 shots', tier: 'legend', group: 'Shooting', icon: 'Crosshair', metric: makes, target: 25000 }),
  // Sessions
  badge({ id: 'first-session', title: 'First Session', description: 'Log your first basketball session', tier: 'bronze', group: 'Sessions', icon: 'Target', metric: sessions, target: 1 }),
  badge({ id: 'sessions-10', title: 'Getting Reps', description: 'Log 10 basketball sessions', tier: 'silver', group: 'Sessions', icon: 'Target', metric: sessions, target: 10 }),
  badge({ id: 'sessions-25', title: 'Regular', description: 'Log 25 basketball sessions', tier: 'silver', group: 'Sessions', icon: 'Target', metric: sessions, target: 25 }),
  badge({ id: 'sessions-50', title: 'Gym Rat', description: 'Log 50 basketball sessions', tier: 'gold', group: 'Sessions', icon: 'Flame', metric: sessions, target: 50 }),
  badge({ id: 'sessions-100', title: 'Century', description: 'Log 100 basketball sessions', tier: 'diamond', group: 'Sessions', icon: 'Crown', metric: sessions, target: 100 }),
  badge({ id: 'sessions-250', title: 'Lifer', description: 'Log 250 basketball sessions', tier: 'legend', group: 'Sessions', icon: 'Crown', metric: sessions, target: 250 }),
  // Streaks. "In a row" stopped being true when STREAK_REST_DAYS allowed a rest
  // day, and a badge that describes a rule the app no longer applies is worse
  // than a less punchy one.
  badge({ id: 'streak-3', title: 'Heating Up', description: 'Train 3 days without missing two in a row', tier: 'bronze', group: 'Streaks', icon: 'Flame', metric: longest, target: 3 }),
  badge({ id: 'streak-7', title: 'Week Warrior', description: 'Train 7 days without ever missing two in a row', tier: 'silver', group: 'Streaks', icon: 'Flame', metric: longest, target: 7 }),
  badge({ id: 'streak-14', title: 'Locked In', description: 'Train 14 days without ever missing two in a row', tier: 'gold', group: 'Streaks', icon: 'Flame', metric: longest, target: 14 }),
  badge({ id: 'streak-30', title: 'Unstoppable', description: 'Train 30 days without ever missing two in a row', tier: 'diamond', group: 'Streaks', icon: 'Zap', metric: longest, target: 30 }),
  badge({ id: 'streak-60', title: 'Relentless', description: 'Train 60 days without ever missing two in a row', tier: 'legend', group: 'Streaks', icon: 'Zap', metric: longest, target: 60 }),
  badge({ id: 'streak-100', title: 'Built Different', description: 'Train 100 days without ever missing two in a row', tier: 'legend', group: 'Streaks', icon: 'Crown', metric: longest, target: 100 }),
  // Gym
  badge({ id: 'gym-1', title: 'Weight Room', description: 'Log your first gym workout', tier: 'bronze', group: 'Gym', icon: 'Dumbbell', metric: workouts, target: 1 }),
  badge({ id: 'gym-20', title: 'Iron Hooper', description: 'Log 20 gym workouts', tier: 'silver', group: 'Gym', icon: 'Dumbbell', metric: workouts, target: 20 }),
  badge({ id: 'gym-50', title: 'Built Strong', description: 'Log 50 gym workouts', tier: 'gold', group: 'Gym', icon: 'Dumbbell', metric: workouts, target: 50 }),
  badge({ id: 'first-pr', title: 'New Personal Best', description: 'Set your first personal record', tier: 'bronze', group: 'Gym', icon: 'Trophy', metric: prs, target: 1 }),
  badge({ id: 'prs-10', title: 'Record Breaker', description: 'Set 10 personal records', tier: 'gold', group: 'Gym', icon: 'Trophy', metric: prs, target: 10 }),
  badge({ id: 'prs-25', title: 'Always Improving', description: 'Set 25 personal records', tier: 'diamond', group: 'Gym', icon: 'Trophy', metric: prs, target: 25 }),
  // IQ
  badge({ id: 'student', title: 'Student of the Game', description: 'Complete your first IQ lesson', tier: 'bronze', group: 'IQ', icon: 'BookOpen', metric: lessons, target: 1 }),
  badge({ id: 'lessons-10', title: 'Film Room', description: 'Complete 10 IQ lessons', tier: 'silver', group: 'IQ', icon: 'BookOpen', metric: lessons, target: 10 }),
  badge({ id: 'scholar', title: 'IQ Scholar', description: 'Complete a lesson in all 12 IQ sections', tier: 'gold', group: 'IQ', icon: 'GraduationCap', metric: (s) => s.sectionsWithLesson, target: 12 }),
  badge({ id: 'lessons-50', title: 'Coach on the Floor', description: 'Complete 50 IQ lessons', tier: 'diamond', group: 'IQ', icon: 'GraduationCap', metric: lessons, target: 50 }),
  // Programs
  badge({ id: 'program-day-1', title: 'Day One', description: 'Complete your first program day', tier: 'bronze', group: 'Programs', icon: 'CalendarCheck', metric: (s) => s.programDays, target: 1 }),
  badge({ id: 'program-finisher', title: 'Program Finisher', description: 'Complete a full training program', tier: 'gold', group: 'Programs', icon: 'CalendarCheck', metric: programs, target: 1 }),
  badge({ id: 'programs-3', title: 'Trust the Process', description: 'Complete 3 training programs', tier: 'diamond', group: 'Programs', icon: 'CalendarCheck', metric: programs, target: 3 }),
  // Video
  badge({ id: 'video-tracker', title: 'On Camera', description: 'Track a shooting session with Video AI', tier: 'bronze', group: 'Video', icon: 'Video', metric: video, target: 1 }),
  badge({ id: 'video-10', title: 'Film Junkie', description: 'Track 10 sessions with Video AI', tier: 'silver', group: 'Video', icon: 'Video', metric: video, target: 10 }),
];

/**
 * The tiers a player climbs through, each starting at a level. These are the
 * old ranks, kept so nobody's "All-Star" disappears, now reached by levelling.
 */
export const TIERS = [
  { name: 'Rookie', level: 1 },
  { name: 'Prospect', level: 5 },
  { name: 'Rotation Player', level: 10 },
  { name: 'Starter', level: 15 },
  { name: 'All-Star', level: 20 },
  { name: 'MVP', level: 30 },
  { name: 'Hall of Famer', level: 40 },
  { name: 'GOAT', level: 50 },
] as const;

export type TierName = (typeof TIERS)[number]['name'];

export const MAX_LEVEL = 50;

/**
 * Total XP needed to reach a level. Level 2 is 60 XP, about two sessions, so
 * the first level-up comes on day one. Each level after asks 20 XP more than
 * the one before: level 10 at 1,260 is a few weeks of regular training, level
 * 20 at 4,560 a few months, level 50 at 26,460 a couple of years.
 */
export function xpForLevel(level: number): number {
  const n = Math.max(1, Math.min(MAX_LEVEL, Math.floor(level))) - 1;
  return 60 * n + 10 * n * (n - 1);
}

export function tierFor(level: number): { name: TierName; level: number } {
  let current: { name: TierName; level: number } = TIERS[0];
  for (const t of TIERS) if (level >= t.level) current = t;
  return current;
}

export interface LevelInfo {
  level: number;
  tier: TierName;
  /** XP needed for the next level, from the start of this one, and how far in the player is. */
  span: number;
  into: number;
  toNext: number;
  progress: number;
  /** The next tier and the level it starts at, or null at the top. */
  nextTier: { name: TierName; level: number } | null;
}

export function levelFor(xp: number): LevelInfo {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  const tier = tierFor(level);
  const nextTier = TIERS.find((t) => t.level > level) ?? null;
  if (level >= MAX_LEVEL) return { level, tier: tier.name, span: 0, into: 0, toNext: 0, progress: 1, nextTier: null };
  const start = xpForLevel(level);
  const span = xpForLevel(level + 1) - start;
  const into = xp - start;
  return { level, tier: tier.name, span, into, toNext: span - into, progress: into / span, nextTier };
}

/** What each thing a player does is worth, shown to them as well as used here. */
export const XP_VALUES = {
  session: 20,
  workout: 20,
  makesPer: 10, // 1 XP for every this many makes
  lesson: 25,
  pr: 30,
  programDay: 15,
  programComplete: 300,
  videoTracked: 25,
} as const;

export interface XpBreakdown {
  training: number;
  makes: number;
  lessons: number;
  prs: number;
  programs: number;
  video: number;
  challenges: number;
  badges: number;
  streaks: number;
  /** One-off rewards, such as finishing the starting steps (src/lib/starter.ts). */
  bonus: number;
  total: number;
}

export function xpBreakdown(
  s: PlayerStats,
  extra: { challengePoints: number; badgeXp: number; streakXp: number; bonusXp?: number }
): XpBreakdown {
  const parts = {
    training: s.totalSessions * XP_VALUES.session + s.totalWorkouts * XP_VALUES.workout,
    makes: Math.floor(s.totalMakes / XP_VALUES.makesPer),
    lessons: s.totalLessons * XP_VALUES.lesson,
    prs: s.totalPRs * XP_VALUES.pr,
    programs: s.programDays * XP_VALUES.programDay + s.programsCompleted * XP_VALUES.programComplete,
    video: s.videoTracked * XP_VALUES.videoTracked,
    challenges: extra.challengePoints,
    badges: extra.badgeXp,
    streaks: extra.streakXp,
    bonus: extra.bonusXp ?? 0,
  };
  return { ...parts, total: Object.values(parts).reduce((n, v) => n + v, 0) };
}

/** XP from the badges with these ids. Unknown ids, from badges since retired, count nothing. */
export function badgeXp(earnedIds: Iterable<string>): number {
  const tiers = new Map(BADGES.map((b) => [b.id, b.tier]));
  let xp = 0;
  for (const id of earnedIds) {
    const tier = tiers.get(id);
    if (tier) xp += BADGE_XP[tier];
  }
  return xp;
}

/**
 * Streak lengths that pay out, and what each pays. Paid every time a streak
 * reaches it, not once in a lifetime: a player whose streak broke has a
 * reason to build the next one, rather than nothing left to win.
 */
export const STREAK_MILESTONES = [
  { days: 3, xp: 75 },
  { days: 7, xp: 200 },
  { days: 14, xp: 400 },
  { days: 30, xp: 1000 },
  { days: 60, xp: 2000 },
  { days: 100, xp: 4000 },
] as const;

/** Bonus XP per training day, per day of the streak it extends, up to a cap. */
export const STREAK_XP_PER_DAY = 2;
export const STREAK_XP_CAP = 50;

/** Bonus XP for the nth training day of a streak. */
export function streakDayBonus(nthDay: number): number {
  return Math.min(Math.max(0, nthDay) * STREAK_XP_PER_DAY, STREAK_XP_CAP);
}

export interface StreakRewards {
  /** Bonus XP earned from streaks over the history given. */
  xp: number;
  /** Times each milestone has been reached, by its number of days. */
  milestones: Record<number, number>;
  /** What the next training day is worth on top, if it extends the current streak. */
  nextDayBonus: number;
  /** The next milestone for the current streak, and how many training days off it is. */
  next: { days: number; xp: number; remaining: number } | null;
}

/**
 * The XP streaks have paid, from a player's training days.
 *
 * Walks the history with the same rules as streaks() - rest day and freezes -
 * so the bonus always matches the streak the player can see. `current` is the
 * live streak as streaks() reports it, which decides what the next day is worth.
 */
export function streakRewards(days: string[], current: number, restDays: number = STREAK_REST_DAYS): StreakRewards {
  const milestones: Record<number, number> = {};
  let xp = 0;
  for (const run of walkStreak(days, { ...TRAINING_STREAK, restDays }).runs) {
    xp += streakDayBonus(run);
    const hit = STREAK_MILESTONES.find((m) => m.days === run);
    if (hit) {
      xp += hit.xp;
      milestones[hit.days] = (milestones[hit.days] ?? 0) + 1;
    }
  }
  const upcoming = STREAK_MILESTONES.find((m) => m.days > current);
  return {
    xp,
    milestones,
    nextDayBonus: streakDayBonus(current + 1),
    next: upcoming ? { days: upcoming.days, xp: upcoming.xp, remaining: upcoming.days - current } : null,
  };
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
 * Two missed days in a row still breaks it, unless a freeze covers one.
 */
export const STREAK_REST_DAYS = 1;

/**
 * Streak freezes: every FREEZE_EVERY training days in a streak earns one, and a
 * player holds up to MAX_FREEZES. When a gap runs past the rest day, a freeze
 * covers each extra missed day by itself, so a sick week or a school trip does
 * not wipe out a month of work. Nothing to remember to switch on: a freeze that
 * has to be bought or equipped in advance is no use to the player who forgot.
 *
 * Earned by training, never bought, and capped, so the streak still means
 * something. Freezes are kept when a streak ends.
 *
 * The database walks the same rule in streak_walk() (migration 00041) for the
 * leaderboard, friends and teams. Change both together.
 */
export const FREEZE_EVERY = 7;
export const MAX_FREEZES = 2;

export interface StreakRule {
  restDays: number;
  /** Training days in a streak that earn a freeze; 0 for none. */
  freezeEvery: number;
  maxFreezes: number;
}

export const TRAINING_STREAK: StreakRule = { restDays: STREAK_REST_DAYS, freezeEvery: FREEZE_EVERY, maxFreezes: MAX_FREEZES };

const DAY_MS = 86_400_000;
const toMs = (d: string) => Date.parse(`${d}T00:00:00Z`);
const toDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** The days freezes covered in a gap after `from`: those after its rest days. */
function coveredDays(from: number, count: number, restDays: number): string[] {
  return Array.from({ length: count }, (_, i) => toDay(from + (restDays + 1 + i) * DAY_MS));
}

/** A day off that kept a streak going: the rest day, or one a freeze covered. */
export type KeptDay = 'rest' | 'frozen';

/** Marks the missed days after `from` that a streak survived. */
function keepGap(kept: Record<string, KeptDay>, from: number, missed: number, restDays: number) {
  for (let i = 1; i <= missed; i++) kept[toDay(from + i * DAY_MS)] = i <= restDays ? 'rest' : 'frozen';
}

/**
 * Every training day in order, with the length of streak it brought the run to,
 * and the freezes held after the last one. The single walk streaks() and
 * streakRewards() share, so they cannot drift apart.
 */
function walkStreak(days: string[], rule: StreakRule) {
  const sorted = [...new Set(days)].sort();
  const runs: number[] = [];
  let run = 0;
  let freezes = 0;
  let longest = 0;
  let frozen: string[] = [];
  const kept: Record<string, KeptDay> = {};
  let last: number | null = null;
  for (const d of sorted) {
    const ms = toMs(d);
    if (last === null) {
      run = 1;
    } else {
      // Missed days beyond the rest day: a gap of 1 is back to back
      const missed = Math.round((ms - last) / DAY_MS) - 1;
      const extra = missed - rule.restDays;
      if (extra <= 0) {
        keepGap(kept, last, missed, rule.restDays);
        run += 1;
      } else if (extra <= freezes) {
        freezes -= extra;
        frozen.push(...coveredDays(last, extra, rule.restDays));
        keepGap(kept, last, missed, rule.restDays);
        run += 1;
      } else {
        run = 1;
        frozen = [];
      }
    }
    if (rule.freezeEvery > 0 && run % rule.freezeEvery === 0 && freezes < rule.maxFreezes) freezes += 1;
    longest = Math.max(longest, run);
    runs.push(run);
    last = ms;
  }
  return { runs, run, freezes, longest, frozen, kept, last };
}

export interface StreakState {
  longest: number;
  current: number;
  /** The streak ends unless they train today. */
  atRisk: boolean;
  /** Freezes ready to use. */
  freezes: number;
  /** Days in the current streak that a freeze covered, oldest first. */
  frozen: string[];
  /** Training days until the next freeze, or null when holding the most allowed. */
  nextFreezeIn: number | null;
  /** Every day off, over the whole history, that a streak survived. */
  kept: Record<string, KeptDay>;
}

/**
 * The full state of a player's streak today, freezes included. Days after
 * `today` are ignored, as the database does.
 *
 * `atRisk` is true when the streak will actually end unless they train today -
 * that is, the rest day is used and no freeze is left to cover today. Warning
 * every time someone has not trained *yet today* would cry wolf daily and get
 * ignored, which is the version of this mechanic that makes people quit.
 */
export function streakState(days: string[], today: string, rule: StreakRule = TRAINING_STREAK): StreakState {
  const w = walkStreak(
    days.filter((d) => d <= today),
    rule
  );
  const nextIn = (current: number, held: number) =>
    rule.freezeEvery > 0 && held < rule.maxFreezes ? rule.freezeEvery - (current % rule.freezeEvery) : null;
  if (w.last === null) return { longest: 0, current: 0, atRisk: false, freezes: 0, frozen: [], nextFreezeIn: nextIn(0, 0), kept: {} };

  const sinceLast = Math.round((toMs(today) - w.last) / DAY_MS);
  // Missed days before today beyond the rest day; today is still open
  const extra = sinceLast - 1 - rule.restDays;
  if (extra > w.freezes) {
    return { longest: w.longest, current: 0, atRisk: false, freezes: w.freezes, frozen: [], nextFreezeIn: nextIn(0, w.freezes), kept: w.kept };
  }
  const used = Math.max(0, extra);
  const freezes = w.freezes - used;
  // The days off so far in the gap the streak is in now, not counting today
  const kept = { ...w.kept };
  keepGap(kept, w.last, Math.max(0, sinceLast - 1), rule.restDays);
  return {
    longest: w.longest,
    current: w.run,
    // Missing today too would need one more freeze than they had
    atRisk: sinceLast >= 1 && sinceLast - rule.restDays > w.freezes,
    freezes,
    frozen: [...w.frozen, ...coveredDays(w.last, used, rule.restDays)],
    nextFreezeIn: nextIn(w.run, freezes),
    kept,
  };
}

/**
 * Longest and current run of training days, plus whether the streak is live
 * but unprotected. See streakState() for freezes.
 *
 * Counts days trained, not days elapsed: a run of Mon/Wed/Fri is 3, not 5. A
 * number inflated by the days off would be a worse thing to show a player than
 * a smaller honest one.
 */
export function streaks(
  days: string[],
  today: string,
  restDays: number = STREAK_REST_DAYS
): { longest: number; current: number; atRisk: boolean } {
  const { longest, current, atRisk } = streakState(days, today, { ...TRAINING_STREAK, restDays });
  return { longest, current, atRisk };
}
