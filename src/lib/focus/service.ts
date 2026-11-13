// src/lib/focus/service.ts
// SERVER-ONLY: makes an AI focus plan, spending one AI credit, and saves it as
// a development_plan report so it can be opened again from /focus?plan=<id>
// and is listed with the player's other reports on /ai-coach.
import { createClient } from '@/lib/supabase/server';
import { getConfiguredAI, AINotConfiguredError } from '@/lib/ai/config';
import { AICoachError, assertAiEnabled, refundCredit, reserveCredit } from '@/lib/ai/service';
import { needsSupportLine, SUPPORT_LINE } from '@/lib/ai/safety';
import { isStaff } from '@/lib/coachSide';
import type { Database } from '@/lib/supabase/types';
import { buildCatalogue, buildFocusPrompt, namesForRefs, parseFocusPlan, FOCUS_PROMPT_VERSION, MAX_FOCUS_TEXT, type FocusAiPlan } from './ai';
import { loadFocusContent, loadPlayerSignals } from './content';
import { buildFocusPlan, drillLevelFor, type FocusMode } from './plan';
import { cleanWeaknessIds, matchWeaknesses } from './weaknesses';

export interface FocusRequest {
  text: string;
  weaknessIds: string[];
  mode: FocusMode;
  teamId?: string | null;
}

export interface SavedFocusPlan {
  id: string;
  plan: FocusAiPlan;
  /** Childline and other help lines, when the description suggests distress */
  support?: string;
}

/** What is stored in ai_reports.output_content. summary + recommendations keep /ai-coach's report card readable. */
export interface StoredFocusReport {
  summary: string;
  recommendations: string[];
  focusPlan: FocusAiPlan;
  mode: FocusMode;
  weaknessIds: string[];
}

type Json = Database['public']['Tables']['ai_reports']['Insert']['output_content'];

/** Checks and tidies what the browser sent. Throws a 400 for anything unusable. */
export function readFocusRequest(body: unknown): FocusRequest {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const text = typeof b.text === 'string' ? b.text.slice(0, MAX_FOCUS_TEXT) : '';
  const mode: FocusMode = b.mode === 'team' ? 'team' : 'player';
  const teamId = typeof b.teamId === 'string' && /^[0-9a-f-]{36}$/i.test(b.teamId) ? b.teamId : null;
  const weaknessIds = cleanWeaknessIds(b.weaknessIds);
  if (weaknessIds.length === 0 && text.trim().length < 8) {
    throw new AICoachError('Describe the weakness in a sentence, or pick at least one from the list.', 400);
  }
  if (mode === 'team' && !teamId) throw new AICoachError('Pick the team this plan is for.', 400);
  return { text, weaknessIds, mode, teamId };
}

export async function generateFocusPlan(userId: string, req: FocusRequest): Promise<SavedFocusPlan> {
  let ai: ReturnType<typeof getConfiguredAI>;
  try {
    ai = getConfiguredAI(1500);
  } catch (err) {
    if (err instanceof AINotConfiguredError) throw new AICoachError(err.message, err.status);
    throw err;
  }

  const supabase = await createClient();
  await assertAiEnabled(supabase, userId);

  // Who the plan is for. No names go to the AI provider: a team is its age
  // group and level, a player their position and level.
  let who: string;
  let level: ReturnType<typeof drillLevelFor>;
  let evidence: Awaited<ReturnType<typeof loadPlayerSignals>> = [];
  if (req.mode === 'team') {
    const { data: membership } = await supabase
      .from('team_members')
      .select('role, teams(age_group, level)')
      .eq('team_id', req.teamId!)
      .eq('user_id', userId)
      .maybeSingle();
    if (!membership || !isStaff(membership.role)) throw new AICoachError('Only the coaches of a team can plan for it.', 403);
    const team = (membership as unknown as { teams: { age_group: string | null; level: string | null } | null }).teams;
    const { count } = await supabase
      .from('team_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('team_id', req.teamId!)
      .eq('role', 'player');
    who = `Team: ${team?.age_group || 'age group not set'}, ${team?.level || 'level not set'}, ${count ?? 0} players on Deadeye.`;
    level = drillLevelFor(team?.level);
  } else {
    const { data: profile } = await supabase.from('profiles').select('position, playing_level').eq('id', userId).maybeSingle();
    who = `Player: position ${profile?.position || 'not set'}, level ${profile?.playing_level || 'not set'}. Training on their own.`;
    level = drillLevelFor(profile?.playing_level);
    evidence = await loadPlayerSignals(supabase, userId);
  }

  // Free text the player did not turn into chips still counts for the starting suggestions
  const weaknessIds = req.weaknessIds.length ? req.weaknessIds : matchWeaknesses(req.text);
  const content = await loadFocusContent(supabase, userId);
  const starter = buildFocusPlan(weaknessIds, content, { mode: req.mode, level });
  const catalogue = buildCatalogue(content, req.mode);
  const { system, user } = buildFocusPrompt({ text: req.text, weaknessIds, mode: req.mode, who, evidence, starter, catalogue });

  const credit = await reserveCredit(userId);
  let plan: FocusAiPlan;
  try {
    const raw = await ai.provider.generateJson(system, user, ai.config);
    plan = parseFocusPlan(raw, catalogue);
    plan.week = plan.week.map((line) => namesForRefs(line, catalogue, content));
  } catch (err) {
    if (credit === 'reserved') await refundCredit(userId);
    throw new AICoachError(err instanceof Error ? err.message : 'AI request failed', 502);
  }

  const stored: StoredFocusReport = { summary: plan.summary, recommendations: plan.week, focusPlan: plan, mode: req.mode, weaknessIds };
  const { data: report, error } = await supabase
    .from('ai_reports')
    .insert({
      user_id: userId,
      report_type: 'development_plan',
      input_data: { text: req.text, weaknessIds, mode: req.mode, teamId: req.teamId ?? null, evidence: evidence.map((e) => e.reason) } as unknown as Json,
      provider: ai.provider.name,
      model: ai.config.model,
      prompt_version: FOCUS_PROMPT_VERSION,
      output_content: stored as unknown as Json,
      status: 'delivered',
      source_session_ids: [],
    })
    .select('id')
    .single();
  if (error || !report) {
    if (credit === 'reserved') await refundCredit(userId);
    throw new AICoachError('Could not save the plan.', 500);
  }

  return { id: report.id, plan, support: needsSupportLine(req.text) ? SUPPORT_LINE : undefined };
}

/** A saved plan of the player's own (RLS), or null. */
export async function loadSavedFocusPlan(planId: string): Promise<StoredFocusReport | null> {
  if (!/^[0-9a-f-]{36}$/i.test(planId)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from('ai_reports')
    .select('output_content')
    .eq('id', planId)
    .eq('report_type', 'development_plan')
    .maybeSingle();
  const stored = data?.output_content as unknown as StoredFocusReport | null;
  return stored?.focusPlan ? stored : null;
}
