// src/app/api/errors/route.ts
// Receives crash reports from the app and stores them in app_errors (owner views them at /admin/errors).
// Open to logged-out visitors too (crashes can happen on the landing and login pages),
// so input is trimmed, duplicates are skipped and each server instance rate-limits by IP.
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { isIgnoredError } from '@/lib/reportError';

export const dynamic = 'force-dynamic';

const SOURCES = new Set(['client', 'boundary']);
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 20;
const hits = new Map<string, { count: number; start: number }>();

function limited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now - entry.start > WINDOW_MS) {
    if (hits.size > 5000) hits.clear();
    hits.set(ip, { count: 1, start: now });
    return false;
  }
  entry.count += 1;
  return entry.count > MAX_PER_WINDOW;
}

const clip = (value: unknown, max: number) => (typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null);

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return new Response(null, { status: 204 });
  const ip = (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  if (limited(ip)) return new Response(null, { status: 429 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const message = clip(body?.message, 1000);
  const source = typeof body?.source === 'string' && SOURCES.has(body.source) ? body.source : null;
  if (!message || !source) return Response.json({ error: 'Invalid report' }, { status: 400 });
  // Checked here as well as in the browser: copies of the app cached on phones
  // keep running the old reporter, whose filter could not match "Script error."
  if (isIgnoredError(message)) return new Response(null, { status: 204 });

  const user = await getCurrentUser().catch(() => null);
  const admin = createAdminClient();

  // Same error from the same player in the last 10 minutes: already recorded
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  let dupe = admin.from('app_errors').select('id', { count: 'exact', head: true }).eq('message', message).gte('created_at', since);
  dupe = user ? dupe.eq('user_id', user.id) : dupe.is('user_id', null);
  const { count } = await dupe;
  if ((count || 0) > 0) return new Response(null, { status: 204 });

  await admin.from('app_errors').insert({
    user_id: user?.id ?? null,
    source,
    message,
    stack: clip(body?.stack, 4000),
    digest: clip(body?.digest, 100),
    url: clip(body?.url, 500),
    user_agent: clip(request.headers.get('user-agent'), 300),
  });
  return new Response(null, { status: 204 });
}
