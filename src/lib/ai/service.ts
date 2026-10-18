// src/lib/ai/service.ts
// SERVER-ONLY: generates post-session coaching reports and manages AI credits.
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { awaitingParentApproval, checkIsOwner, PARENT_APPROVAL_NEEDED } from '@/lib/auth';
import { getConfiguredAI, AINotConfiguredError } from './config';
import type { CoachingEvidence, CoachingOutput } from './provider';
import type { Database } from '@/lib/supabase/types';
import { aiReportsLeft, creditMonth, FREE_MONTHLY_AI_REPORTS, hasPro, type PlanFields } from '@/lib/entitlements';

export const CREDITS_PER_REPORT = 1;
const PROMPT_VERSION = '1.1';

export class AICoachError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export interface GeneratedReport {
  id: string;
  output: CoachingOutput;
}

function aiConfig() {
  try {
    return getConfiguredAI(800);
  } catch (err) {
    if (err instanceof AINotConfiguredError) throw new AICoachError(err.message, err.status);
    throw err;
  }
}

/** Unlimited for Pro (paid, owner or founding member) and owners by role or OWNER_EMAIL. */
export async function hasUnlimitedCredits(sub: PlanFields | null | undefined): Promise<boolean> {
  return hasPro(sub) || (await checkIsOwner());
}

/**
 * Takes one credit before calling the AI provider. Credits are changed with the
 * service role because players cannot update their own subscription (00007).
 * The update only applies if the balance hasn't changed since it was read, so
 * two simultaneous requests can't both spend the last credit.
 */
function adminClientOrThrow() {
  try {
    return createAdminClient();
  } catch {
    throw new AICoachError('AI Coach is not configured (SUPABASE_SERVICE_ROLE_KEY is missing).', 503);
  }
}

