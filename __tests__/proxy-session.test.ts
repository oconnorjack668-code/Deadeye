// @vitest-environment node
// __tests__/proxy-session.test.ts
// When getClaims() refreshes a session, the new cookies and @supabase/ssr's no-cache headers
// must reach the browser, including on the proxy's redirects. Otherwise the browser keeps a
// used refresh token (signed out at random), or a CDN could cache one player's session.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

const state = { refresh: false, signedIn: true };

vi.mock('@supabase/ssr', () => ({
  createServerClient: (_url: string, _key: string, opts: { cookies: { setAll: (c: unknown[], h: Record<string, string>) => void } }) => ({
    auth: {
      getClaims: async () => {
        if (state.refresh) {
          opts.cookies.setAll(
            [{ name: 'sb-test-auth-token', value: 'fresh', options: { path: '/', httpOnly: true } }],
            { 'Cache-Control': 'private, no-cache, no-store, must-revalidate, max-age=0', Expires: '0', Pragma: 'no-cache' }
          );
        }
        return { data: state.signedIn ? { claims: { sub: 'user-1' } } : null };
      },
    },
  }),
}));

import { updateSession } from '@/lib/supabase/middleware';

const req = (path: string) => new NextRequest(new URL(path, 'https://deadeyeapp.vercel.app'));

describe('the proxy session refresh', () => {
  beforeEach(() => {
    state.refresh = false;
    state.signedIn = true;
  });

  it('sends refreshed cookies with no-cache headers on a normal page', async () => {
    state.refresh = true;
    const res = await updateSession(req('/dashboard'));
    expect(res.cookies.get('sb-test-auth-token')?.value).toBe('fresh');
    expect(res.headers.get('Cache-Control')).toContain('no-store');
    expect(res.headers.get('Pragma')).toBe('no-cache');
  });

  it('keeps refreshed cookies when a signed-in player is redirected from /login', async () => {
    state.refresh = true;
    const res = await updateSession(req('/login'));
    expect(res.headers.get('location')).toContain('/dashboard');
    expect(res.cookies.get('sb-test-auth-token')?.value).toBe('fresh');
    expect(res.headers.get('Cache-Control')).toContain('no-store');
  });

  it('keeps cookie changes on the redirect to /login', async () => {
    state.refresh = true;
    state.signedIn = false;
    const res = await updateSession(req('/dashboard'));
    expect(res.headers.get('location')).toContain('/login?redirectTo=%2Fdashboard');
    expect(res.cookies.get('sb-test-auth-token')?.value).toBe('fresh');
  });

  it('adds no cache headers when nothing was refreshed', async () => {
    const res = await updateSession(req('/dashboard'));
    expect(res.headers.get('Cache-Control')).toBeNull();
    expect(res.cookies.getAll()).toHaveLength(0);
  });
});
