// src/app/api/parents/competition/route.ts
// A parent approves or declines their child's founding competition entry
// (00067). No login: the token in the emailed link is the access, as with the
// account and photo approvals. They can change their mind until the closing
// time; an unanswered link runs out after CONFIRM_LINK_DAYS.
import { createAdminClient } from '@/lib/supabase/admin';
import { isToken } from '@/lib/parentApproval';
import { parentDecision } from '@/lib/competition';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown; decision?: unknown } | null;
  const token = body?.token;
  if (!isToken(token)) return Response.json({ error: 'This link is not valid.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: entry } = await admin
    .from('competition_entries')
    .select('id, status, parent_token_sent_at, parent_decided_at')
    .eq('parent_token', token)
    .eq('kind', 'player')
    .maybeSingle();
  if (!entry) return Response.json({ error: 'This link is not valid, or a newer one has been sent.' }, { status: 404 });

  const result = parentDecision(entry, body?.decision);
  if (!result.ok) return Response.json({ error: result.error }, { status: 409 });

  const now = new Date().toISOString();
  const { error } = await admin
    .from('competition_entries')
    .update({ status: result.status, parent_decided_at: now, updated_at: now })
    .eq('id', entry.id);
  if (error) return Response.json({ error: 'Could not save your answer. Please try again.' }, { status: 500 });
  return Response.json({ status: result.status });
}
