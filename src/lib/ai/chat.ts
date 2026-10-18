// src/lib/ai/chat.ts
// AI Coach chat rules shared by the API route and the chat page.
import { calendarNow } from '@/lib/dates';
import { coachPrompt } from '@/lib/ai/persona';

// 3 a day on Free (src/lib/plans.ts): enough to see what the coach is like, with Pro for a conversation
export const FREE_CHAT_PER_DAY = 3;
export const MAX_CHAT_MESSAGE = 1000;
/** Earlier messages sent back to the model for context */
export const CHAT_HISTORY_TURNS = 12;

export const COACH_SYSTEM_PROMPT = coachPrompt(`Your task: answer the player's question in a chat.

How to answer:
- Use the player's training data below. Quote their real numbers (percentages, zones, sessions) when relevant.
- Be specific and practical: drills with reps/sets, cues, and what to track next. Prefer short paragraphs and bullet points; aim for under 180 words unless they ask for a full plan.
- If the data doesn't cover the question, say so briefly and give general best practice.
- Suggest Deadeye features when useful: Shot tracker (Hoops), Form check, Jump test and highlight reels (Video), Game stats, Programs, Drills, IQ Study, Style Match, Goals, Teams.
- Stay on basketball, training, strength and conditioning, recovery, nutrition basics, mindset and the game's rules/IQ. Politely decline unrelated requests.`);

/** When "today" began for the daily free-question limit (midnight on the players' calendar). */
export function todayStartIso(timeZone?: string, now = new Date()): string {
  return calendarNow(now, timeZone).todayStartIso;
}

export const CHAT_STARTERS = [
  'What should I work on this week?',
  'Why is my three-point % low?',
  'Give me a 30-minute shooting workout',
  'How do I get a quicker release?',
  'Build me a vertical jump plan',
];
