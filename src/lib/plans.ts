// src/lib/plans.ts
// What Free and Pro include, in one place, for every page that describes them
// (the Pro page and the landing page). Two copies of a price list drift, and
// the one that drifts is the one a player reads before paying.
//
// Every line here has to be true of the code as it stands: these are claims
// made to people deciding whether to pay. When what is gated changes, change
// it here in the same commit. Where each limit lives:
//   AI reports a month  FREE_MONTHLY_AI_REPORTS  src/lib/entitlements.ts
//   coach questions     FREE_CHAT_PER_DAY        src/lib/ai/chat.ts
//   free programmes     training_programs.is_free (00037)
//   free IQ sections    study_topics.is_free (00037)
//   30-day shot chart   dashboard page
//
// The thinking behind the split: Free keeps everything that brings players in
// and everything that is their own data. Pro is coaching - structure,
// personalisation and insight over time - which is what people pay for, plus
// unlimited AI, the one thing that costs money every time it runs.
import { FREE_MONTHLY_AI_REPORTS } from './entitlements';
import { FREE_CHAT_PER_DAY } from './ai/chat';

export interface Plan {
  name: string;
  tagline: string;
  features: string[];
}

export const FREE_PLAN: Plan = {
  name: 'Free',
  // Not "everything you need to train": a free tier described as complete
  // tells a player there is no reason to look at the other one.
  tagline: 'Track your shots and start training',
  features: [
    'Automatic shot tracking from your camera or a video, with no limit',
    'Log every session, workout and test, and keep your full history',
    'All 150 drills, and form check whenever you want',
    '3 complete training programmes',
    'Basketball IQ: the question of the day and the first 3 sections',
    'Your shot chart for the last 30 days',
    `${FREE_MONTHLY_AI_REPORTS} AI coaching reports a month and ${FREE_CHAT_PER_DAY} questions to the coach a day`,
    'Friends, leaderboard, challenges, badges and highlight reels',
  ],
};

export const PRO_PLAN: Plan = {
  name: 'Pro',
  tagline: 'Your own coach, with no limits',
  features: [
    'Unlimited AI coaching on every session and video',
    'Unlimited questions to your AI coach, plus a weekly AI report',
    'Every training programme, built around a goal or your position',
    'Every Basketball IQ section, with all lessons and quizzes',
    'Your all-time shot chart, and how your form changes over time',
    'An AI development plan from your NBA style match',
    'Create teams and coach them from one dashboard',
    'Everything in Free',
  ],
};

/**
 * Pro's planned prices, shown until Stripe is set up (after that the live
 * prices come from Stripe via proPriceLabels, so the two cannot disagree).
 */
export const PRO_PRICE_FALLBACK = '€6.99/month or €49.99/year';

/** Why Pro costs money, in plain words. Shown on the Pro page and the landing page. */
export const WHY_PRO_COSTS: Array<{ title: string; text: string }> = [
  {
    title: 'AI costs money every time it runs',
    text: 'Every AI report and every answer from the coach is paid for. That is why Free has a monthly allowance and Pro does not.',
  },
  {
    title: 'No ads, and your data is never sold',
    text: 'Pro is how Deadeye pays its way without doing either.',
  },
  {
    title: 'Servers and storage',
    text: 'Keeping your training history and videos stored and available, on any phone you log in from.',
  },
  {
    title: 'What gets built next',
    text: 'Pro pays for the features still to come.',
  },
];
