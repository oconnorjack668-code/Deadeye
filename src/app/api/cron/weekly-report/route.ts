// src/app/api/cron/weekly-report/route.ts
// Weekly AI report: every Sunday (retried Monday), players who trained in the last 7 days and
// have "Weekly AI report" on get a week-in-review in AI Coach plus a push notification.
// Free for everyone (no credits). At most one report per player per week.
// Protected by CRON_SECRET ("Authorization: Bearer <CRON_SECRET>", sent by Vercel Cron).
import { createAdminClient } from '@/lib/supabase/admin';
import { hasPro } from '@/lib/entitlements';
import { getConfiguredAI, AINotConfiguredError } from '@/lib/ai/config';
import { buildPlayerContext } from '@/lib/ai/context';
import { coachPrompt } from '@/lib/ai/persona';
import { pushConfigured, sendPush } from '@/lib/push';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const MAX_PER_RUN = 150;
const CONCURRENCY = 5;
const TIME_BUDGET_MS = 50_000;

const SYSTEM = coachPrompt(`Your task: write the player's weekly training review.
Return JSON: {"headline": string (max 12 words, upbeat), "summary": string (2-3 sentences using their real numbers),
"wins": string[] (2-3 specific things they did well), "focus_next_week": string[] (2-3 concrete actions with drills/reps),
"challenge": string (one fun, measurable challenge for next week)}.
Be encouraging and specific. If effort was very high all week, suggest a recovery day.`);

const day = (d: Date) => d.toISOString().slice(0, 10);

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  let ai: ReturnType<typeof getConfiguredAI>;
  try {
    ai = getConfiguredAI(600);
  } catch (err) {
    if (err instanceof AINotConfiguredError) return Response.json({ error: err.message }, { status: err.status });
    throw err;
  }

  const started = Date.now();
  const admin = createAdminClient();
  const today = day(new Date());
  const since7 = day(new Date(Date.now() - 6 * 86_400_000));
  const lastWeek = day(new Date(Date.now() - 5 * 86_400_000));

  // Who trained this week?
  const [{ data: sessions }, { data: workouts }] = await Promise.all([
    admin.from('training_sessions').select('user_id').gte('session_date', since7).limit(10000),
    admin.from('workouts').select('user_id').gte('workout_date', since7).limit(10000),
  ]);
  const active = [...new Set([...(sessions || []), ...(workouts || [])].map((r: { user_id: string }) => r.user_id))];
  if (active.length === 0) return Response.json({ active: 0, created: 0 });

  const { data: prefs, error } = await admin
    .from('notification_preferences')
    .select('user_id, weekly_report, last_weekly_report_on, push_enabled')
    .in('user_id', active.slice(0, 1000))
    .eq('weekly_report', true);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Players who switched AI coaching off get no weekly report, whatever their
  // notification preferences say. Those two settings answer different
  // questions - "do you want to be told" versus "do you want this written at
  // all" - and a cron that only reads the first would keep generating reports,
  // and push notifications about them, for someone who opted out of the coach.
  const { data: optedOut } = await admin
    .from('profiles')
    .select('id')
    .in('id', (prefs || []).map((p) => p.user_id))
    .eq('ai_coaching_enabled', false);
  // Nor do under-16s a parent has not approved (00036): their data goes nowhere
  const { data: waitingForParent } = await admin
    .from('age_checks')
    .select('user_id')
    .in('user_id', (prefs || []).map((p) => p.user_id))
    .in('consent_status', ['pending', 'withdrawn']);
  const skip = new Set([...(optedOut || []).map((r) => r.id), ...(waitingForParent || []).map((r) => r.user_id)]);

  // The weekly report is part of Pro (src/lib/plans.ts): paying, founding
  // members inside their free months, and owners. Asked with the same rule as
  // every page, so a founding member gets it and a lapsed one stops getting it.
  const ids = (prefs || []).map((p) => p.user_id);
  const [{ data: subs }, { data: owners }] = await Promise.all([
    admin.from('subscriptions').select('user_id, plan_type, founding_pro_until').in('user_id', ids),
    admin.from('user_roles').select('user_id').in('user_id', ids).eq('role', 'owner'),
  ]);
  const withPro = new Set([
    ...(subs || []).filter((s) => hasPro(s)).map((s) => s.user_id),
    ...(owners || []).map((r) => r.user_id),
  ]);

  const due = ((prefs || []) as Array<{ user_id: string; last_weekly_report_on: string | null; push_enabled: boolean }>)
    .filter((p) => withPro.has(p.user_id))
    .filter((p) => !skip.has(p.user_id))
    .filter((p) => !p.last_weekly_report_on || p.last_weekly_report_on < lastWeek)
    .slice(0, MAX_PER_RUN);

  let created = 0;
  let failed = 0;
  let pushed = 0;

  async function runOne(p: (typeof due)[number]) {
    try {
      const context = await buildPlayerContext(admin, p.user_id, { days: 7 });
      const out = (await ai.provider.generateJson(
        SYSTEM,
        `Today is ${today}. This is the player's last 7 days:\n\n${context.text}`,
        ai.config
      )) as { headline?: string; summary?: string; wins?: string[]; focus_next_week?: string[]; challenge?: string };

      const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 4) : []);
      const { error: insertError } = await admin.from('ai_reports').insert({
        user_id: p.user_id,
        report_type: 'weekly_summary',
        input_data: { week: context.week, days: 7 },
        provider: ai.provider.name,
        model: ai.config.model,
        prompt_version: 'weekly-1',
        output_content: {
          title: out.headline || 'Your week in review',
          summary: [out.headline, out.summary].filter(Boolean).join(' — '),
          keyInsights: strings(out.wins),
          recommendations: [...strings(out.focus_next_week), ...(out.challenge ? [`Challenge: ${out.challenge}`] : [])],
          week: context.week,
        },
        status: 'delivered',
        source_session_ids: [],
      });
      if (insertError) throw new Error(insertError.message);
      await admin.from('notification_preferences').update({ last_weekly_report_on: today }).eq('user_id', p.user_id);
      created += 1;

      if (p.push_enabled && pushConfigured()) {
        const { data: subs } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', p.user_id);
        for (const s of subs || []) {
          const result = await sendPush(s, {
            title: 'Your week in review 🏀',
            body: out.headline || `${context.week.trainingDays} training days this week. See what to focus on next.`,
            url: '/ai-coach',
          });
          if (result === 'sent') pushed += 1;
          if (result === 'gone') await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
        }
      }
    } catch (err) {
      failed += 1;
      console.error('Weekly report failed for a player:', err instanceof Error ? err.message : err);
    }
  }

  // Small batches keep the AI provider's rate limits and the function time limit happy
  for (let i = 0; i < due.length; i += CONCURRENCY) {
    if (Date.now() - started > TIME_BUDGET_MS) break;
    await Promise.all(due.slice(i, i + CONCURRENCY).map(runOne));
  }

  return Response.json({ active: active.length, due: due.length, created, failed, pushed });
}
