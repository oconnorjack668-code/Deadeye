// __tests__/accountDeletion.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const stripe = {
  subscriptions: {
    retrieve: vi.fn(),
    cancel: vi.fn(),
  },
};
vi.mock('@/lib/stripe', () => ({
  stripeConfigured: () => true,
  getStripe: () => stripe,
}));

import { deleteAccount } from '@/lib/accountDeletion';

/** An admin client with one subscription row, no videos, and a recorded deleteUser. */
function admin(sub: { stripe_subscription_id: string | null; status: string } | null) {
  const deleteUser = vi.fn(async () => ({ error: null }));
  const client = {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: sub }) }) }),
    }),
    storage: { from: () => ({ list: async () => ({ data: [], error: null }), remove: async () => ({ error: null }) }) },
    auth: { admin: { deleteUser } },
  };
  return { client: client as unknown as Parameters<typeof deleteAccount>[0], deleteUser };
}

beforeEach(() => {
  stripe.subscriptions.retrieve.mockReset();
  stripe.subscriptions.cancel.mockReset();
});

describe('deleteAccount', () => {
  it('cancels a paid subscription at Stripe before deleting, so the player stops being charged', async () => {
    stripe.subscriptions.retrieve.mockResolvedValue({ status: 'active' });
    stripe.subscriptions.cancel.mockResolvedValue({});
    const { client, deleteUser } = admin({ stripe_subscription_id: 'sub_123', status: 'active' });
    expect(await deleteAccount(client, 'user-1')).toEqual({ ok: true });
    expect(stripe.subscriptions.cancel).toHaveBeenCalledWith('sub_123');
    expect(deleteUser).toHaveBeenCalledWith('user-1');
  });

  it('deletes nothing when the subscription could not be cancelled', async () => {
    stripe.subscriptions.retrieve.mockRejectedValue(new Error('Stripe is down'));
    const { client, deleteUser } = admin({ stripe_subscription_id: 'sub_123', status: 'active' });
    const result = await deleteAccount(client, 'user-1');
    expect(result.ok).toBe(false);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it('goes ahead when Stripe no longer has the subscription', async () => {
    stripe.subscriptions.retrieve.mockRejectedValue(Object.assign(new Error('No such subscription'), { code: 'resource_missing' }));
    const { client, deleteUser } = admin({ stripe_subscription_id: 'sub_gone', status: 'active' });
    expect(await deleteAccount(client, 'user-1')).toEqual({ ok: true });
    expect(deleteUser).toHaveBeenCalled();
  });

  it('does not touch Stripe for a free account or one already cancelled', async () => {
    for (const sub of [null, { stripe_subscription_id: null, status: 'active' }, { stripe_subscription_id: 'sub_1', status: 'canceled' }]) {
      const { client, deleteUser } = admin(sub);
      expect(await deleteAccount(client, 'user-1')).toEqual({ ok: true });
      expect(deleteUser).toHaveBeenCalled();
    }
    expect(stripe.subscriptions.retrieve).not.toHaveBeenCalled();
  });
});
