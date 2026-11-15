// src/lib/focus/content.ts
// SERVER-ONLY: loads the drills, IQ lessons and guides Focus Finder chooses
// from, for the page and for the AI plan, so both see exactly the same list.
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';
import { getHasPro } from '@/lib/auth';
import { getActiveProgram, studySlugsIn } from '@/lib/programs';
import { isRealYoutubeId } from '@/lib/video/youtube';
import type { FocusContent, FocusDrill, FocusLesson, FocusGuide } from './plan';
import { dataSignals, type DataSignal, type IqAnswer, type ShotTotal } from './signals';

type Client = SupabaseClient<Database>;

interface TopicRow {
  id: string;
  slug: string;
  title: string;
  is_free: boolean;
  display_order: number;
  study_items: Array<{
    id: string;
    title: string;
    youtube_video_id: string;
    youtube_channel: string;
    duration_minutes: number | null;
    quiz_questions: unknown;
    display_order: number;
    is_active: boolean;
  }>;
}

export async function loadFocusContent(supabase: Client, userId: string): Promise<FocusContent> {
  const [{ data: drills }, { data: topics }, { data: guides }, isPro, active] = await Promise.all([
    supabase
      .from('drills')
      .select('id, slug, name, skill, sub_skill, level, players, duration_minutes, demo_video_id')
      // Warm-ups and cool-downs go in every session; they fix nothing on their own
      .not('skill', 'in', '(warm_up,cool_down)')
      .order('name'),
    supabase
      .from('study_topics')
      .select('id, slug, title, is_free, display_order, study_items(id, title, youtube_video_id, youtube_channel, duration_minutes, quiz_questions, display_order, is_active)')
      .eq('is_active', true)
      .order('display_order'),
    supabase.from('guides').select('slug, title, category, reading_minutes').order('display_order'),
    getHasPro(),
    getActiveProgram(supabase, userId),
  ]);

  // The same rule as /study: a section opens on Pro, when it is free, or when the active programme includes it
  const inProgramme = active ? studySlugsIn(active.days) : new Set<string>();

  const lessons: FocusLesson[] = [];
  for (const t of (topics || []) as unknown as TopicRow[]) {
    const canOpen = isPro || t.is_free || inProgramme.has(t.slug);
    for (const i of [...t.study_items].filter((i) => i.is_active).sort((a, b) => a.display_order - b.display_order)) {
      lessons.push({
        id: i.id,
        title: i.title,
        topicId: t.id,
        topicSlug: t.slug,
        topicTitle: t.title,
        channel: i.youtube_channel,
        durationMinutes: i.duration_minutes,
        questionCount: Array.isArray(i.quiz_questions) ? i.quiz_questions.length : 0,
        hasVideo: isRealYoutubeId(i.youtube_video_id),
        canOpen,
      });
    }
  }

  return {
    drills: (drills || []) as FocusDrill[],
    lessons,
    guides: (guides || []).map((g): FocusGuide => ({ slug: g.slug, title: g.title, category: g.category, readingMinutes: g.reading_minutes })),
  };
}

/**
 * Suggested weaknesses from the player's own log: career shots by zone, the
 * last few months of daily IQ answers, coach verdicts on their film questions,
 * and what they picked at setup. Every query is the player's own rows (RLS).
 */
export async function loadPlayerSignals(supabase: Client, userId: string): Promise<DataSignal[]> {
  const since = new Date(Date.now() - 120 * 86_400_000).toISOString().slice(0, 10);
  const [shots, iq, film, profile] = await Promise.all([
    supabase.rpc('my_shot_totals'),
    supabase
      .from('daily_iq_answers')
      .select('was_correct, study_items(study_topics(slug, title))')
      .eq('user_id', userId)
      .gte('answer_date', since)
      .limit(400),
    supabase.from('film_questions').select('verdict').eq('player_id', userId).not('answered_at', 'is', null).limit(200),
    supabase.from('profiles').select('goals, focus_areas').eq('id', userId).maybeSingle(),
  ]);

  const iqAnswers: IqAnswer[] = [];
  for (const row of (iq.data || []) as unknown as Array<{
    was_correct: boolean;
    study_items: { study_topics: { slug: string; title: string } | null } | null;
  }>) {
    const topic = row.study_items?.study_topics;
    if (topic) iqAnswers.push({ topicSlug: topic.slug, topicTitle: topic.title, wasCorrect: row.was_correct });
  }

  return dataSignals({
    shotTotals: (shots.data || []) as ShotTotal[],
    iqAnswers,
    filmVerdicts: (film.data || []).map((f) => f.verdict as string | null),
    goals: profile.data?.goals || [],
    focusAreas: profile.data?.focus_areas || [],
  });
}
