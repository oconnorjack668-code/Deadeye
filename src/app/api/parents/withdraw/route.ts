// src/app/api/parents/withdraw/route.ts
// A parent takes their approval back, from either the link their child sent or
// the one we emailed. The account is locked straight away and deleted after
// UNAPPROVED_ACCOUNT_DAYS unless a parent approves again (cron/reminders).
import { createAdminClient } from '@/lib/supabase/admin';
import { isToken } from '@/lib/parentApproval';

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { token?: unknown } | null;
  const token = body?.token;
  if (!isToken(token)) return Response.json({ error: 'This link is not valid.' }, { status: 400 });

  const admin = createAdminClient();
  const { data: check } = await admin
    .from('age_checks')
    .select('user_id, consent_status')
    .or(`request_token.eq.${token},confirm_token.eq.${token}`)
    .maybeSingle();
  if (!check) return Response.json({ error: 'This link is not valid.' }, { status: 404 });
  if (check.consent_status !== 'approved') return Response.json({ status: check.consent_status });

  const { error } = await admin
    .from('age_checks')
    .update({ consent_status: 'withdrawn', withdrawn_at: new Date().toISOString() })
    .eq('user_id', check.user_id);
  if (error) {
    console.error('Parent withdraw failed', error);
    return Response.json({ error: 'Could not withdraw your approval. Please try again.' }, { status: 500 });
  }
  return Response.json({ status: 'withdrawn' });
}
