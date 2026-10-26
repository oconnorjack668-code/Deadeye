// @vitest-environment node
// __tests__/proxy-matcher.test.ts
// Files in public/ must skip the login check, or a signed-out visitor is sent
// to /login and downloads that page in place of the file: the club pricing
// sheet PDF on the landing page did exactly that.
import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

vi.mock('@/lib/supabase/middleware', () => ({ updateSession: vi.fn() }));
import { config } from '@/proxy';

const runsProxy = (p: string) => new RegExp(`^${config.matcher[0]}$`).test(p);

describe('the proxy matcher', () => {
  it('lets the files linked from public pages through without the login check', () => {
    expect(runsProxy('/deadeye-club-plans.pdf')).toBe(false);
    expect(runsProxy('/promo/deadeye-promo.mp4')).toBe(false);
    expect(runsProxy('/samples/tracker-sample-poster.jpg')).toBe(false);
  });

  it('still checks the app pages', () => {
    expect(runsProxy('/dashboard')).toBe(true);
    expect(runsProxy('/admin/errors')).toBe(true);
  });

  it('skips every PDF the site serves from public/', () => {
    const pdfs = fs.readdirSync(path.join(__dirname, '..', 'public')).filter((f) => f.endsWith('.pdf'));
    expect(pdfs.length).toBeGreaterThan(0);
    for (const f of pdfs) expect(runsProxy(`/${f}`), f).toBe(false);
  });
});
