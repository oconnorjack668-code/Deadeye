// __tests__/auth.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkIsOwner } from '@/lib/auth';

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

describe('Auth & Entitlement Logic', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.OWNER_EMAIL = 'owner@hoopiq.app';
  });

  it('recognizes configured OWNER_EMAIL environment variable', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { sub: 'user-123', email: 'owner@hoopiq.app' } },
          error: null,
        }),
      },
    });

    const isOwner = await checkIsOwner();
    expect(isOwner).toBe(true);
  });

  it('denies owner status to non-owner email when database has no owner role', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: { claims: { sub: 'user-456', email: 'player@example.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }),
    });

    const isOwner = await checkIsOwner();
    expect(isOwner).toBe(false);
  });

  it('returns false when unauthenticated', async () => {
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      },
    });

    const isOwner = await checkIsOwner();
    expect(isOwner).toBe(false);
  });
});

// The age gate (00036). Migrations are run by hand and code deploys on push,
// so the code can be live before the age_checks table exists. That must leave
// the gate off, not send every player to a question they cannot answer.
describe('getAgeGate', () => {
  async function gateWith(result: { data: unknown; error: unknown }) {
    vi.resetModules();
    const { createClient } = await import('@/lib/supabase/server');
    (createClient as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      auth: {
        getClaims: vi.fn().mockResolvedValue({ data: { claims: { sub: 'user-1', email: 'p@x.ie' } }, error: null }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({ maybeSingle: vi.fn().mockResolvedValue(result) }),
        }),
      }),
    });
    const { getAgeGate } = await import('@/lib/auth');
    return getAgeGate();
  }

  it('asks a player who has not answered', async () => {
    expect(await gateWith({ data: null, error: null })).toBe('ask-age');
  });

  it('holds an under-16 waiting for a parent', async () => {
    expect(await gateWith({ data: { is_16_plus: false, consent_status: 'pending' }, error: null })).toBe('needs-parent');
  });

  it('lets everyone in while the table does not exist yet', async () => {
    const missing = { code: 'PGRST205', message: "Could not find the table 'public.age_checks' in the schema cache" };
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await gateWith({ data: null, error: missing })).toBe('ok');
  });
});
