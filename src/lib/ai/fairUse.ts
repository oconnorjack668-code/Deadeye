// src/lib/ai/fairUse.ts
// Pro's AI is "no monthly allowance", not "no limit at all": every report and
// answer is paid for, so one player (or a script on their account) must not be
// able to run up a bill bigger than their subscription. These daily ceilings
// sit far above normal training use and only stop runaway use
// (founder's decision, 2026-11-20). The owner account has no ceiling.

/** Questions to the AI coach a Pro player can ask per calendar day. */
export const PRO_CHAT_PER_DAY = 50;

/** AI reports (session, video, focus plan) a Pro player can make in 24 hours. */
export const PRO_REPORTS_PER_DAY = 20;

/** How far back the report ceiling counts. */
export const REPORT_WINDOW_MS = 24 * 3_600_000;

export const PRO_CHAT_LIMIT_MESSAGE = `You've asked ${PRO_CHAT_PER_DAY} questions today, the daily fair-use limit. The coach is back tomorrow.`;

export const PRO_REPORT_LIMIT_MESSAGE = `You've made ${PRO_REPORTS_PER_DAY} AI reports in the last 24 hours, the fair-use limit. Try again later.`;

export function overDailyLimit(used: number | null | undefined, limit: number): boolean {
  return (used ?? 0) >= limit;
}
