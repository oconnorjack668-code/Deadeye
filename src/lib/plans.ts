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
//   free programs     training_programs.is_free (00037)
//   free IQ sections    study_topics.is_free (00037)
//   30-day shot chart   dashboard page
//   teams coached       create_team_with_details (00047): 1 free, 10 with Pro
//   free plays          plays.is_free (00060); plays a coach sets always open
//   coach plays         FREE_COACH_PLAYS, playbook teams FREE_PLAYBOOK_TEAMS and
//                       PRO_PLAYBOOK_TEAMS in src/lib/plays/limits.ts, enforced by
//                       the 00061 triggers (a test checks the numbers match)
//   free film           film_clips.is_free and film_packs.is_free (00062), set in
//                       Owner tools; film a coach sets always opens
//   drills              DRILL_COUNT below, checked against the migrations by a test
//
// The thinking behind the split: Free keeps everything that brings players in
// and everything that is their own data. Pro is coaching - structure,
// personalisation and insight over time - which is what people pay for, plus
// unlimited AI, the one thing that costs money every time it runs.
import { FREE_MONTHLY_AI_REPORTS } from './entitlements';
import { FREE_CHAT_PER_DAY } from './ai/chat';
import { FREE_COACH_PLAYS, FREE_PLAYBOOK_TEAMS, PRO_PLAYBOOK_TEAMS } from './plays/limits';

/** Drills in the library: 150 in 00013 and 18 in 00048. __tests__/plans.test.ts counts them. */
export const DRILL_COUNT = 168;

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
    `All ${DRILL_COUNT} drills, and form check whenever you want`,
    '4 complete training programs, including Basketball Strength Foundations',
    'Basketball IQ: the question of the day and the first 3 sections',
    'The free plays in the library with a quiz on your role, and every play your coach sets',
    'The free film clips and packs, and every clip your coach sets',
    'Your shot chart for the last 30 days',
    `${FREE_MONTHLY_AI_REPORTS} AI coaching reports a month and ${FREE_CHAT_PER_DAY} questions to the coach a day`,
    'Friends, leaderboard, challenges, badges and highlight reels',
    'Coach one team: a team code, the roster, assignments and this week at a glance',
    `As a coach, draw and keep ${FREE_COACH_PLAYS} plays, with a playbook for ${FREE_PLAYBOOK_TEAMS} team`,
  ],
};

export const PRO_PLAN: Plan = {
  name: 'Pro',
  tagline: 'Your own coach, with no limits',
  features: [
    'Unlimited AI coaching on every session and video',
    'Unlimited questions to your AI coach, plus a weekly AI report',
    'Every training program, built around a goal or your position',
    'Every Basketball IQ section, with all lessons and quizzes',
    'Every play in the library, each with a quiz on your role',
    'Every film clip and pack in the library',
    'Your all-time shot chart, and how your form changes over time',
    'An AI development plan from your NBA style match',
    'Coach up to 10 teams from one coach home',
    `As a coach, as many plays as you like, with playbooks for up to ${PRO_PLAYBOOK_TEAMS} teams`,
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

/**
 * Club and team prices, for the landing page. The pricing sheet clubs are sent
 * (docs/sales/deadeye-club-plans.html, printed to public/deadeye-club-plans.pdf)
 * carries the same numbers: change both together. Paid club plans are not on
 * sale yet, so the page says they open soon.
 */
export const CLUB_PLANS: Array<{ name: string; price: string; alt: string; detail: string }> = [
  { name: 'Coach Free', price: '€0', alt: 'always', detail: 'One team: codes, assignments, coach home and club board' },
  { name: 'Team Pass', price: '€149.99', alt: 'per season, or €19.99 a month', detail: 'Every player on the team gets Pro, up to 15' },
  { name: 'Club plan', price: '€99.99', alt: 'per team per season, or €11.99 a month', detail: 'Team Pass for every team, from 4 teams, one bill' },
];
export const CLUB_PLANS_PDF = '/deadeye-club-plans.pdf';
