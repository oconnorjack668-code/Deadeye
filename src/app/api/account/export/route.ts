// src/app/api/account/export/route.ts
// GDPR right of access: downloads everything Deadeye stores about the signed-in player as one JSON file.
// Uses the admin client (filtered to this user) so server-written rows like badges are included too.
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

// Tables keyed by user_id. profiles is keyed by id and handled separately.
const USER_TABLES = [
  'user_roles',
  'subscriptions',
  'notification_preferences',
  'goals',
  'training_sessions',
  'session_drills',
  'shooting_entries',
  'workouts',
  'workout_sets',
  'workout_routines',
  'routine_exercises',
  'exercise_favorites',
  'exercise_library',
  'performance_tests',
  'study_progress',
  'quiz_completions',
  'ai_reports',
  'video_assets',
  'video_analysis_jobs',
  'video_measurements',
  'video_analyses',
  'program_enrollments',
  'program_day_completions',
  'style_match_results',
  'challenge_completions',
  'reward_events',
  'push_subscriptions',
  'coach_messages',
  'games',
  'team_members',
  'team_assignment_completions',
  // Coach setup answers: club, 18 or over, when vetting was declared (00047)
  'coach_profiles',
  'player_reports',
  'fuel_logs',
  'daily_iq_answers',
  'drill_favorites',
  // The parent consent record, which is about this account
  'age_checks',
  // The optional profile photo record and the cached player level (00043).
  // The image itself stays private in Storage, like uploaded video files.
  'profile_photos',
  'player_levels',
  // Crash reports sent from this account
  'app_errors',
  // The home club and any "club not listed" suggestions (00051)
  'player_clubs',
  'club_suggestions',
] as const;

// Browser push keys are secrets, not personal data worth handing out
// and the consent links are keys to the approval, not information about anyone
const STRIP_COLUMNS: Record<string, string[]> = {
  push_subscriptions: ['p256dh', 'auth'],
  age_checks: ['request_token', 'confirm_token'],
  profile_photos: ['approval_token'],
};

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });

  const admin = createAdminClient();
  const [authUser, friendships, filmQuestions, follows, founderPosts, profile, ...tables] = await Promise.all([
    admin.auth.admin.getUserById(user.id),
    admin.from('friendships').select('*').or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
    // Keyed by player_id rather than user_id
    admin.from('film_questions').select('*').eq('player_id', user.id),
    // Who this account follows (00050). Who follows it is not handed out:
    // the founder sees a count, never names.
    admin.from('follows').select('*').eq('follower_id', user.id),
    // Posts this account wrote, for the founder
    admin.from('founder_posts').select('*').eq('author_id', user.id),
    admin.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    ...USER_TABLES.map((table) => admin.from(table).select('*').eq('user_id', user.id)),
  ]);

  const data: Record<string, unknown> = {};
  USER_TABLES.forEach((table, i) => {
    const { data: rows, error } = tables[i];
    if (error) {
      // A table that does not exist yet (migration not run) should not block the download
      data[table] = { error: 'unavailable' };
      return;
    }
    const strip = STRIP_COLUMNS[table] || [];
    data[table] = (rows || []).map((row: Record<string, unknown>) => {
      const copy = { ...row };
      for (const column of strip) delete copy[column];
      return copy;
    });
  });

  data.friendships = friendships.error ? { error: 'unavailable' } : friendships.data || [];
  data.film_questions = filmQuestions.error ? { error: 'unavailable' } : filmQuestions.data || [];
  data.follows = follows.error ? { error: 'unavailable' } : follows.data || [];
  data.founder_posts = founderPosts.error ? { error: 'unavailable' } : founderPosts.data || [];

  const body = {
    exported_at: new Date().toISOString(),
    app: 'Deadeye Basketball Training',
    account: { id: user.id, email: user.email, created_at: authUser.data?.user?.created_at ?? null },
    profile: profile.data || null,
    data,
    note: 'Uploaded video and profile-photo files are not included in this file. They stay in your account until you delete them.',
  };

  const filename = `deadeye-data-${new Date().toISOString().slice(0, 10)}.json`;
  return new Response(JSON.stringify(body, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
