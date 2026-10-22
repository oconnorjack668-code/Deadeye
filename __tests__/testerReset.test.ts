// @vitest-environment node
// __tests__/testerReset.test.ts
// Resetting a tester login to a brand-new player (Settings, for the founder's
// walk-throughs). Only accounts in TEST_ACCOUNT_EMAILS, never the owner, and
// the new account starts with the name and age answer the old one signed up with.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = { user: null as { id: string; email: string | null } | null, owner: false };
vi.mock('@/lib/auth', () => ({
  getCurrentUser: async () => auth.user,
  checkIsOwner: async () => auth.owner,
}));

const deletion = { result: { ok: true } as { ok: true } | { ok: false; error: string }, calls: [] as string[] };
vi.mock('@/lib/accountDeletion', () => ({
  deleteAccount: async (_admin: unknown, userId: string) => {
    deletion.calls.push(userId);
    return deletion.result;
  },
}));

const getUserById = vi.fn();
const createUser = vi.fn();
const admin = { auth: { admin: { getUserById, createUser } } };
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => admin }));

import { isTestAccount, resetTesterAccount } from '@/lib/testAccounts';
import { POST } from '@/app/api/account/reset-tester/route';

const TESTER = { id: 'tester-1', email: 'tester@example.com' };

function post(body: unknown) {
  return POST(new Request('http://localhost/api/account/reset-tester', { method: 'POST', body: JSON.stringify(body) }));
}

beforeEach(() => {
  process.env.TEST_ACCOUNT_EMAILS = ' other@example.com, Tester@Example.com ';
  auth.user = TESTER;
  auth.owner = false;
  deletion.result = { ok: true };
  deletion.calls = [];
  getUserById.mockReset().mockResolvedValue({
    data: { user: { id: TESTER.id, email: TESTER.email, user_metadata: { display_name: 'Tess', age_16_plus: true, avatar: 'x' } } },
    error: null,
  });
  createUser.mockReset().mockResolvedValue({ data: { user: { id: 'tester-2' } }, error: null });
});

describe('isTestAccount', () => {
  it('matches the listed emails whatever their case and spacing', () => {
    expect(isTestAccount('tester@example.com')).toBe(true);
    expect(isTestAccount('OTHER@example.com')).toBe(true);
  });

  it('refuses everyone else, and everyone when the list is empty', () => {
    expect(isTestAccount('player@example.com')).toBe(false);
    expect(isTestAccount(null)).toBe(false);
    process.env.TEST_ACCOUNT_EMAILS = '';
    expect(isTestAccount('tester@example.com')).toBe(false);
  });
});

describe('resetTesterAccount', () => {
  it('deletes the account and makes it again, confirmed, with the same email and sign-up answers', async () => {
    expect(await resetTesterAccount(admin as never, TESTER.id, 'Newpass123')).toEqual({ ok: true });
    expect(deletion.calls).toEqual([TESTER.id]);
    expect(createUser).toHaveBeenCalledWith({
      email: TESTER.email,
      password: 'Newpass123',
      email_confirm: true,
      user_metadata: { display_name: 'Tess', age_16_plus: true },
    });
  });

  it('makes nothing new when the old account could not be deleted', async () => {
    deletion.result = { ok: false, error: 'Could not delete your videos. Please try again.' };
    expect(await resetTesterAccount(admin as never, TESTER.id, 'Newpass123')).toEqual(deletion.result);
    expect(createUser).not.toHaveBeenCalled();
  });

  it('says to sign up again when the new account could not be made', async () => {
    createUser.mockResolvedValue({ data: { user: null }, error: { message: 'weak password' } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await resetTesterAccount(admin as never, TESTER.id, 'Newpass123');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/sign up again/i);
  });
});

describe('POST /api/account/reset-tester', () => {
  it('resets a listed tester', async () => {
    const res = await post({ password: 'Newpass123' });
    expect(res.status).toBe(200);
    expect(deletion.calls).toEqual([TESTER.id]);
  });

  it('refuses a player who is not on the tester list', async () => {
    auth.user = { id: 'player-1', email: 'player@example.com' };
    expect((await post({ password: 'Newpass123' })).status).toBe(403);
    expect(deletion.calls).toEqual([]);
  });

  it('refuses the owner even when their email is on the list', async () => {
    auth.owner = true;
    expect((await post({ password: 'Newpass123' })).status).toBe(403);
    expect(deletion.calls).toEqual([]);
  });

  it('refuses a password the sign-up form would refuse, before deleting anything', async () => {
    const res = await post({ password: 'short' });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/at least 8/);
    expect(deletion.calls).toEqual([]);
  });

  it('asks a signed-out visitor to log in', async () => {
    auth.user = null;
    expect((await post({ password: 'Newpass123' })).status).toBe(401);
  });
});
