// src/app/api/video/feedback/route.ts
// AI feedback on on-device video analysis. The player chooses whether the AI
// sees their shooting data, their mechanics data, or both. Video never leaves the phone.
import { getCurrentUser, getCurrentProfile, awaitingParentApproval, PARENT_APPROVAL_NEEDED } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getConfiguredAI, AINotConfiguredError } from '@/lib/ai/config';
import { AICoachError, reserveCredit, refundCredit } from '@/lib/ai/service';
import { coachPrompt } from '@/lib/ai/persona';

const SYSTEM_PROMPT = coachPrompt(`Your task: review numbers measured from the player's own phone video.
Phone measurements are approximate, so say when something is an estimate and focus on clear, practical coaching rather than exact targets.
Respond with a JSON object: {"summary": "2-3 sentences", "keyInsights": ["2-4 specific observations"], "recommendations": ["3 concrete drills or cues for the next session"]}`);

type DataChoice = 'shooting' | 'mechanics' | 'both';

function num(v: unknown, min: number, max: number): number | null {
  return typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max ? v : null;
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (await awaitingParentApproval()) return Response.json({ error: PARENT_APPROVAL_NEEDED }, { status: 403 });

  let ai: ReturnType<typeof getConfiguredAI>;
  try {
    ai = getConfiguredAI(800);
  } catch (err) {
    if (err instanceof AINotConfiguredError) return Response.json({ error: err.message }, { status: err.status });
    throw err;
  }

  const body = (await request.json().catch(() => null)) as {
    data?: DataChoice;
    shooting?: { makes?: unknown; attempts?: unknown; zone?: unknown; minutes?: unknown };
    mechanics?: Record<string, unknown>;
  } | null;
  const choice = body?.data;
  if (choice !== 'shooting' && choice !== 'mechanics' && choice !== 'both') {
    return Response.json({ error: 'Choose shooting, mechanics or both.' }, { status: 400 });
  }

  const lines: string[] = [];
  const profile = await getCurrentProfile();
  lines.push(`Player level: ${profile?.playing_level || 'not set'}. Position: ${profile?.position || 'not set'}. Shooting hand: ${profile?.dominant_hand || 'right'}.`);

  if (choice !== 'mechanics') {
    const makes = num(body?.shooting?.makes, 0, 5000);
    const attempts = num(body?.shooting?.attempts, 1, 5000);
    if (makes === null || attempts === null || makes > attempts) {
      return Response.json({ error: 'Shooting data is missing or invalid.' }, { status: 400 });
    }
    const zone = typeof body?.shooting?.zone === 'string' ? body.shooting.zone.slice(0, 40) : 'all around';
    const minutes = num(body?.shooting?.minutes, 0, 600);
    lines.push(
      `Shooting (tracked from video): ${makes}/${attempts} (${Math.round((makes / attempts) * 100)}%) from ${zone}${minutes ? ` in about ${Math.round(minutes)} minutes` : ''}.`
    );
  }
  if (choice !== 'shooting') {
    const m = body?.mechanics || {};
    const knee = num(m.kneeBendDeg, 0, 180);
    const elbow = num(m.elbowAngleAtSetPointDeg, 0, 180);
    const release = num(m.releaseAngleDeg, -90, 90);
    const time = num(m.releaseTimeMs, 0, 5000);
    if (knee === null || elbow === null || release === null || time === null) {
      return Response.json({ error: 'Mechanics data is missing or invalid. Run a form check first.' }, { status: 400 });
    }
    const jump = num(m.jumpHeightCm, 0, 150);
    const landing = num(m.landingBalancePct, 0, 100);
    lines.push(
      `Mechanics (estimated from phone pose tracking of one shot): knee bend at the dip ${knee} degrees of flexion, elbow angle at the set point ${elbow} degrees, forearm release angle ${release} degrees above horizontal, dip-to-release time ${time} ms${jump !== null ? `, jump height about ${jump} cm` : ''}${landing !== null ? `, landing balance ${landing}% (100 = level)` : ''}.`
    );
  }

  let credit: 'unlimited' | 'reserved';
  try {
    credit = await reserveCredit(user.id);
  } catch (err) {
    if (err instanceof AICoachError) return Response.json({ error: err.message }, { status: err.status });
    return Response.json({ error: 'Could not check your AI credits.' }, { status: 500 });
  }

  let output: Record<string, unknown>;
  try {
    output = await ai.provider.generateJson(SYSTEM_PROMPT, lines.join('\n'), ai.config);
  } catch (err) {
    if (credit === 'reserved') await refundCredit(user.id);
    return Response.json({ error: err instanceof Error ? err.message : 'AI request failed' }, { status: 502 });
  }

  const report = {
    summary: typeof output.summary === 'string' ? output.summary : 'Video feedback',
    keyInsights: Array.isArray(output.keyInsights) ? output.keyInsights.filter((x) => typeof x === 'string') : [],
    recommendations: Array.isArray(output.recommendations) ? output.recommendations.filter((x) => typeof x === 'string') : [],
  };

  const supabase = await createClient();
  await supabase.from('ai_reports').insert({
    user_id: user.id,
    report_type: 'post_session',
    input_data: { source: 'video', data: choice, prompt: lines },
    provider: ai.provider.name,
    model: ai.config.model,
    prompt_version: 'video-1.0',
    output_content: report,
    status: 'delivered',
  });

  return Response.json({ report });
}
