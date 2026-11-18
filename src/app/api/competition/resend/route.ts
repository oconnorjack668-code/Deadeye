// src/app/api/competition/resend/route.ts
// A player under 18 asks for their parent's link again, after the first one
// ran out unanswered (CONFIRM_LINK_DAYS). Only then: a new link lasts that
// long again, so this can email a parent at most once a week. The link goes
// to the parent by email and is never shown to the player.
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailConfigured } from '@/lib/email';
import { canResendParentLink, entriesOpen } from '@/lib/competition';
import { sendParentLink } from '@/lib/competition-server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (!entriesOpen()) return Response.json({ error: 'The competition is not taking entries.' }, { status: 403 });
  if (!emailConfigured()) {
    return Response.json({ error: 'We can’t send emails just yet. We’ll email your parent as soon as we can.' }, { status: 503 });
  }

  const admin = createAdminClient();
  const { data: entry } = await admin
    .from('competition_entries')
    .select('id, status, parent_token_sent_at, parent_decided_at')
    .eq('user_id', user.id)
    .eq('kind', 'player')
    .maybeSingle();
  if (!entry || !canResendParentLink(entry)) {
    return Response.json({ error: 'There is no link to send again right now.' }, { status: 409 });
  }

  const sent = await sendParentLink(admin, entry.id, new URL(request.url).origin);
  if (sent !== 'sent') return Response.json({ error: 'We could not send the email. Please try again later.' }, { status: 502 });
  return Response.json({ ok: true });
}
