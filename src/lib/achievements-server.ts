// src/lib/achievements-server.ts
// SERVER-ONLY: gathers a player's stats, awards newly completed weekly challenges
// and earned badges (service role, so players can't award themselves), and
// returns everything the achievements screens need.
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  BADGES,
  badgeXp,
  challengeProgress,
  levelFor,
  streakRewards,
  streaks,
  xpBreakdown,
  type ChallengeRules,
  type PlayerStats,
} from '@/lib/achievements';
import { userCalendarNow } from '@/lib/userTime';
import { getPersonalRecordCount, getShotTotals, getShotsSince, getStreaksFromDb, getTrainingCounts, getTrainingDates } from '@/lib/player-activity';

export interface ChallengeView {
  id: string;
  title: string;
  description: string;
  points: number;
  current: number;
  target: number;
  done: boolean;
}

export async function loadAchievements(userId: string) {
  const supabase = await createClient();
  // "Today" and "this week" (Monday to Sunday) on the players' calendar, not the server's (UTC)
  const { today, weekStart, weekStartIso } = await userCalendarNow();

  const [
    { sessions: sessionDays, workouts: workoutDays },
    counts,
    dbStreaks,
    shotTotals,
    weekShots,
    { data: lessons },
    totalPRs,
    { data: programDays },
    { count: programsDone },
    { count: programDaysDone },
    { count: videoTracked },
    { data: challenges },
    { data: completions },
    { data: rewardRows },
    { data: season },
  ] = await Promise.all([
    // Shared with the dashboard metrics (cached per request, so read once)
    getTrainingDates(userId),
    getTrainingCounts(userId),
    getStreaksFromDb(userId, today),
    getShotTotals(userId),
    getShotsSince(userId, weekStartIso),
    supabase.from('study_progress').select('completed_at, study_items(topic_id)').eq('user_id', userId).not('completed_at', 'is', null),
    getPersonalRecordCount(userId),
    supabase.from('program_day_completions').select('completed_at').eq('user_id', userId).gte('completed_at', weekStartIso),
    supabase.from('program_enrollments').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'completed'),
    supabase.from('program_day_completions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('video_analyses').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('kind', 'shot_tracking'),
    supabase.from('challenges').select('id, slug, title, description, points, challenge_type, rules').eq('recurring', true).eq('is_active', true).order('points', { ascending: false }),
    supabase.from('challenge_completions').select('challenge_id, period_start, points_earned').eq('user_id', userId),
    supabase.from('reward_events').select('badge_id, created_at').eq('user_id', userId),
    supabase.from('leaderboard_seasons').select('id').eq('is_active', true).limit(1).maybeSingle(),
  ]);

  const allDays = [...sessionDays, ...workoutDays];
  // Prefer the database, which walks the whole history. The windowed dates only
  // reach back HISTORY_WINDOW_DAYS, so before migration 00025 runs the longest
  // streak is capped at that.
  const windowed = streaks(allDays, today);
  const { longest, current } = dbStreaks ?? windowed;
  const lessonRows = (lessons || []) as unknown as Array<{ completed_at: string; study_items: { topic_id: string } | null }>;

  const stats: PlayerStats = {
    // Lifetime counts, not the windowed date list - these drive XP, so they
    // must stay exact however far back the date window reaches.
    totalSessions: counts.sessions,
    totalWorkouts: counts.workouts,
    totalMakes: shotTotals.reduce((n, z) => n + z.makes, 0),
    totalLessons: lessonRows.length,
    sectionsWithLesson: new Set(lessonRows.map((l) => l.study_items?.topic_id).filter(Boolean)).size,
    totalPRs,
    programsCompleted: programsDone || 0,
    programDays: programDaysDone || 0,
    videoTracked: videoTracked || 0,
    longestStreak: longest,
    currentStreak: current,
    week: {
      trainingDays: new Set(allDays.filter((d) => d >= weekStart && d <= today)).size,
      makes: weekShots.reduce((n, s) => n + s.makes, 0),
      lessons: lessonRows.filter((l) => l.completed_at >= weekStartIso).length,
      workouts: workoutDays.filter((d) => d >= weekStart && d <= today).length,
      sessions: sessionDays.filter((d) => d >= weekStart && d <= today).length,
      programSessions: (programDays || []).length,
    },
  };

  const completionRows = (completions || []) as Array<{ challenge_id: string | null; period_start: string | null; points_earned: number }>;
  const doneThisWeek = new Set(completionRows.filter((c) => c.period_start === weekStart).map((c) => c.challenge_id));
  const earnedBadgeIds = new Set(((rewardRows || []) as Array<{ badge_id: string }>).map((r) => r.badge_id));

  const challengeRows = (challenges || []) as unknown as Array<{
    id: string;
    title: string;
    description: string;
    points: number;
    challenge_type: string;
    rules: ChallengeRules;
  }>;
  const challengeViews: ChallengeView[] = challengeRows.map((c) => {
    const p = challengeProgress(c.rules, stats);
    return { id: c.id, title: c.title, description: c.description, points: c.points, ...p, done: p.done || doneThisWeek.has(c.id) };
  });

  // Award anything new (needs the service role key; otherwise progress is still shown)
  const newChallenges = challengeRows.filter((c) => !doneThisWeek.has(c.id) && challengeProgress(c.rules, stats).done);
  const newBadges = BADGES.filter((b) => !earnedBadgeIds.has(b.id) && b.earned(stats));
  let awardedPoints = 0;
  if ((newChallenges.length || newBadges.length) && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const admin = createAdminClient();
      if (newChallenges.length) {
        const { error } = await admin.from('challenge_completions').insert(
          newChallenges.map((c: { id: string; title: string; points: number; challenge_type: string }) => ({
            user_id: userId,
            season_id: season?.id ?? null,
            challenge_id: c.id,
            challenge_type: c.challenge_type,
            title: c.title,
            points_earned: c.points,
            verified: true,
            period_start: weekStart,
          }))
        );
        if (!error) awardedPoints = newChallenges.reduce((n: number, c: { points: number }) => n + c.points, 0);
      }
      if (newBadges.length) {
        const { error } = await admin.from('reward_events').insert(
          newBadges.map((b) => ({
            user_id: userId,
            event_type: 'badge_earned',
            badge_id: b.id,
            badge_title: b.title,
            badge_description: b.description,
            icon_name: b.icon,
            tier: b.tier,
            season_id: season?.id ?? null,
          }))
        );
        if (!error) newBadges.forEach((b) => earnedBadgeIds.add(b.id));
      }
    } catch {
      // Missing/invalid service key: awards are retried on the next visit
    }
  }

  const challengePoints = completionRows.reduce((n, c) => n + c.points_earned, 0) + awardedPoints;
  // From the same training days, with the same rest-day rule, as the streak
  // the player sees
  const streak = streakRewards(allDays, current);
  const xpParts = xpBreakdown(stats, { challengePoints, badgeXp: badgeXp(earnedBadgeIds), streakXp: streak.xp });

  return {
    stats,
    challenges: challengeViews,
    badges: BADGES.map((b) => ({
      id: b.id,
      title: b.title,
      description: b.description,
      tier: b.tier,
      group: b.group,
      icon: b.icon,
      earned: earnedBadgeIds.has(b.id),
      current: Math.min(b.metric(stats), b.target),
      target: b.target,
    })),
    newlyEarned: newBadges.map((b) => b.title),
    xp: xpParts.total,
    xpParts,
    level: levelFor(xpParts.total),
    streak,
  };
}
