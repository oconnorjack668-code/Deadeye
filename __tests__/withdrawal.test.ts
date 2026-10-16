// __tests__/withdrawal.test.ts
// The EU 14-day withdrawal button for Pro. What matters: it works for the whole
// 14 days and not after, it refunds what was actually paid (and only once),
// and when a refund fails it says so instead of reporting success.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { withdrawalDeadline, withinWithdrawalPeriod } from '@/lib/withdrawal';

// Cold import of the route pulls in the Stripe SDK; see stripe-webhook.test.ts
vi.setConfig({ testTimeout: 30_000 });

const DAY = 86_400;
const NOW = Math.floor(Date.now() / 1000);

describe('withdrawal window', () => {
  it('is open for exactly 14 days from the purchase', () => {
    const start = Date.UTC(2026, 9, 1, 12) / 1000;
    expect(withdrawalDeadline(start).toISOString()).toBe('2026-10-15T12:00:00.000Z');
    expect(withinWithdrawalPeriod(start, new Date('2026-10-15T11:59:00Z'))).toBe(true);
    expect(withinWithdrawalPeriod(start, new Date('2026-10-15T12:01:00Z'))).toBe(false);
  });
});

const updates: Array<Record<string, unknown>> = [];
let subRow: Record<string, unknown> | null;

vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => ({ id: 'user-1', email: 'p@x.ie' }) }));
vi.mock('@/lib/email', () => ({ emailConfigured: () => false, sendEmail: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: subRow }) }) }),
      update: (u: Record<string, unknown>) => ({ eq: async () => (updates.push(u), { error: null }) }),
    }),
  }),
}));

const stripeSub = { id: 'sub_1', status: 'active', start_date: NOW - 3 * DAY };
const cancel = vi.fn(async () => ({}));
const refundsCreate = vi.fn(async () => ({}));
let charges: Array<{ id: string; amount: number; amount_refunded: number; paid: boolean; currency: string }>;
vi.mock('@/lib/stripe', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/stripe')>()),
  stripeConfigured: () => true,
  getStripe: () => ({
    subscriptions: { retrieve: async () => stripeSub, cancel },
    charges: { list: async () => ({ data: charges }) },
    refunds: { create: refundsCreate },
  }),
}));

async function post() {
  const { POST } = await import('@/app/api/billing/withdraw/route');
  return POST();
}

describe('POST /api/billing/withdraw', () => {
  beforeEach(() => {
    updates.length = 0;
    cancel.mockClear();
    refundsCreate.mockReset();
    refundsCreate.mockResolvedValue({});
    stripeSub.status = 'active';
    stripeSub.start_date = NOW - 3 * DAY;
    subRow = { stripe_customer_id: 'cus_1', stripe_subscription_id: 'sub_1', plan_type: 'pro' };
    charges = [
      { id: 'ch_paid', amount: 499, amount_refunded: 0, paid: true, currency: 'eur' },
      { id: 'ch_done', amount: 499, amount_refunded: 499, paid: true, currency: 'eur' },
      { id: 'ch_failed', amount: 499, amount_refunded: 0, paid: false, currency: 'eur' },
    ];
  });

  it('ends Pro now and refunds only what was paid and not already refunded', async () => {
    const res = await post();
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(cancel).toHaveBeenCalledWith('sub_1');
    expect(refundsCreate).toHaveBeenCalledTimes(1);
    expect(refundsCreate).toHaveBeenCalledWith({ charge: 'ch_paid', reason: 'requested_by_customer' });
    expect(body.refunded).toBe('€4.99');
    expect(updates).toContainEqual({ plan_type: 'free', status: 'canceled' });
  });

  it('refuses after 14 days and leaves the subscription alone', async () => {
    stripeSub.start_date = NOW - 15 * DAY;
    const res = await post();
    expect(res.status).toBe(409);
    expect(cancel).not.toHaveBeenCalled();
    expect(refundsCreate).not.toHaveBeenCalled();
  });

  it('says plainly when the refund fails after cancelling', async () => {
    refundsCreate.mockRejectedValueOnce(new Error('card_declined'));
    const res = await post();
    const body = await res.json();
    expect(res.status).toBe(502);
    expect(body.error).toMatch(/cancelled, but the refund did not go through/);
  });

  it('has nothing to do for a player without Pro', async () => {
    subRow = { stripe_customer_id: null, stripe_subscription_id: null, plan_type: 'free' };
    const res = await post();
    expect(res.status).toBe(404);
    expect(cancel).not.toHaveBeenCalled();
  });
});
