// src/app/api/cron/reminders/route.ts
// Scheduled job: sends training reminders to players whose reminder is due in
// their timezone and who haven't trained yet today. Protected by CRON_SECRET
// (Vercel Cron sends it as "Authorization: Bearer <CRON_SECRET>").
import { createAdminClient } from '@/lib/supabase/admin';
import { pushConfigured, sendPush } from '@/lib/push';
import { reminderDue, type ReminderPrefs } from '@/lib/reminders';
import { deleteAccount } from '@/lib/accountDeletion';
import { olderThanDays, UNAPPROVED_ACCOUNT_DAYS } from '@/lib/parentApproval';
import { FOUNDING_REMINDER_DAYS } from '@/lib/founding';

async function removeUnapprovedAccounts(admin: ReturnType<typeof createAdminClient>): Promise<number> {
  const { data: waiting, error } = await admin
    .from('age_checks')
    .select('user_id, consent_status, answered_at, withdrawn_at')
    .in('consent_status', ['pending', 'withdrawn'])
    .order('answered_at', { ascending: true })
    .limit(500);
  if (error) throw error;

  const now = new Date();
  const due = (waiting || []).filter((c) =>
    olderThanDays(c.consent_status === 'withdrawn' ? c.withdrawn_at : c.answered_at, UNAPPROVED_ACCOUNT_DAYS, now)
  );
  let removed = 0;
  // A few per run keeps the job well inside its time limit; the rest go tomorrow
  for (const c of due.slice(0, 25)) {
    const result = await deleteAccount(admin, c.user_id);
    if (result.ok) removed++;
  }
  return removed;
}

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const admin = createAdminClient();

  // Housekeeping: crash reports and player reports are kept for 90 days
  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000).toISOString();
  for (const table of ['app_errors', 'player_reports'] as const) {
    await admin
      .from(table)
      .delete()
      .lt('created_at', ninetyDaysAgo)
      .then(
        () => undefined,
        () => undefined
      );
  }

  // Housekeeping: under-16 accounts no parent approved, or whose parent withdrew
  // approval, are deleted after UNAPPROVED_ACCOUNT_DAYS (00036)
  const removed = await removeUnapprovedAccounts(admin).catch((err) => {
    console.error('Unapproved account clean-up failed', err);
    return 0;
  });

  if (!pushConfigured()) return Response.json({ error: 'VAPID keys missing', removed }, { status: 503 });

  const { data: prefs, error } = await admin
    .from('notification_preferences')
    .select('user_id, reminder_enabled, push_enabled, reminder_days, reminder_time, timezone, last_reminded_on')
    .eq('reminder_enabled', true)
    .eq('push_enabled', true);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // A locked under-16 (00036) cannot open the app, so a nudge to train in it is noise
  const { data: locked } = await admin
    .from('age_checks')
    .select('user_id')
    .in('user_id', (prefs || []).map((p) => p.user_id))
    .in('consent_status', ['pending', 'withdrawn']);
  const lockedIds = new Set((locked || []).map((r) => r.user_id));

  const now = new Date();
  let sent = 0;
  let skipped = 0;
  for (const p of (prefs || []) as Array<ReminderPrefs & { user_id: string }>) {
    if (lockedIds.has(p.user_id)) continue;
    const { due, localDate } = reminderDue(p, now);
    if (!due) continue;

    // Already trained today? Then no nudge needed.
    const [{ count: sessions }, { count: workouts }, { data: subs }, { data: enrollment }] = await Promise.all([
      admin.from('training_sessions').select('id', { count: 'exact', head: true }).eq('user_id', p.user_id).eq('session_date', localDate),
      admin.from('workouts').select('id', { count: 'exact', head: true }).eq('user_id', p.user_id).eq('workout_date', localDate),
      admin.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', p.user_id),
      admin.from('program_enrollments').select('training_programs(name)').eq('user_id', p.user_id).eq('status', 'active').maybeSingle(),
    ]);
    await admin.from('notification_preferences').update({ last_reminded_on: localDate }).eq('user_id', p.user_id);
    if ((sessions || 0) + (workouts || 0) > 0 || !subs?.length) {
      skipped++;
      continue;
    }

    const programName = (enrollment as unknown as { training_programs: { name: string } | null } | null)?.training_programs?.name;
    const payload = programName
      ? { title: 'Time to train 🏀', body: `Your next ${programName} session is ready.`, url: '/dashboard' }
      : { title: 'Time to train 🏀', body: 'Get some reps in and build your streak.', url: '/basketball/new' };
    for (const s of subs) {
      const result = await sendPush(s, payload);
      if (result === 'sent') sent++;
      if (result === 'gone') await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
    }
  }

  const foundingReminders = await remindFoundingEndings(admin, lockedIds).catch((err) => {
    console.error('Founding reminder failed', err);
    return 0;
  });

  return Response.json({ checked: prefs?.length || 0, sent, skipped, removed, foundingReminders });
}

/**
 * Tells founding members once, a week before, that their free months end -
 * so nobody is surprised to find Pro gone. Worded as information rather than a
 * push to buy: many of these players are under 18 (see src/components/ProGate.tsx).
 * The dashboard shows the same heads-up for anyone without notifications on.
 */
async function remindFoundingEndings(admin: ReturnType<typeof createAdminClient>, lockedIds: Set<string>): Promise<number> {
  const now = new Date();
  const soon = new Date(now.getTime() + FOUNDING_REMINDER_DAYS * 86_400_000);
  const { data: ending, error } = await admin
    .from('subscriptions')
    .select('user_id, founding_pro_until')
    .not('founding_claimed_at', 'is', null)
    .is('founding_reminded_at', null)
    .neq('plan_type', 'pro')
    .gt('founding_pro_until', now.toISOString())
    .lte('founding_pro_until', soon.toISOString())
    .limit(200);
  if (error) throw error;

  let reminded = 0;
  for (const row of ending || []) {
    if (lockedIds.has(row.user_id) || !row.founding_pro_until) continue;
    const day = new Date(row.founding_pro_until).toLocaleDateString('en-IE', {
      day: 'numeric',
      month: 'long',
      timeZone: process.env.APP_TIME_ZONE || 'Europe/Dublin',
    });
    const { data: subs } = await admin.from('push_subscriptions').select('endpoint, p256dh, auth').eq('user_id', row.user_id);
    for (const s of subs || []) {
      const result = await sendPush(s, {
        title: 'Your founding member Pro ends soon',
        body: `It ends on ${day}. You go back to Free automatically and nothing is charged. The founder price is on the Pro page if you want to keep it.`,
        url: '/pro',
      });
      if (result === 'gone') await admin.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
    }
    // Marked whether or not a phone was reachable: once is the promise
    await admin.from('subscriptions').update({ founding_reminded_at: now.toISOString() }).eq('user_id', row.user_id);
    reminded++;
  }
  return reminded;
}