export async function reserveCredit(userId: string): Promise<'unlimited' | 'reserved'> {
  // Players can read their own subscription, so owners/pro never need the service role
  const supabase = await createClient();
  const { data: sub, error } = await supabase
    .from('subscriptions')
    .select('plan_type, founding_pro_until, ai_credits_remaining, ai_credits_period')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new AICoachError('Could not load your AI credits.', 500);

  if (await hasUnlimitedCredits(sub)) return 'unlimited';

  // A balance from an earlier month is this month's allowance refilled. The
  // refill and the spend are one write, guarded on the old balance and period,
  // so two requests at the start of a month cannot both refill.
  const month = creditMonth();
  const remaining = aiReportsLeft(sub);
  if (remaining < CREDITS_PER_REPORT) {
    throw new AICoachError(
      `You have used your ${FREE_MONTHLY_AI_REPORTS} free AI reports this month. They refill on the 1st, or get unlimited with Deadeye Pro.`,
      402
    );
  }

  const admin = adminClientOrThrow();
  let spend = admin
    .from('subscriptions')
    .update({
      ai_credits_remaining: remaining - CREDITS_PER_REPORT,
      ai_credits_period: month,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('ai_credits_remaining', sub?.ai_credits_remaining ?? 0);
  spend = sub?.ai_credits_period ? spend.eq('ai_credits_period', sub.ai_credits_period) : spend.is('ai_credits_period', null);
  const { data: updated, error: updateError } = await spend.select('id');
  if (updateError) throw new AICoachError('Could not use an AI credit.', 500);
  if (!updated || updated.length === 0) {
    throw new AICoachError('Your credits changed while generating. Please try again.', 409);
  }
  return 'reserved';
}

export async function refundCredit(userId: string): Promise<void> {
  const admin = adminClientOrThrow();
  const { data: sub } = await admin
    .from('subscriptions')
    .select('ai_credits_remaining, ai_credits_period')
    .eq('user_id', userId)
    .maybeSingle();
  if (!sub) return;
  // Only into this month's allowance: a refund landing after the 1st would
  // otherwise add to a balance the refill is about to replace anyway
  if (sub.ai_credits_period !== creditMonth()) return;
  await admin
    .from('subscriptions')
    .update({
      ai_credits_remaining: Math.min(FREE_MONTHLY_AI_REPORTS, sub.ai_credits_remaining + CREDITS_PER_REPORT),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('ai_credits_remaining', sub.ai_credits_remaining);
}

/** Collects the session, its drills and shots (all RLS-scoped to the player). */
async function buildEvidence(userId: string, sessionId: string): Promise<CoachingEvidence> {
  const supabase = await createClient();

  const { data: session } = await supabase
    .from('training_sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!session) throw new AICoachError('Session not found.', 404);

  const { data: drills } = await supabase
    .from('session_drills')
    .select('id, drill_name')
    .eq('session_id', sessionId)
    .order('display_order', { ascending: true });

  const drillIds: string[] = (drills || []).map((d) => d.id);
  const { data: shots } = drillIds.length
    ? await supabase.from('shooting_entries').select('shot_zone, makes, attempts').in('drill_id', drillIds)
    : { data: [] as Array<{ shot_zone: string; makes: number; attempts: number }> };

  const zones = new Map<string, { makes: number; attempts: number }>();
  for (const s of shots || []) {
    const z = zones.get(s.shot_zone) || { makes: 0, attempts: 0 };
    z.makes += s.makes;
    z.attempts += s.attempts;
    zones.set(s.shot_zone, z);
  }
  const totalMakes = [...zones.values()].reduce((sum, z) => sum + z.makes, 0);
  const totalAttempts = [...zones.values()].reduce((sum, z) => sum + z.attempts, 0);

  const { data: previous } = await supabase
    .from('ai_reports')
    .select('output_content')
    .eq('user_id', userId)
    .eq('report_type', 'post_session')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    sessionType: session.session_type,
    sessionDate: session.session_date,
    duration: session.duration_minutes,
    intensity: session.intensity_rpe,
    perceivedQuality: session.perceived_quality,
    totalMakes,
    totalAttempts,
    shootingPercentage: totalAttempts > 0 ? (totalMakes / totalAttempts) * 100 : undefined,
    zoneBreakdown: [...zones.entries()].map(([zone, z]) => ({ zone, ...z })),
    drillsCompleted: (drills || []).map((d) => d.drill_name),
    playerNotes: session.notes || undefined,
    previousFeedbackSummary: (previous?.output_content as unknown as CoachingOutput | null)?.summary,
  };
}

/**
 * Refuses when the player has switched AI coaching off.
 *
 * Enforced here rather than only in the pages, because hiding a button is not
 * the same as declining to act: an old tab, a bookmark or a direct POST would
 * otherwise generate a report and spend a credit for someone who opted out.
 */
async function assertAiEnabled(supabase: Awaited<ReturnType<typeof createClient>>, userId: string): Promise<void> {
  const { data } = await supabase.from('profiles').select('ai_coaching_enabled').eq('id', userId).maybeSingle();
  if (data?.ai_coaching_enabled === false) {
    throw new AICoachError('AI coaching is switched off in your settings.', 403);
  }
  if (await awaitingParentApproval()) throw new AICoachError(PARENT_APPROVAL_NEEDED, 403);
}

export async function generateSessionReport(userId: string, sessionId: string): Promise<GeneratedReport> {
  const { provider, config } = aiConfig();
  const supabase = await createClient();
  await assertAiEnabled(supabase, userId);

  /** Has this session already been written up? */
  const alreadyReported = async () => {
    const { data } = await supabase
      .from('ai_reports')
      .select('id')
      .eq('user_id', userId)
      .contains('source_session_ids', [sessionId])
      .limit(1);
    return !!data && data.length > 0;
  };

  if (await alreadyReported()) {
    throw new AICoachError('This session already has AI feedback.', 409);
  }

  const evidence = await buildEvidence(userId, sessionId);
  const credit = await reserveCredit(userId);

  let output: CoachingOutput;
  try {
    output = await provider.generateCoachingSummary(evidence, config);
  } catch (err) {
    if (credit === 'reserved') await refundCredit(userId);
    const message = err instanceof Error ? err.message : 'AI request failed';
    throw new AICoachError(message, 502);
  }

  // Check again, now that the slow part is done. The first check happens before
  // a multi-second AI call, so two taps a second apart both used to pass it and
  // the player got two reports and paid two credits. Re-checking here narrows
  // that window from the length of the AI call to the few milliseconds before
  // the insert lands. It does not close it: the real fix is a unique index on
  // (user_id, source_session_ids) for post_session reports, which needs a
  // migration the user has to run by hand.
  if (await alreadyReported()) {
    if (credit === 'reserved') await refundCredit(userId);
    throw new AICoachError('This session already has AI feedback.', 409);
  }

  const { data: report, error } = await supabase
    .from('ai_reports')
    .insert({
      user_id: userId,
      report_type: 'post_session',
      // CoachingEvidence/CoachingOutput are plain interfaces (no index signature),
      // so they don't structurally satisfy Json even though every field in them
      // really is JSON-serialisable; this is the standard escape hatch for that.
      input_data: evidence as unknown as Database['public']['Tables']['ai_reports']['Insert']['input_data'],
      provider: provider.name,
      model: config.model,
      prompt_version: PROMPT_VERSION,
      output_content: output as unknown as Database['public']['Tables']['ai_reports']['Insert']['output_content'],
      status: 'delivered',
      source_session_ids: [sessionId],
    })
    .select('id')
    .single();

  if (error || !report) {
    if (credit === 'reserved') await refundCredit(userId);
    // 23505 = unique violation: migration 00025 adds a one-report-per-session
    // index, so the loser of the race lands here. That is the race being caught
    // properly rather than a failure, so it reads as "already has feedback".
    if (error?.code === '23505') {
      throw new AICoachError('This session already has AI feedback.', 409);
    }
    throw new AICoachError('Could not save the AI feedback.', 500);
  }

  return { id: report.id, output };
}
