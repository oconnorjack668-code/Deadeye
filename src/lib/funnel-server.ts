// src/lib/funnel-server.ts
// SERVER-ONLY: loads the player funnel (src/lib/funnel.ts) for the players who
// joined in a window, leaving out the owner and test accounts. Read by
// /admin/funnel and by the weekly counts job (api/cron/agent-counts), so the
// page and the agents see the same numbers.
import { createAdminClient } from '@/lib/supabase/admin';
import { testAccountEmails } from '@/lib/testAccounts';
import { buildFunnel, type Funnel, type FunnelSession } from '@/lib/funnel';

type Admin = ReturnType<typeof createAdminClient>;

/** Ids in batches: a few hundred uuids in one `in` filter make a URL too long to send. */
async function inBatches<T>(ids: string[], load: (batch: string[]) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const rows: T[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const { data, error } = await load(ids.slice(i, i + 200));
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
  }
  return rows;
}

/**
 * The owner and test accounts, which would otherwise count as players: the
 * owner by OWNER_EMAIL or the owner role, test accounts by TEST_ACCOUNT_EMAILS
 * (comma separated).
 */
async function excludedIds(admin: Admin, users: Array<{ id: string; email?: string }>): Promise<Set<string>> {
  const emails = new Set(
    [process.env.OWNER_EMAIL, ...testAccountEmails()]
      .map((e) => e?.toLowerCase().trim())
      .filter((e): e is string => !!e)
  );
  const ids = new Set(users.filter((u) => u.email && emails.has(u.email.toLowerCase())).map((u) => u.id));
  const { data: owners } = await admin.from('user_roles').select('user_id').eq('role', 'owner');
  for (const o of owners ?? []) ids.add(o.user_id);
  return ids;
}

export async function loadFunnel(days: number): Promise<{ funnel: Funnel; excluded: number; eventsSince: string | null } | { problem: string }> {
  try {
    const admin = createAdminClient();
    const { data: list, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (listError) return { problem: listError.message };
    const users = list.users;
    const excluded = await excludedIds(admin, users);
    const since = days > 0 ? Date.now() - days * 86_400_000 : 0;
    const cohort = users.filter((u) => !excluded.has(u.id) && Date.parse(u.created_at) >= since).map((u) => u.id);

    const [profiles, events, sessions, first] = await Promise.all([
      inBatches<{ id: string; onboarding_completed: boolean }>(cohort, (b) => admin.from('profiles').select('id, onboarding_completed').in('id', b)),
      inBatches<{ user_id: string; name: string }>(cohort, (b) => admin.from('app_events').select('user_id, name').in('user_id', b)),
      inBatches<FunnelSession>(cohort, (b) => admin.from('training_sessions').select('user_id, verified_by_video').in('user_id', b)),
      admin.from('app_events').select('day').order('day', { ascending: true }).limit(1).maybeSingle(),
    ]);
    const setup = new Set(profiles.filter((p) => p.onboarding_completed).map((p) => p.id));
    const funnel = buildFunnel(
      cohort.map((id) => ({ id, setupDone: setup.has(id) })),
      events,
      sessions
    );
    return { funnel, excluded: excluded.size, eventsSince: first.data?.day ?? null };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'could not load';
    return {
      problem: /app_events/.test(message) ? 'Run 00045_app_events.sql in the Supabase SQL editor to turn this on.' : message,
    };
  }
}
