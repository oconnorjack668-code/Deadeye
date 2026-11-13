// src/lib/heardFrom-server.ts
// SERVER-ONLY: clears the optional sign-up answer (src/lib/heardFrom.ts) from
// accounts older than HEARD_FROM_KEEP_DAYS. Run by the daily housekeeping in
// api/cron/reminders, so it happens on schedule, not on the player's next visit.
import type { createAdminClient } from '@/lib/supabase/admin';
import { heardFromToClear } from '@/lib/heardFrom';

type Admin = ReturnType<typeof createAdminClient>;

const PER_PAGE = 1000;
/** A few hundred per run keeps the job well inside its time limit; the rest go tomorrow */
const MAX_PER_RUN = 200;

/**
 * Failures are counted and logged, and the cron run returns them, so the
 * privacy policy's "cleared 12 months after you join" can't quietly stop
 * being true (safety follow-up on PR #97).
 */
export async function clearExpiredHeardFrom(admin: Admin, now = new Date()): Promise<{ cleared: number; failed: number }> {
  const due: string[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: PER_PAGE });
    if (error) throw error;
    due.push(...heardFromToClear(data.users, now));
    if (data.users.length < PER_PAGE || due.length >= MAX_PER_RUN) break;
  }
  let cleared = 0;
  let failed = 0;
  for (const id of due.slice(0, MAX_PER_RUN)) {
    // Metadata updates merge key by key and a null removes the key, so the
    // player's other keys (display_name, age_16_plus) are left as they are
    const { error } = await admin.auth.admin.updateUserById(id, { user_metadata: { heard_from: null } });
    if (error) failed++;
    else cleared++;
  }
  if (failed > 0) console.error(`Sign-up answer clean-up: ${failed} of ${cleared + failed} accounts could not be cleared`);
  return { cleared, failed };
}
