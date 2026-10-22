// src/lib/supabase/types.ts
// Database schema type definitions for Deadeye

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'player' | 'owner' | 'admin';
export type PlanType = 'free' | 'pro' | 'owner';
export type AgeBracket = '13' | '14-17' | '18-22' | '23-30' | '30+';
export type AppMode = 'playing' | 'coaching';
export type ConsentStatus = 'not_needed' | 'pending' | 'approved' | 'withdrawn';
export type BasketballPosition = 'PG' | 'SG' | 'SF' | 'PF' | 'C' | 'G' | 'F' | 'multi';
export type DominantHand = 'left' | 'right' | 'ambidextrous';
export type PlayingLevel = 'beginner' | 'intermediate' | 'advanced' | 'elite' | 'college_pro';

export type SessionType =
  | 'shooting'
  | 'ball-handling'
  | 'footwork'
  | 'scrimmage'
  | 'pickup'
  | 'skills'
  | 'game'
  | 'mixed';

export type DrillCategory =
  | 'shooting'
  | 'ball-handling'
  | 'finishing'
  | 'footwork'
  | 'defense'
  | 'conditioning'
  | 'passing'
  | 'other';

export type ShotZone =
  | 'paint'
  | 'free-throw'
  | 'mid-left-corner'
  | 'mid-left-wing'
  | 'mid-center'
  | 'mid-right-wing'
  | 'mid-right-corner'
  | 'three-left-corner'
  | 'three-left-wing'
  | 'three-top'
  | 'three-right-wing'
  | 'three-right-corner'
  | 'deep-three'
  | 'all-around';

export type ShotType =
  | 'catch-and-shoot'
  | 'off-the-dribble'
  | 'step-back'
  | 'free-throw'
  | 'floater'
  | 'pull-up'
  | 'spot-up';

export type WorkoutType =
  | 'strength'
  | 'power_plyos'
  | 'mobility'
  | 'recovery'
  | 'conditioning'
  | 'testing'
  | 'mixed';

export type ExerciseCategory =
  | 'legs'
  | 'upper_body_push'
  | 'upper_body_pull'
  | 'core'
  | 'plyometrics'
  | 'mobility'
  | 'conditioning'
  | 'recovery'
  | 'warmup';

export type PerformanceTestType =
  | 'standing_vertical'
  | 'approach_vertical'
  | 'sprint_10m'
  | 'sprint_20m'
  | 'sprint_three_quarter'
  | 'sprint_40yd'
  | 'lane_agility'
  | 'pro_agility_5_10_5'
  | 'standing_broad_jump'
  | 'custom';

export type GoalType =
  | 'weekly_training_days'
  | 'weekly_makes'
  | 'shooting_pct'
  | 'strength_days'
  | 'iq_study_items'
  | 'custom';

export type StudyCategory =
  | 'shooting_mechanics'
  | 'finishing'
  | 'ball_handling'
  | 'pick_and_roll'
  | 'defense'
  | 'spacing_and_movement'
  | 'transition'
  | 'film_study'
  // Added by 00012, which widened study_topics_category_check from 8 to 12 and
  // immediately seeded topics using all four. Anything switching on this type
  // silently mishandled those topics until they were added here.
  | 'rebounding'
  | 'post_play'
  | 'game_situations'
  | 'mental_game';

export type VideoCaptureAngle =
  | 'fixed_side_right'
  | 'fixed_side_left'
  | 'fixed_front'
  | 'fixed_45_angle';

export type VideoDrillType =
  | 'catch_and_shoot'
  | 'free_throw'
  | 'pull_up_jumper'
  | 'form_shooting'
  | 'custom';

export type VideoAnalysisStatus =
  | 'uploaded'
  | 'queued'
  | 'processing'
  | 'completed'
  | 'needs_review'
  | 'failed';

