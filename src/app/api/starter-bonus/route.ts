// src/app/api/starter-bonus/route.ts
// Pays the one-off XP bonus for finishing the starting steps on the dashboard
// (src/lib/starter.ts). Two steps are checked here in the database: a logged
// session and an answered IQ question. The other two, installing and the
// sample clip, only happen on the phone and are taken on the player's word -
// the most anyone gains by faking them is the same 150 XP once.
//
// Written with the service role into reward_events, which players cannot
// insert into themselves (00018). The unique (user_id, badge_id) index makes a
// second claim a no-op rather than a second payout.
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { STARTER_BONUS_ID, STARTER_BONUS_XP } from '@/lib/starter';

export const dynamic = 'force-dynamic';

export async function POST() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return Response.json({ error: 'Log in to Deadeye to claim your bonus.' }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return Response.json({ error: 'Bonuses cannot be paid right now. Please try again later.' }, { status: 503 });
  }

  const admin = createAdminClient();
  const [{ count: sessions }, { count: answers }, { data: already }] = await Promise.all([
    admin.from('training_sessions').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    admin.from('daily_iq_answers').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    admin.from('reward_events').select('id').eq('user_id', user.id).eq('badge_id', STARTER_BONUS_ID).maybeSingle(),
  ]);

  if (already) return Response.json({ ok: true, xp: STARTER_BONUS_XP, already: true });
  if (!sessions) return Response.json({ error: 'Log your first shots first.' }, { status: 400 });
  if (!answers) return Response.json({ error: "Answer today's IQ question first." }, { status: 400 });

  const { error } = await admin.from('reward_events').insert({
    user_id: user.id,
    event_type: 'milestone_reached',
    badge_id: STARTER_BONUS_ID,
    badge_title: 'Starting steps',
    badge_description: 'Finished the starting steps: home screen, sample clip, IQ question and first shots.',
    icon_name: 'Rocket',
  });
  // 23505: claimed twice at once, from two taps or two devices. Already paid.
  if (error && error.code !== '23505') {
    return Response.json({ error: 'Your bonus could not be saved. Please try again.' }, { status: 500 });
  }
  return Response.json({ ok: true, xp: STARTER_BONUS_XP }, { status: 201 });
}
