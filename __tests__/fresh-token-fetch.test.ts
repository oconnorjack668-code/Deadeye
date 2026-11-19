// __tests__/fresh-token-fetch.test.ts
import { describe, it, expect, vi } from 'vitest';
import { freshTokenFetch } from '@/lib/supabase/fresh-token-fetch';

const issuedInFuture = () =>
  new Response(JSON.stringify({ code: 'PGRST303', details: null, hint: null, message: 'JWT issued at future' }), { status: 401 });
const ok = () => new Response('[{"user_id":"u","path":"u/p.jpg"}]', { status: 200 });

describe('freshTokenFetch', () => {
  it('tries again when a just-refreshed token is turned away', async () => {
    const base = vi.fn<typeof fetch>().mockResolvedValueOnce(issuedInFuture()).mockResolvedValueOnce(ok());
    const res = await freshTokenFetch(base, [0, 0])('https://x.supabase.co/rest/v1/rpc/visible_photo_paths', { method: 'POST', body: '{}' });
    expect(res.status).toBe(200);
    expect(base).toHaveBeenCalledTimes(2);
    expect(base.mock.calls[1]).toEqual(base.mock.calls[0]);
  });

  it('gives up after the last wait and hands back the error', async () => {
    const base = vi.fn<typeof fetch>().mockImplementation(async () => issuedInFuture());
    const res = await freshTokenFetch(base, [0, 0])('https://x.supabase.co/rest/v1/profiles');
    expect(res.status).toBe(401);
    expect(base).toHaveBeenCalledTimes(3);
  });

  it('does not repeat any other 401, such as an expired token', async () => {
    const expired = new Response(JSON.stringify({ code: 'PGRST301', message: 'JWT expired' }), { status: 401 });
    const base = vi.fn<typeof fetch>().mockResolvedValue(expired);
    const res = await freshTokenFetch(base, [0, 0])('https://x.supabase.co/rest/v1/profiles');
    expect(res.status).toBe(401);
    expect(base).toHaveBeenCalledTimes(1);
    expect(await res.json()).toMatchObject({ code: 'PGRST301' });
  });

  it('passes good answers and non-JSON errors straight through', async () => {
    const base = vi.fn<typeof fetch>().mockResolvedValueOnce(ok()).mockResolvedValueOnce(new Response('nope', { status: 401 }));
    const wrapped = freshTokenFetch(base, [0, 0]);
    expect((await wrapped('a')).status).toBe(200);
    expect((await wrapped('b')).status).toBe(401);
    expect(base).toHaveBeenCalledTimes(2);
  });
});
