// __tests__/founding-routes.test.ts
// The two routes the founding member offer runs through: claiming it, and
// checking out at the founder price. The database function enforces the cap
// (tested against Postgres when 00037 was written); these check the server
// passes it the right numbers and says the right thing for every answer.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.setConfig({ testTimeout: 30_000 });

let owner = false;
let waitingForParent = false;
let rpcResult: { data: string | null; error: unknown } = { data: 'claimed', error: null };
const rpc = vi.fn(async () => rpcResult);
let subRow: Record<string, unknown> | null = null;
const sessionsCreate = vi.fn<(args: unknown) => Promise<{ url: string }>>(async () => ({ url: 'https://checkout.test/session' }));

vi.mock('@/lib/auth', () => ({
  getCurrentUser: async () => ({ id: 'user-1', email: 'p@x.ie' }),
  checkIsOwner: async () => owner,
  awaitingParentApproval: async () => waitingForParent,
  PARENT_APPROVAL_NEEDED: 'A parent or guardian needs to approve your account first.',
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    rpc,
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: subRow }) }) }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
  }),
}));

vi.mock('@/lib/stripe', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/stripe')>()),
  stripeConfigured: () => true,
  getStripe: () => ({
    customers: { create: async () => ({ id: 'cus_new' }) },
    checkout: { sessions: { create: sessionsCreate } },
  }),
}));

describe('POST /api/founding/claim', () => {
  async function claim() {
    const { POST } = await import('@/app/api/founding/claim/route');
    const res = await POST();
    return { status: res.status, body: await res.json() };
  }

  beforeEach(() => {
    owner = false;
    waitingForParent = false;
    rpc.mockClear();
    rpcResult = { data: 'claimed', error: null };
    subRow = { founding_pro_until: '2027-01-18T12:00:00Z' };
    delete process.env.FOUNDING_OFFER_CLOSED;
  });

  it('passes the cap and length to the database and reports the end date', async () => {
    const { status, body } = await claim();
    expect(status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('claim_founding_pro', { p_user: 'user-1', p_limit: 100, p_months: 3 });
    expect(body).toEqual({ status: 'claimed', until: '2027-01-18T12:00:00Z' });
  });

  it('says plainly when every place has gone', async () => {
    rpcResult = { data: 'full', error: null };
    const { status, body } = await claim();
    expect(status).toBe(410);
    expect(body.error).toMatch(/All 100 founding member places/);
  });

  it('never claims for the owner, an unapproved under-16, or once the offer is switched off', async () => {
    owner = true;
    expect((await claim()).status).toBe(409);
    owner = false;
    waitingForParent = true;
    expect((await claim()).status).toBe(403);
    waitingForParent = false;
    process.env.FOUNDING_OFFER_CLOSED = 'true';
    expect((await claim()).status).toBe(410);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe('POST /api/billing/checkout for a founding member', () => {
  async function checkout(interval: 'month' | 'year') {
    const { POST } = await import('@/app/api/billing/checkout/route');
    const res = await POST(new Request('http://x/api/billing/checkout', { method: 'POST', body: JSON.stringify({ interval }) }));
    return { status: res.status, body: await res.json() };
  }

  beforeEach(() => {
    sessionsCreate.mockClear();
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_normal';
    process.env.STRIPE_PRO_YEARLY_PRICE_ID = 'price_year';
    process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID = 'price_founder';
  });

  it('charges the founder price, from the day the free months end', async () => {
    const until = new Date(Date.now() + 40 * 86_400_000);
    subRow = { stripe_customer_id: 'cus_1', plan_type: 'free', founding_claimed_at: '2026-10-18T12:00:00Z', founding_pro_until: until.toISOString() };
    const { status } = await checkout('month');
    expect(status).toBe(200);
    const args = sessionsCreate.mock.calls[0][0] as unknown as {
      line_items: Array<{ price: string }>;
      subscription_data: { trial_end?: number; metadata: Record<string, string> };
    };
    expect(args.line_items[0].price).toBe('price_founder');
    expect(args.subscription_data.trial_end).toBe(Math.floor(until.getTime() / 1000));
    expect(args.subscription_data.metadata.founding_member).toBe('true');
  });

  it('charges everyone else the normal price, straight away', async () => {
    subRow = { stripe_customer_id: 'cus_1', plan_type: 'free', founding_claimed_at: null, founding_pro_until: null };
    await checkout('month');
    const args = sessionsCreate.mock.calls[0][0] as unknown as {
      line_items: Array<{ price: string }>;
      subscription_data: { trial_end?: number };
    };
    expect(args.line_items[0].price).toBe('price_normal');
    expect(args.subscription_data.trial_end).toBeUndefined();
  });

  it('refuses a second subscription', async () => {
    subRow = { stripe_customer_id: 'cus_1', plan_type: 'pro', founding_claimed_at: null, founding_pro_until: null };
    expect((await checkout('year')).status).toBe(409);
    expect(sessionsCreate).not.toHaveBeenCalled();
  });
});
