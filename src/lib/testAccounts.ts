// src/lib/testAccounts.ts
// SERVER-ONLY: the founder's tester logins, listed in TEST_ACCOUNT_EMAILS
// (comma separated). They are left out of /admin/funnel, and they alone can be
// reset to a brand-new player from Settings (/api/account/reset-tester).
import type { createAdminClient } from './supabase/admin';
import { deleteAccount } from './accountDeletion';

type Admin = ReturnType<typeof createAdminClient>;

export function testAccountEmails(): string[] {
  return (process.env.TEST_ACCOUNT_EMAILS ?? '')
    .split(',')
    .map((e) => e.toLowerCase().trim())
    .filter(Boolean);
}

export function isTestAccount(email: string | null | undefined): boolean {
  return !!email && testAccountEmails().includes(email.toLowerCase().trim());
}

/**
 * Deletes a tester account and makes it again with the same email, so the
 * founder can walk the new-player path (setup, welcome, first log) as often as
 * they like without a new email address each time.
 *
 * Deleting and re-creating, rather than clearing tables, means nothing is left
 * behind when a new table is added. The new account gets the name and age
 * answer the sign-up form gave the old one, so the handle_new_user trigger
 * (00036) builds the same profile and age check a real sign-up would. It is
 * confirmed straight away: no email is sent.
 */
export async function resetTesterAccount(
  admin: Admin,
  userId: string,
  password: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  const email = data?.user?.email;
  if (error || !email) return { ok: false, error: 'Could not read this account, so nothing was reset. Try again.' };
  const signUp = data.user.user_metadata ?? {};

  const deleted = await deleteAccount(admin, userId);
  if (!deleted.ok) return deleted;

  const { error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: signUp.display_name, age_16_plus: signUp.age_16_plus },
  });
  if (createError) {
    console.error('Tester reset: the account was deleted but could not be made again', createError);
    return { ok: false, error: 'The old account was deleted, but the new one could not be made. Sign up again with the same email.' };
  }
  return { ok: true };
}
