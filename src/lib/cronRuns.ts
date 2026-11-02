// src/lib/cronRuns.ts
// Saves one row per scheduled job run to cron_runs (00056), so the owner can
// look back at /admin/cron-runs. Vercel keeps its own logs for about an hour on
// the Hobby plan, which is not long enough to check a Sunday run on Monday.
import { createAdminClient } from '@/lib/supabase/admin';
import type { Json } from '@/lib/supabase/types';

export const CRON_JOBS = {
  reminders: { label: 'Training reminders', when: 'Every day, 16:00 UTC' },
  'weekly-report': { label: 'Weekly AI report', when: 'Sunday 17:00 UTC, retried Monday' },
  'agent-counts': { label: 'Agent OS counts', when: 'Monday 08:30 Irish time' },
} as const;

export type CronJob = keyof typeof CRON_JOBS;
export type CronOutcome = 'ok' | 'skipped' | 'failed';

/** Longest summary kept, in characters of JSON. The jobs answer with a few numbers. */
const MAX_SUMMARY = 2000;
/** How long runs are kept; the reminders job deletes older ones. */
export const CRON_RUN_KEEP_DAYS = 365;

/** What a job's answer means: anything but 2xx failed, and a 2xx with "skipped" did nothing on purpose. */
export function outcomeOf(status: number, body: unknown): CronOutcome {
  if (status < 200 || status >= 300) return 'failed';
  if (body && typeof body === 'object' && 'skipped' in body) return 'skipped';
  return 'ok';
}

/** The job's JSON answer, kept only if it is a small object. */
export function summaryOf(body: unknown): Json {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return {};
  const text = JSON.stringify(body);
  if (text.length > MAX_SUMMARY) return { note: `Answer too long to keep (${text.length} characters)` };
  return body as Json;
}

/**
 * Wraps a cron route so each run that passed the CRON_SECRET check is saved.
 * A 401 is not saved: anyone can call the address, and would fill the table.
 * Saving can never break the job; if it fails, the job answers as before.
 */
export function withCronLog(job: CronJob, handler: (request: Request) => Promise<Response>) {
  return async function GET(request: Request): Promise<Response> {
    const started = new Date();
    let response: Response;
    try {
      response = await handler(request);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`Cron ${job} threw:`, message);
      response = Response.json({ error: message.slice(0, 500) }, { status: 500 });
    }
    if (response.status === 401) return response;

    let body: unknown = null;
    try {
      body = await response.clone().json();
    } catch {
      // Not JSON; the status is still worth keeping
    }
    await saveRun(job, started, response.status, body);
    return response;
  };
}

async function saveRun(job: CronJob, started: Date, status: number, body: unknown) {
  try {
    const { error } = await createAdminClient()
      .from('cron_runs')
      .insert({
        job,
        started_at: started.toISOString(),
        duration_ms: Math.max(0, Date.now() - started.getTime()),
        status,
        outcome: outcomeOf(status, body),
        summary: summaryOf(body),
      });
    if (error) console.error(`Could not save the ${job} run:`, error.message);
  } catch (err) {
    console.error(`Could not save the ${job} run:`, err instanceof Error ? err.message : err);
  }
}
