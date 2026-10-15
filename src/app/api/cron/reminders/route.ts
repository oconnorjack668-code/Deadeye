// src/app/api/cron/reminders/route.ts
// Scheduled job: sends training reminders to players whose reminder is due in
// their timezone and who haven't trained yet today. Protected by CRON_SECRET
// (Vercel Cron sends it as "Authorization: Bearer <CRON_SECRET>").
import { createAdminClient } from '@/lib/supabase/admin';
import { pushConfigured, sendPush } from '@/lib/push';
import { reminderDue, type ReminderPrefs } from '@/lib/reminders';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const admin = createAdminClient();

  // Housekeeping: crash reports are kept for 90 days
  await admin
    .from('app_errors')
    .delete()
    .lt('created_at', new Date(Date.now() - 90 * 86_400_000).toISOString())
    .then(
      () => undefined,
      () => undefined
    );

  if (!pushConfigured()) return Response.json({ error: 'VAPID keys missing' }, { status: 503 });

  const { data: prefs, error } = await admin
    .from('notification_preferences')
    .select('user_id, reminder_enabled, push_enabled, reminder_days, reminder_time, timezone, last_reminded_on')
    .eq('reminder_enabled', true)
    .eq('push_enabled', true);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const now = new Date();
  let sent = 0;
  let skipped = 0;
  for (const p of (prefs || []) as Array<ReminderPrefs & { user_id: string }>) {
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
  return Response.json({ checked: prefs?.length || 0, sent, skipped });
}
