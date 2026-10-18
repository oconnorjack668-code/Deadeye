// src/lib/plans.ts
// What Free and Pro include, in one place, for every page that describes them
// (the Pro page and the landing page). Two copies of a price list drift, and
// the one that drifts is the one a player reads before paying.
//
// Every line here has to be true of the code as it stands: these are claims
// made to people deciding whether to pay. When what is gated changes, change
// it here in the same commit. The limits named below are FREE_CHAT_PER_DAY
// (src/lib/ai/chat.ts) and the 3 credits a new account starts with
// (handle_new_user in the migrations).

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
    'Automatic shot tracking from your camera or a video',
    'Form check, game film and the jump test',
    'Workouts, drills and training programmes',
    'Basketball IQ study and the daily question',
    'Leaderboard, friends, challenges and badges',
    '3 AI coaching reports and 5 coach questions a day',
  ],
};

export const PRO_PLAN: Plan = {
  name: 'Pro',
  tagline: 'Your own AI coach, with no limits',
  features: [
    'Unlimited AI coaching on every session and video',
    'Unlimited questions to your AI coach',
    'An AI development plan from your NBA style match',
    'Create teams and coach them from one dashboard',
    'Everything in Free',
  ],
};
