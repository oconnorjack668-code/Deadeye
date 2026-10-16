// src/app/api/parents/confirm/route.ts
// The parent taps "Approve" on the page their emailed link opens. It is a POST
// from a button rather than the link itself, because mail scanners open links
// to check them, and a GET that approved would be approved by the scanner.
import { createAdminClient } from '@/lib/supabase/admin';
import { CONFIRM_LINK_DAYS, isToken, olderThanDays } from '@/lib/parentApproval';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = body?.token;
  if (!isToken(token)) return Response.json({ error: 'This link is not valid.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: check } = await admin
    .from('age_checks')
    .select('user_id, consent_status, confirm_sent_at')
    .eq('confirm_token', token)
    .maybeSingle();
  if (!check) return Response.json({ error: 'This link is not valid. Ask for a new one.' }, { status: 404 });
  if (check.consent_status === 'approved') return Response.json({ status: 'approved' });
  if (olderThanDays(check.confirm_sent_at, CONFIRM_LINK_DAYS)) {
    return Response.json({ error: 'This link has expired. Open the approval link again to get a new one.' }, { status: 410 });
  }

  const { error } = await admin
    .from('age_checks')
    .update({ consent_status: 'approved', approved_at: new Date().toISOString(), approval_method: 'email', withdrawn_at: null })
    .eq('user_id', check.user_id);
  if (error) {
    console.error('Parent confirm failed', error);
    return Response.json({ error: 'Could not save your approval. Please try again.' }, { status: 500 });
  }
  return Response.json({ status: 'approved' });
}