export interface Database {
  public: {
    // supabase-js's GenericSchema constraint requires Tables, Views and Functions
    // all three to be present for the client's generics to resolve at all. The
    // app queries no views, so this stays empty - but the key still has to
    // exist, because without it every `.from(table)` call across the whole app
    // silently degrades to `never` instead of a real row type (which is exactly
    // what was happening before this was added: no lint rule catches it, and
    // `tsc`/`next build` had never actually been run to completion before now).
    //
    // The database does still carry one view, leaderboard_standings from 00007.
    // Nothing reads it and migration 00027 drops it; if a view is ever used
    // again it has to be declared here or its queries will type as `never`.
    Views: Record<string, never>;
    Tables: {
      // Players read their own row; only the server writes (00036)
      age_checks: {
        Row: {
          user_id: string;
          is_16_plus: boolean;
          answered_at: string;
          consent_status: ConsentStatus;
          request_token: string | null;
          parent_name: string | null;
          parent_email: string | null;
          confirm_token: string | null;
          confirm_sent_at: string | null;
          approved_at: string | null;
          approval_method: 'email' | 'link' | null;
          withdrawn_at: string | null;
        };
        Insert: {
          user_id: string;
          is_16_plus: boolean;
          answered_at?: string;
          consent_status?: ConsentStatus;
          request_token?: string | null;
        };
        Update: {
          consent_status?: ConsentStatus;
          parent_name?: string | null;
          parent_email?: string | null;
          confirm_token?: string | null;
          confirm_sent_at?: string | null;
          approved_at?: string | null;
          approval_method?: 'email' | 'link' | null;
          withdrawn_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          display_name: string;
          age_bracket: AgeBracket | null;
          height_cm: number | null;
          position: BasketballPosition | null;
          dominant_hand: DominantHand | null;
          playing_level: PlayingLevel | null;
          goals: string[];
          strengths: string[];
          focus_areas: string[];
          onboarding_completed: boolean;
          avatar_url: string | null;
          is_public: boolean;
          measurement_system: 'imperial' | 'metric';
          friend_code: string;
          country: string | null;
          region: string | null;
          timezone: string | null;
          account_role: 'player' | 'coach' | 'both';
          show_position: boolean;
          show_height: boolean;
          show_location: boolean;
          allow_friend_requests: boolean;
          share_with_coaches: boolean;
          ai_coaching_enabled: boolean;
          // Added by 00043_avatars_photos_levels.sql
          avatar_emoji: string | null;
          avatar_color: string | null;
          // Added by 00047_coach_side.sql: the side of the app a player-coach last used
          app_mode: AppMode | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          age_bracket?: AgeBracket | null;
          height_cm?: number | null;
          position?: BasketballPosition | null;
          dominant_hand?: DominantHand | null;
          playing_level?: PlayingLevel | null;
          goals?: string[];
          strengths?: string[];
          focus_areas?: string[];
          onboarding_completed?: boolean;
          avatar_url?: string | null;
          is_public?: boolean;
          measurement_system?: 'imperial' | 'metric';
          country?: string | null;
          region?: string | null;
          timezone?: string | null;
          account_role?: 'player' | 'coach' | 'both';
          show_position?: boolean;
          show_height?: boolean;
          show_location?: boolean;
          allow_friend_requests?: boolean;
          share_with_coaches?: boolean;
          ai_coaching_enabled?: boolean;
          avatar_emoji?: string | null;
          avatar_color?: string | null;
          app_mode?: AppMode | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          age_bracket?: AgeBracket | null;
          height_cm?: number | null;
          position?: BasketballPosition | null;
          dominant_hand?: DominantHand | null;
          playing_level?: PlayingLevel | null;
          goals?: string[];
          strengths?: string[];
          focus_areas?: string[];
          onboarding_completed?: boolean;
          avatar_url?: string | null;
          is_public?: boolean;
          measurement_system?: 'imperial' | 'metric';
          country?: string | null;
          region?: string | null;
          timezone?: string | null;
          account_role?: 'player' | 'coach' | 'both';
          show_position?: boolean;
          show_height?: boolean;
          show_location?: boolean;
          allow_friend_requests?: boolean;
          share_with_coaches?: boolean;
          ai_coaching_enabled?: boolean;
          avatar_emoji?: string | null;
          avatar_color?: string | null;
          app_mode?: AppMode | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      // 00043_avatars_photos_levels.sql. Written only by the server.
      profile_photos: {
        Row: {
          user_id: string;
          path: string;
          visibility: 'everyone' | 'friends' | 'me';
          status: 'pending' | 'approved';
          consent_by: 'player' | 'parent';
          approval_token: string | null;
          created_at: string;
          approved_at: string | null;
        };
        Insert: {
          user_id: string;
          path: string;
          visibility?: 'everyone' | 'friends' | 'me';
          status: 'pending' | 'approved';
          consent_by: 'player' | 'parent';
          approval_token?: string | null;
          created_at?: string;
          approved_at?: string | null;
        };
        Update: {
          path?: string;
          visibility?: 'everyone' | 'friends' | 'me';
          status?: 'pending' | 'approved';
          consent_by?: 'player' | 'parent';
          approval_token?: string | null;
          approved_at?: string | null;
        };
        Relationships: [];
      };
      // A player home club (00051): only the player reads it; written by api/profile/club
      player_clubs: {
        Row: { user_id: string; club_id: string; show_on_card: boolean; updated_at: string };
        Insert: { user_id: string; club_id: string; show_on_card?: boolean; updated_at?: string };
        Update: { club_id?: string; show_on_card?: boolean; updated_at?: string };
        Relationships: [];
      };
      // "My club is not listed" (00051): written by api/clubs/suggest, read by the player and the owner
      club_suggestions: {
        Row: { id: string; user_id: string; club_name: string; town: string | null; county: string | null; resolved: boolean; created_at: string };
        Insert: { id?: string; user_id: string; club_name: string; town?: string | null; county?: string | null; resolved?: boolean; created_at?: string };
        Update: { resolved?: boolean };
        Relationships: [];
      };
      // Following the founder (00050): written only through set_follow
      follows: {
        Row: { follower_id: string; followed_id: string; created_at: string };
        Insert: { follower_id: string; followed_id: string; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      // Founder posts (00050): written only by the server, read by every signed-in player
      founder_posts: {
        Row: { id: string; author_id: string; kind: 'challenge' | 'tip' | 'update'; body: string; created_at: string };
        Insert: { id?: string; author_id: string; kind: 'challenge' | 'tip' | 'update'; body: string; created_at?: string };
        Update: Record<string, never>;
        Relationships: [];
      };
      player_levels: {
        Row: { user_id: string; level: number; xp: number; updated_at: string };
        Insert: { user_id: string; level: number; xp: number; updated_at?: string };
        Update: { level?: number; xp?: number; updated_at?: string };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          user_id: string;
          role: UserRole;
          granted_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role: UserRole;
          granted_at?: string;
        };
        Update: {
          role?: UserRole;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan_type: PlanType;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          video_credits_remaining: number;
          ai_credits_remaining: number;
          /** The month ai_credits_remaining belongs to (00037); another month means a refill is due. */
          ai_credits_period: string | null;
          /** Founding member offer (00037). Claimed is never cleared: it also marks the founder price. */
          founding_claimed_at: string | null;
          founding_pro_until: string | null;
          founding_reminded_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan_type?: PlanType;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          video_credits_remaining?: number;
          ai_credits_remaining?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan_type?: PlanType;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          video_credits_remaining?: number;
          ai_credits_remaining?: number;
          ai_credits_period?: string | null;
          founding_reminded_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          reminder_enabled: boolean;
          reminder_days: number[];
          reminder_time: string;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          email_reminders: boolean;
          push_enabled: boolean;
          // Added by 00019_push_reminders.sql and 00021_friends_and_coach_chat.sql
          timezone: string;
          last_reminded_on: string | null;
          weekly_report: boolean;
          last_weekly_report_on: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          reminder_enabled?: boolean;
          reminder_days?: number[];
          reminder_time?: string;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          email_reminders?: boolean;
          push_enabled?: boolean;
          timezone?: string;
          last_reminded_on?: string | null;
          weekly_report?: boolean;
          last_weekly_report_on?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          reminder_enabled?: boolean;
          reminder_days?: number[];
          timezone?: string;
          last_reminded_on?: string | null;
          weekly_report?: boolean;
          last_weekly_report_on?: string | null;
          reminder_time?: string;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          email_reminders?: boolean;
          push_enabled?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      training_sessions: {
        Row: {
          id: string;
          user_id: string;
          session_date: string;
          session_type: SessionType;
          duration_minutes: number;
          intensity_rpe: number;
          perceived_quality: number;
          notes: string | null;
          verified_by_video: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_date: string;
          session_type: SessionType;
          duration_minutes: number;
          intensity_rpe: number;
          perceived_quality: number;
          notes?: string | null;
          verified_by_video?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        // verified_by_video is deliberately absent: it records where a count
        // came from, and an edit cannot change that after the fact.
        Update: {
          session_date?: string;
          session_type?: SessionType;
          duration_minutes?: number;
          intensity_rpe?: number;
          perceived_quality?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      session_drills: {
        Row: {
          id: string;
          session_id: string;
          user_id: string;
          drill_name: string;
          drill_category: DrillCategory;
          duration_minutes: number | null;
          notes: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          user_id: string;
          drill_name: string;
          drill_category: DrillCategory;
          duration_minutes?: number | null;
          notes?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          drill_name?: string;
          drill_category?: DrillCategory;
          duration_minutes?: number | null;
          notes?: string | null;
          display_order?: number;
        };
        Relationships: [];
      };
      shooting_entries: {
        Row: {
          id: string;
          drill_id: string;
          user_id: string;
          shot_zone: ShotZone;
          shot_type: ShotType | null;
          makes: number;
          attempts: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          drill_id: string;
          user_id: string;
          shot_zone: ShotZone;
          shot_type?: ShotType | null;
          makes?: number;
          attempts: number;
          created_at?: string;
        };
        Update: {
          shot_zone?: ShotZone;
          shot_type?: ShotType | null;
          makes?: number;
          attempts?: number;
        };
        Relationships: [];
      };
      exercise_library: {
        Row: {
          id: string;
          user_id: string | null;
          name: string;
          category: ExerciseCategory;
          muscle_groups: string[];
          equipment: string[];
          description: string | null;
          is_system: boolean;
          // Added by 00011_gym_library_and_routines.sql
          primary_muscle: string | null;
          cues: string[];
          is_basketball_specific: boolean;
          created_at: string;
          // Added by 00042_drill_favourites_and_demo_videos.sql
          demo_video_id: string | null;
          // Added by 00048_training_gaps.sql: one line on an easier exercise
          easier_version: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          name: string;
          category: ExerciseCategory;
          muscle_groups?: string[];
          equipment?: string[];
          description?: string | null;
          is_system?: boolean;
          primary_muscle?: string | null;
          cues?: string[];
          is_basketball_specific?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          category?: ExerciseCategory;
          muscle_groups?: string[];
          equipment?: string[];
          description?: string | null;
          primary_muscle?: string | null;
          cues?: string[];
          is_basketball_specific?: boolean;
          demo_video_id?: string | null;
          easier_version?: string | null;
        };
        Relationships: [];
      };
      workouts: {
        Row: {
          id: string;
          user_id: string;
          workout_date: string;
          workout_type: WorkoutType;
          duration_minutes: number;
          rpe: number;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workout_date: string;
          workout_type: WorkoutType;
          duration_minutes: number;
          rpe: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          workout_date?: string;
          workout_type?: WorkoutType;
          duration_minutes?: number;
          rpe?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      workout_sets: {
        Row: {
          id: string;
          workout_id: string;
          user_id: string;
          exercise_id: string | null;
          exercise_name: string;
          exercise_category: string | null;
          set_number: number;
          reps: number | null;
          weight_kg: number | null;
          duration_seconds: number | null;
          distance_meters: number | null;
          rpe: number | null;
          is_personal_record: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workout_id: string;
          user_id: string;
          exercise_id?: string | null;
          exercise_name: string;
          exercise_category?: string | null;
          set_number: number;
          reps?: number | null;
          weight_kg?: number | null;
          duration_seconds?: number | null;
          distance_meters?: number | null;
          rpe?: number | null;
          is_personal_record?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          exercise_name?: string;
          exercise_category?: string | null;
          set_number?: number;
          reps?: number | null;
          weight_kg?: number | null;
          duration_seconds?: number | null;
          distance_meters?: number | null;
          rpe?: number | null;
          is_personal_record?: boolean;
          notes?: string | null;
        };
        Relationships: [];
      };
      performance_tests: {
        Row: {
          id: string;
          user_id: string;
          test_date: string;
          test_type: PerformanceTestType;
          custom_test_name: string | null;
          value: number;
          unit: string;
          is_personal_record: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          test_date: string;
          test_type: PerformanceTestType;
          custom_test_name?: string | null;
          value: number;
          unit: string;
          is_personal_record?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          test_date?: string;
          test_type?: PerformanceTestType;
          custom_test_name?: string | null;
          value?: number;
          unit?: string;
          is_personal_record?: boolean;
          notes?: string | null;
        };
        Relationships: [];
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          goal_type: GoalType;
          target_value: number;
          current_value: number;
          period: string;
          title: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_type: GoalType;
          target_value: number;
          current_value?: number;
          period?: string;
          title: string;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          goal_type?: GoalType;
          target_value?: number;
          current_value?: number;
          period?: string;
          title?: string;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      daily_iq_answers: {
        Row: {
          id: string;
          user_id: string;
          answer_date: string;
          item_id: string;
          question_index: number;
          chosen_index: number;
          was_correct: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          answer_date: string;
          item_id: string;
          question_index: number;
          chosen_index: number;
          was_correct: boolean;
          created_at?: string;
        };
        // No Update: an answer, once given, stands (the table grants no UPDATE).
        Update: Record<string, never>;
        Relationships: [];
      };
      fuel_logs: {
        Row: {
          id: string;
          user_id: string;
          log_date: string;
          ate_before: boolean | null;
          ate_after: boolean | null;
          hydration: string | null;
          sleep_hours: number | null;
          energy: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          log_date: string;
          ate_before?: boolean | null;
          ate_after?: boolean | null;
          hydration?: string | null;
          sleep_hours?: number | null;
          energy?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          ate_before?: boolean | null;
          ate_after?: boolean | null;
          hydration?: string | null;
          sleep_hours?: number | null;
          energy?: number | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_reports: {
        Row: {
          id: string;
          user_id: string;
          report_type: string;
          input_data: Json;
          input_version: string;
          provider: string;
          model: string;
          prompt_version: string;
          output_content: Json;
          confidence_score: number | null;
          status: string;
          source_session_ids: string[];
          correlation_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          report_type: string;
          input_data: Json;
          input_version?: string;
          provider: string;
          model: string;
          prompt_version?: string;
          output_content: Json;
          confidence_score?: number | null;
          status?: string;
          source_session_ids?: string[];
          correlation_id?: string;
          created_at?: string;
        };
        Update: {
          status?: string;
        };
        Relationships: [];
      };
      study_topics: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string;
          category: StudyCategory;
          icon_name: string | null;
          display_order: number;
          is_active: boolean;
          /** One of the sections open on Free (00037). */
          is_free: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description: string;
          category: StudyCategory;
          icon_name?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          slug?: string;
          description?: string;
          category?: StudyCategory;
          icon_name?: string | null;
          display_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      study_items: {
        Row: {
          id: string;
          topic_id: string;
          title: string;
          description: string;
          youtube_video_id: string;
          youtube_channel: string;
          duration_minutes: number | null;
          key_takeaways: string[];
          reflection_prompt: string;
          quiz_questions: Json;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          topic_id: string;
          title: string;
          description: string;
          youtube_video_id: string;
          youtube_channel: string;
          duration_minutes?: number | null;
          key_takeaways?: string[];
          reflection_prompt: string;
          quiz_questions?: Json;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          youtube_video_id?: string;
          youtube_channel?: string;
          duration_minutes?: number | null;
          key_takeaways?: string[];
          reflection_prompt?: string;
          quiz_questions?: Json;
          display_order?: number;
          is_active?: boolean;
        };
        Relationships: [];
      };
      study_progress: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          watched: boolean;
          reflection_notes: string | null;
          quiz_score: number | null;
          quiz_answers: Json;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_id: string;
          watched?: boolean;
          reflection_notes?: string | null;
          quiz_score?: number | null;
          quiz_answers?: Json;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          watched?: boolean;
          reflection_notes?: string | null;
          quiz_score?: number | null;
          quiz_answers?: Json;
          completed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      leaderboard_seasons: {
        Row: {
          id: string;
          name: string;
          starts_at: string;
          ends_at: string;
          scoring_rules: Json;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          starts_at: string;
          ends_at: string;
          scoring_rules?: Json;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          name?: string;
          starts_at?: string;
          ends_at?: string;
          scoring_rules?: Json;
          is_active?: boolean;
        };
        Relationships: [];
      };
      challenge_completions: {
        Row: {
          id: string;
          user_id: string;
          season_id: string | null;
          challenge_id: string | null;
          challenge_type: string;
          title: string;
          points_earned: number;
          verified: boolean;
          metadata: Json;
          // Added by 00018_challenges_and_badges.sql
          period_start: string | null;
          completed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          season_id?: string | null;
          challenge_id?: string | null;
          challenge_type: string;
          title: string;
          points_earned?: number;
          verified?: boolean;
          metadata?: Json;
          period_start?: string | null;
          completed_at?: string;
          created_at?: string;
        };
        Update: {
          points_earned?: number;
          verified?: boolean;
        };
        Relationships: [];
      };
      reward_events: {
        Row: {
          id: string;
          user_id: string;
          event_type: string;
          badge_id: string;
          badge_title: string;
          badge_description: string;
          icon_name: string;
          tier: string;
          season_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          event_type: string;
          badge_id: string;
          badge_title: string;
          badge_description: string;
          icon_name?: string;
          tier?: string;
          season_id?: string | null;
          created_at?: string;
        };
        Update: {
          badge_title?: string;
          badge_description?: string;
        };
        Relationships: [];
      };
      // A player asking a coach whether a decision in their own film was the
      // right read (migration 00035). Access to the clip follows the question.
      film_questions: {
        Row: {
          id: string;
          player_id: string;
          team_id: string | null;
          video_asset_id: string;
          moment_ms: number;
          question: string;
          player_read: string | null;
          verdict: 'good_read' | 'wrong_read' | 'depends' | null;
          coach_note: string | null;
          answered_by: string | null;
          answered_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          team_id?: string | null;
          video_asset_id: string;
          moment_ms: number;
          question: string;
          player_read?: string | null;
          created_at?: string;
        };
        // Only the answer. The column grant in 00035 enforces this in the
        // database too: a question, and the read the player committed to
        // before any answer arrived, are a record of what they thought at the
        // time, and editing either afterwards makes the comparison worthless.
        Update: {
          verdict?: 'good_read' | 'wrong_read' | 'depends' | null;
          coach_note?: string | null;
          answered_by?: string | null;
          answered_at?: string | null;
        };
        Relationships: [];
      };
      video_assets: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          storage_path: string;
          file_name: string;
          file_size_bytes: number;
          duration_seconds: number | null;
          mime_type: string;
          capture_angle: VideoCaptureAngle;
          drill_type: VideoDrillType;
          notes: string | null;
          analysis_status: VideoAnalysisStatus;
          consent_given: boolean;
          consent_timestamp: string | null;
          correlation_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          storage_path: string;
          file_name: string;
          file_size_bytes: number;
          duration_seconds?: number | null;
          mime_type: string;
          capture_angle: VideoCaptureAngle;
          drill_type: VideoDrillType;
          notes?: string | null;
          analysis_status?: VideoAnalysisStatus;
          consent_given: boolean;
          consent_timestamp?: string | null;
          correlation_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          storage_path?: string;
          duration_seconds?: number | null;
          notes?: string | null;
          analysis_status?: VideoAnalysisStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
      video_analysis_jobs: {
        Row: {
          id: string;
          video_id: string;
          user_id: string;
          job_status: string;
          idempotency_key: string;
          attempt_count: number;
          max_attempts: number;
          last_error: string | null;
          correlation_id: string;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          video_id: string;
          user_id: string;
          job_status?: string;
          idempotency_key: string;
          attempt_count?: number;
          max_attempts?: number;
          last_error?: string | null;
          correlation_id: string;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          job_status?: string;
          attempt_count?: number;
          last_error?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      video_measurements: {
        Row: {
          id: string;
          job_id: string;
          video_id: string;
          user_id: string;
          shot_number: number;
          frame_number: number | null;
          timestamp_ms: number | null;
          shot_phase: string | null;
          measurement_type: string;
          value: number;
          unit: string;
          confidence: number;
          landmarks: Json | null;
          shot_outcome: string | null;
          player_confirmed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          video_id: string;
          user_id: string;
          shot_number: number;
          frame_number?: number | null;
          timestamp_ms?: number | null;
          shot_phase?: string | null;
          measurement_type: string;
          value: number;
          unit: string;
          confidence: number;
          landmarks?: Json | null;
          shot_outcome?: string | null;
          player_confirmed?: boolean;
          created_at?: string;
        };
        Update: {
          shot_outcome?: string | null;
          player_confirmed?: boolean;
        };
        Relationships: [];
      };
      quiz_completions: {
        Row: {
          id: string;
          user_id: string;
          topic_id: string;
          score: number;
          total_questions: number;
          percentage: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic_id: string;
          score: number;
          total_questions: number;
          percentage: number;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      challenges: {
        Row: {
          id: string;
          season_id: string | null;
          challenge_type: string;
          title: string;
          description: string;
          points: number;
          start_date: string;
          end_date: string;
          is_active: boolean;
          // Added by 00018_challenges_and_badges.sql
          slug: string | null;
          rules: Json;
          recurring: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          season_id?: string | null;
          challenge_type: string;
          title: string;
          description: string;
          points?: number;
          start_date?: string;
          end_date: string;
          is_active?: boolean;
          slug?: string | null;
          rules?: Json;
          recurring?: boolean;
          created_at?: string;
        };
        Update: {
          title?: string;
          description?: string;
          points?: number;
          end_date?: string;
          is_active?: boolean;
          slug?: string | null;
          rules?: Json;
          recurring?: boolean;
        };
        Relationships: [];
      };
      // Added for migration 00014_training_programs.sql, which this hand-written
      // schema had not previously been updated to match.
      training_programs: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          goal: string;
          level: string;
          position: string;
          weeks: number;
          sessions_per_week: number;
          season: string;
          display_order: number;
          /** One of the programmes open on Free (00037). */
          is_free: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description: string;
          goal: string;
          level: string;
          position?: string;
          weeks: number;
          sessions_per_week: number;
          season?: string;
          display_order?: number;
          created_at?: string;
        };
        Update: {
          slug?: string;
          name?: string;
          description?: string;
          goal?: string;
          level?: string;
          position?: string;
          weeks?: number;
          sessions_per_week?: number;
          season?: string;
          display_order?: number;
        };
        Relationships: [];
      };
      program_days: {
        Row: {
          id: string;
          program_id: string;
          week: number;
          day: number;
          title: string;
          focus: string;
          estimated_minutes: number;
          items: Json;
        };
        Insert: {
          id?: string;
          program_id: string;
          week: number;
          day: number;
          title: string;
          focus: string;
          estimated_minutes: number;
          items?: Json;
        };
        Update: {
          week?: number;
          day?: number;
          title?: string;
          focus?: string;
          estimated_minutes?: number;
          items?: Json;
        };
        Relationships: [];
      };
      program_enrollments: {
        Row: {
          id: string;
          user_id: string;
          program_id: string;
          status: string;
          started_at: string;
          finished_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          program_id: string;
          status?: string;
          started_at?: string;
          finished_at?: string | null;
        };
        Update: {
          status?: string;
          finished_at?: string | null;
        };
        Relationships: [];
      };
      program_day_completions: {
        Row: {
          id: string;
          user_id: string;
          enrollment_id: string;
          program_day_id: string;
          completed_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          enrollment_id: string;
          program_day_id: string;
          completed_at?: string;
        };
        Update: {
          completed_at?: string;
        };
        Relationships: [];
      };
      // Added to close the gap between this hand-written schema and the real
      // database - these 18 tables existed in supabase/migrations but had never
      // been added here, which is why so much code resorted to `as any`.
      games: {
        Row: {
          id: string;
          user_id: string;
          game_date: string;
          game_type: string;
          opponent: string | null;
          result: string | null;
          team_score: number | null;
          opponent_score: number | null;
          minutes: number | null;
          fgm2: number;
          fga2: number;
          fgm3: number;
          fga3: number;
          ftm: number;
          fta: number;
          oreb: number;
          dreb: number;
          ast: number;
          stl: number;
          blk: number;
          tov: number;
          pf: number;
          points: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          game_date?: string;
          game_type?: string;
          opponent?: string | null;
          result?: string | null;
          team_score?: number | null;
          opponent_score?: number | null;
          minutes?: number | null;
          fgm2?: number;
          fga2?: number;
          fgm3?: number;
          fga3?: number;
          ftm?: number;
          fta?: number;
          oreb?: number;
          dreb?: number;
          ast?: number;
          stl?: number;
          blk?: number;
          tov?: number;
          pf?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          game_date?: string;
          game_type?: string;
          opponent?: string | null;
          result?: string | null;
          team_score?: number | null;
          opponent_score?: number | null;
          minutes?: number | null;
          fgm2?: number;
          fga2?: number;
          fgm3?: number;
          fga3?: number;
          ftm?: number;
          fta?: number;
          oreb?: number;
          dreb?: number;
          ast?: number;
          stl?: number;
          blk?: number;
          tov?: number;
          pf?: number;
          notes?: string | null;
        };
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          join_code: string;
          created_by: string | null;
          created_at: string;
          // Added by 00024_settings_region_coach.sql
          club_name: string | null;
          country: string | null;
          region: string | null;
          age_group: string | null;
          level: string | null;
          season: string | null;
          // Added by 00052_team_league.sql
          league_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          join_code?: string;
          created_by?: string | null;
          created_at?: string;
          club_name?: string | null;
          country?: string | null;
          region?: string | null;
          age_group?: string | null;
          level?: string | null;
          season?: string | null;
          league_id?: string | null;
        };
        Update: {
          name?: string;
          club_name?: string | null;
          country?: string | null;
          region?: string | null;
          age_group?: string | null;
          level?: string | null;
          season?: string | null;
          league_id?: string | null;
        };
        Relationships: [];
      };
      coach_profiles: {
        Row: {
          user_id: string;
          club_name: string | null;
          is_adult: boolean;
          vetting_declared_at: string | null;
          created_at: string;
          updated_at: string;
        };
        // Written only through save_coach_profile (00047)
        Insert: never;
        Update: never;
        Relationships: [];
      };
      team_members: {
        Row: { team_id: string; user_id: string; role: string; joined_at: string; share_details: boolean };
        Insert: { team_id: string; user_id: string; role?: string; joined_at?: string; share_details?: boolean };
        Update: { role?: string; share_details?: boolean };
        Relationships: [];
      };
      team_assignments: {
        Row: {
          id: string;
          team_id: string;
          created_by: string | null;
          title: string;
          details: string | null;
          link: string | null;
          due_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          created_by?: string | null;
          title: string;
          details?: string | null;
          link?: string | null;
          due_date?: string | null;
          created_at?: string;
        };
        Update: { title?: string; details?: string | null; link?: string | null; due_date?: string | null };
        Relationships: [];
      };
      team_assignment_completions: {
        Row: { assignment_id: string; user_id: string; completed_at: string };
        Insert: { assignment_id: string; user_id: string; completed_at?: string };
        Update: { completed_at?: string };
        Relationships: [];
      };
      app_errors: {
        Row: {
          id: string;
          created_at: string;
          user_id: string | null;
          source: string;
          message: string;
          stack: string | null;
          digest: string | null;
          url: string | null;
          user_agent: string | null;
          resolved: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id?: string | null;
          source: string;
          message: string;
          stack?: string | null;
          digest?: string | null;
          url?: string | null;
          user_agent?: string | null;
          resolved?: boolean;
        };
        Update: { resolved?: boolean };
        Relationships: [];
      };
      player_reports: {
        Row: {
          id: string;
          created_at: string;
          user_id: string;
          message: string;
          context: string | null;
          url: string | null;
          user_agent: string | null;
          resolved: boolean;
        };
        Insert: {
          id?: string;
          created_at?: string;
          user_id: string;
          message: string;
          context?: string | null;
          url?: string | null;
          user_agent?: string | null;
          resolved?: boolean;
        };
        Update: { resolved?: boolean };
        Relationships: [];
      };
      app_events: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          day: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          day?: string;
          created_at?: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      friendships: {
        Row: {
          id: string;
          requester_id: string;
          addressee_id: string;
          status: string;
          created_at: string;
          responded_at: string | null;
        };
        Insert: {
          id?: string;
          requester_id: string;
          addressee_id: string;
          status?: string;
          created_at?: string;
          responded_at?: string | null;
        };
        Update: { status?: string; responded_at?: string | null };
        Relationships: [];
      };
      coach_messages: {
        Row: { id: string; user_id: string; role: string; content: string; created_at: string };
        Insert: { id?: string; user_id: string; role: string; content: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      guides: {
        Row: {
          id: string;
          slug: string;
          category: string;
          title: string;
          summary: string;
          reading_minutes: number;
          sections: Json;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          category: string;
          title: string;
          summary: string;
          reading_minutes?: number;
          sections?: Json;
          display_order?: number;
          created_at?: string;
        };
        Update: { title?: string; summary?: string; sections?: Json; display_order?: number };
        Relationships: [];
      };
      workout_routines: {
        Row: { id: string; user_id: string; name: string; notes: string | null; created_at: string; updated_at: string };
        Insert: { id?: string; user_id: string; name: string; notes?: string | null; created_at?: string; updated_at?: string };
        Update: { name?: string; notes?: string | null; updated_at?: string };
        Relationships: [];
      };
      routine_exercises: {
        Row: {
          id: string;
          routine_id: string;
          user_id: string;
          exercise_id: string | null;
          exercise_name: string;
          target_sets: number;
          display_order: number;
        };
        Insert: {
          id?: string;
          routine_id: string;
          user_id: string;
          exercise_id?: string | null;
          exercise_name: string;
          target_sets?: number;
          display_order?: number;
        };
        Update: { target_sets?: number; display_order?: number };
        Relationships: [];
      };
      exercise_favorites: {
        Row: { user_id: string; exercise_id: string; created_at: string };
        Insert: { user_id: string; exercise_id: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      // 00042_drill_favourites_and_demo_videos.sql
      drill_favorites: {
        Row: { user_id: string; drill_id: string; created_at: string };
        Insert: { user_id: string; drill_id: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      drills: {
        Row: {
          id: string;
          slug: string;
          name: string;
          skill: string;
          sub_skill: string;
          level: string;
          players: string;
          equipment: string[];
          duration_minutes: number;
          reps: string;
          setup: string;
          instructions: string[];
          coaching_cues: string[];
          common_mistakes: string[];
          tracks_makes: boolean;
          created_at: string;
          // Added by 00042_drill_favourites_and_demo_videos.sql
          demo_video_id: string | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          skill: string;
          sub_skill: string;
          level: string;
          players: string;
          equipment?: string[];
          duration_minutes: number;
          reps: string;
          setup: string;
          instructions: string[];
          coaching_cues: string[];
          common_mistakes: string[];
          tracks_makes?: boolean;
          created_at?: string;
        };
        // Only the demo video is ever changed, by the owner
        Update: { demo_video_id?: string | null };
        Relationships: [];
      };
      video_analyses: {
        Row: { id: string; user_id: string; kind: string; session_id: string | null; summary: Json; created_at: string };
        Insert: { id?: string; user_id: string; kind: string; session_id?: string | null; summary?: Json; created_at?: string };
        Update: never;
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          p256dh: string;
          auth: string;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      nba_players: {
        Row: {
          id: string;
          slug: string;
          name: string;
          era: string;
          position: string;
          height_cm: number;
          archetype: string;
          style_tags: string[];
          shot_profile: Json;
          strengths: string[];
          signature_moves: string[];
          how_to_copy: string[];
          drill_skills: string[];
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          era: string;
          position: string;
          height_cm: number;
          archetype: string;
          style_tags?: string[];
          shot_profile: Json;
          strengths?: string[];
          signature_moves?: string[];
          how_to_copy?: string[];
          drill_skills?: string[];
        };
        Update: never;
        Relationships: [];
      };
      style_match_results: {
        Row: { id: string; user_id: string; source: string; input: Json; matches: Json; report: Json | null; created_at: string };
        Insert: {
          id?: string;
          user_id: string;
          source?: string;
          input: Json;
          matches: Json;
          report?: Json | null;
          created_at?: string;
        };
        Update: { report?: Json | null };
        Relationships: [];
      };
      leaderboard_snapshot: {
        Row: {
          season_id: string;
          user_id: string;
          points: number;
          sessions_completed: number;
          training_days: number;
          quizzes_passed: number;
          challenge_points: number;
          current_streak: number;
          computed_at: string;
        };
        Insert: {
          season_id: string;
          user_id: string;
          points?: number;
          sessions_completed?: number;
          training_days?: number;
          quizzes_passed?: number;
          challenge_points?: number;
          current_streak?: number;
          computed_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      leaderboard_refresh: {
        Row: { id: number; refreshed_at: string };
        Insert: { id: number; refreshed_at: string };
        Update: { refreshed_at?: string };
        Relationships: [];
      };
    };
    // Postgres functions called via supabase.rpc(). Hand-maintained to match the
    // SQL in supabase/migrations, since this project types its schema by hand
    // rather than running `supabase gen types`.
    Functions: {
      send_friend_request: { Args: { p_code: string }; Returns: string };
      send_friend_request_to: { Args: { p_user: string }; Returns: string };
      respond_friend_request: { Args: { p_friendship_id: string; p_accept: boolean }; Returns: void };
      remove_friendship: { Args: { p_friendship_id: string }; Returns: void };
      // training_streak(p_user) is deliberately absent: 00024 revokes EXECUTE
      // from authenticated and grants it to service_role only, so declaring it
      // here told callers they could invoke something a browser client cannot.
      // Use my_training_streaks() below for a player's own streak.
      friend_code_lookup: { Args: { p_code: string }; Returns: { user_id: string; display_name: string }[] };
      friends_overview: {
        Args: Record<string, never>;
        Returns: {
          friendship_id: string | null;
          user_id: string;
          display_name: string;
          avatar_url: string | null;
          player_position: string | null;
          status: string;
          is_me: boolean;
          sessions_7d: number;
          workouts_7d: number;
          minutes_7d: number;
          makes_7d: number;
          attempts_7d: number;
          streak: number;
          last_active: string | null;
        }[];
      };
      friend_feed: {
        Args: { p_limit?: number };
        Returns: { user_id: string; display_name: string; kind: string; happened_on: string; created_at: string; title: string; detail: string | null }[];
      };
      create_team: { Args: { p_name: string }; Returns: string };
      create_team_with_details: { Args: { p_name: string; p_club: string | null; p_age_group: string | null; p_level: string | null }; Returns: string };
      save_coach_profile: { Args: { p_club: string | null; p_is_adult: boolean; p_vetted: boolean; p_role: 'coach' | 'both' }; Returns: void };
      team_preview: { Args: { p_code: string }; Returns: { name: string; club_name: string | null; age_group: string | null; members: number }[] };
      join_team: { Args: { p_code: string }; Returns: string };
      delete_team: { Args: { p_team: string }; Returns: void };
      set_team_role: { Args: { p_team: string; p_user: string; p_role: string }; Returns: void };
      team_roster: {
        Args: { p_team: string };
        Returns: {
          user_id: string;
          display_name: string;
          player_position: string | null;
          role: string;
          share_details: boolean;
          sessions_7d: number;
          workouts_7d: number;
          minutes_7d: number;
          makes_7d: number;
          attempts_7d: number;
          // Added by migration 00034. Nullable here because a database that has
          // not run it yet returns rows without the column, and the dashboard
          // treats a missing count as none rather than failing.
          verified_7d: number | null;
          sessions_28d: number;
          streak: number;
          last_active: string | null;
          games: number;
          ppg: number | null;
          rpg: number | null;
          apg: number | null;
          fg_pct: number | null;
        }[];
      };
      coach_player_detail: { Args: { p_team: string; p_user: string }; Returns: Json };
      player_card: { Args: { p_user: string }; Returns: Json };
      // The club to show on a player card, or null (00051)
      player_club_badge: { Args: { p_user: string }; Returns: string | null };
      // Follow or unfollow the founder, and how many follow you (00050)
      set_follow: { Args: { p_user: string; p_follow: boolean }; Returns: 'following' | 'not_following' | 'not_followable' };
      follower_count: { Args: Record<string, never>; Returns: number };
      // The photo paths this viewer may see, by player_card's rule (00049)
      visible_photo_paths: { Args: { p_users: string[] }; Returns: { user_id: string; path: string }[] };
      my_shot_totals: { Args: Record<string, never>; Returns: { shot_zone: string; makes: number; attempts: number }[] };
      // Service role only (00037)
      claim_founding_pro: { Args: { p_user: string; p_limit: number; p_months: number }; Returns: 'claimed' | 'already' | 'has_pro' | 'full' };
      my_training_streaks: { Args: { p_today: string }; Returns: { longest_streak: number; current_streak: number }[] };
      leaderboard_page: {
        Args: { p_scope?: string; p_age?: string; p_team?: string | null; p_limit?: number };
        Returns: {
          user_id: string;
          player_name: string;
          points: number;
          rank: number;
          sessions_completed: number;
          training_days: number;
          quizzes_passed: number;
          challenge_points: number;
          current_streak: number;
          is_me: boolean;
          total: number;
        }[];
      };
    };
  };
}
