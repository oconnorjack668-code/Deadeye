// src/lib/entitlements.ts
// Who has Pro, and how much AI a free player has left this month.
//
// Pro used to mean plan_type 'pro' or 'owner', checked inline in nine places.
// The founding member offer adds a third way in - Pro without paying until a
// date - and nine copies of a rule are nine chances to forget it. Every check
// goes through hasPro() now, and user_has_pro() in 00037 is the same rule for
// the database.

export interface PlanFields {
  plan_type: string | null;
  founding_pro_until?: string | null;
}

export function hasPro(sub: PlanFields | null | undefined, now: Date = new Date()): boolean {
  if (!sub) return false;
  if (sub.plan_type === 'pro' || sub.plan_type === 'owner') return true;
  return !!sub.founding_pro_until && new Date(sub.founding_pro_until).getTime() > now.getTime();
}

/** AI coaching reports a free player gets each calendar month. */
export const FREE_MONTHLY_AI_REPORTS = 3;

/**
 * The month an allowance belongs to, as the first day of it (yyyy-mm-01, UTC).
 * UTC rather than the player's own time zone so the refill date is the same
 * for everyone and cannot be moved by changing a setting.
 */
export function creditMonth(now: Date = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`;
}

/**
 * Reports a free player has left this month.
 *
 * A stored balance from an earlier month (or from before allowances were
 * monthly, when the period is null) is spent history, not this month's
 * allowance, so it reads as a fresh one. The refill itself is written when the
 * next credit is used (reserveCredit), so nothing has to run on the 1st.
 */
export function aiReportsLeft(
  sub: { ai_credits_remaining: number; ai_credits_period?: string | null } | null | undefined,
  now: Date = new Date()
): number {
  if (!sub) return FREE_MONTHLY_AI_REPORTS;
  if (sub.ai_credits_period !== creditMonth(now)) return FREE_MONTHLY_AI_REPORTS;
  return Math.max(0, sub.ai_credits_remaining);
}

/** The plan as a player should read it, e.g. "Pro (founding member until 18 January)". */
export function planLabel(
  sub: (PlanFields & { founding_claimed_at?: string | null }) | null | undefined,
  now: Date = new Date(),
  timeZone: string = process.env.APP_TIME_ZONE || 'Europe/Dublin'
): string {
  if (!sub) return 'Free';
  if (sub.plan_type === 'owner') return 'Owner (everything unlimited)';
  if (sub.plan_type === 'pro') return 'Pro';
  if (hasPro(sub, now) && sub.founding_pro_until) {
    const until = new Date(sub.founding_pro_until).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', timeZone });
    return `Pro (founding member until ${until})`;
  }
  return 'Free';
}
