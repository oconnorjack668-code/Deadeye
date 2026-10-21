// src/lib/recommend.ts
// Turns what a player told us during onboarding into a program recommendation.
//
// Onboarding asks for goals, strengths and focus areas, and until now those
// answers only ever reached the AI coach's prompt - so a player without an AI
// key configured answered three screens of questions and saw nothing come of
// it. The programs table already has a `goal` column and /programs already
// filters on it; this is the missing link between the two.
import { GOAL_LABELS } from '@/lib/programs';

/** Onboarding goal -> program goal key. */
const GOAL_MAP: Record<string, string> = {
  'Consistent Training Habit': 'complete',
  '3-Point Shooting Consistency': 'shooting',
  'Vertical Jump & Explosiveness': 'vertical',
  'Finishing Through Contact': 'finishing',
  'Pick & Roll Decision Making': 'complete',
  'Lockdown On-Ball Defense': 'athleticism',
  'Mid-Range Pull-Up Mastery': 'shooting',
  'Off-Hand Ball Handling & Flow': 'ball_handling',
};

/** Onboarding focus area -> program goal key. */
const FOCUS_MAP: Record<string, string> = {
  'Shooting Arc & Dip': 'shooting',
  'Floater Range & Touch': 'finishing',
  'First Step Acceleration': 'athleticism',
  'Defensive Lateral Slide Speed': 'athleticism',
  'Strong Ankles & Knees': 'athleticism',
  // The names these had before 21 Oct 2026, still on older profiles
  'Shooting Arc & Kinetic Dip': 'shooting',
  'Ankle & Knee Deceleration Durability': 'athleticism',
  'Free Throw Routine': 'shooting',
  'Off-Ball Spacing & Cuts': 'complete',
};

/**
 * The program goal that best fits a player's stated goals and focus areas.
 *
 * Goals are weighted above focus areas because a goal is what the player says
 * they want, while a focus area is a detail of how to get there. Earlier picks
 * in each list count for slightly more, so the first thing somebody chose
 * breaks a tie. Returns null when nothing was selected or nothing maps.
 */
export function recommendedProgramGoal(
  goals: string[] | null | undefined,
  focusAreas: string[] | null | undefined
): string | null {
  const scores = new Map<string, number>();

  const add = (key: string | undefined, weight: number) => {
    if (!key) return;
    scores.set(key, (scores.get(key) || 0) + weight);
  };

  (goals || []).forEach((g, i) => add(GOAL_MAP[g], 10 - Math.min(i, 5)));
  (focusAreas || []).forEach((f, i) => add(FOCUS_MAP[f], 5 - Math.min(i, 4)));

  let best: string | null = null;
  let bestScore = 0;
  for (const [key, score] of scores) {
    if (score > bestScore) {
      best = key;
      bestScore = score;
    }
  }
  return best;
}

/** Human label for a program goal key, e.g. "shooting" -> "Shooting". */
export function programGoalLabel(goal: string | null): string | null {
  return goal ? GOAL_LABELS[goal] || null : null;
}
