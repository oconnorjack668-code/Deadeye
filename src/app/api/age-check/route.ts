// src/app/api/age-check/route.ts
// Records whether a player is 16 or over, once. Accounts made since 00036 answer
// at sign-up; this is for older accounts, asked on their next visit. The answer
// cannot be changed afterwards, or "no" from a parent could be undone by
// answering again.
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { is16Plus?: unknown } | null;
  if (typeof body?.is16Plus !== 'boolean') {
    return Response.json({ error: 'Please choose an answer.' }, { status: 400 });
  }
  const is16Plus = body.is16Plus;

  const admin = createAdminClient();
  const { error } = await admin.from('age_checks').insert({
    user_id: user.id,
    is_16_plus: is16Plus,
    consent_status: is16Plus ? 'not_needed' : 'pending',
    request_token: is16Plus ? null : crypto.randomUUID(),
  });

  // 23505: already answered. Not an error worth showing - send them on as the existing answer says.
  if (error && error.code !== '23505') {
    console.error('Age check insert failed', error);
    return Response.json({ error: 'Could not save your answer. Please try again.' }, { status: 500 });
  }

  const { data } = await admin.from('age_checks').select('is_16_plus').eq('user_id', user.id).maybeSingle();
  return Response.json({ next: data?.is_16_plus ? '/dashboard' : '/parent-approval' });
}
