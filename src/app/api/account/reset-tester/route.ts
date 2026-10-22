// src/app/api/account/reset-tester/route.ts
// Tester accounts only: deletes the signed-in account and makes it again with
// the same email and the password sent, so it goes through setup like a new
// player. Refused for every other account, the owner's included.
import { checkIsOwner, getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { isTestAccount, resetTesterAccount } from '@/lib/testAccounts';
import { signUpSchema } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  // An owner listed in TEST_ACCOUNT_EMAILS by mistake is still refused, and so is anyone when the check fails
  if (!isTestAccount(user.email) || (await checkIsOwner().catch(() => true))) {
    return Response.json({ error: 'Only tester accounts can be reset.' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = signUpSchema.shape.password.safeParse(body?.password);
  if (!password.success) {
    return Response.json({ error: password.error.issues[0]?.message ?? 'Choose a password.' }, { status: 400 });
  }

  const result = await resetTesterAccount(createAdminClient(), user.id, password.data);
  if (!result.ok) return Response.json({ error: result.error }, { status: 500 });
  return Response.json({ reset: true });
}
