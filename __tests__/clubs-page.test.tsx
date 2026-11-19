// __tests__/clubs-page.test.tsx
// The public /clubs page clubs are sent in outreach emails. A signed-out
// committee member must reach it (not the login page), every price must come
// from src/lib/plans.ts so it cannot drift from the homepage and the sheet,
// and the contact address must come from the environment, never the code.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { NextRequest } from 'next/server';

const state = { user: null as { id: string } | null };

vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => state.user }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getClaims: async () => ({ data: state.user ? { claims: { sub: state.user.id } } : null }) },
  }),
}));

import ClubsPage from '@/app/clubs/page';
import { updateSession } from '@/lib/supabase/middleware';
import { CLUB_PLANS, CLUB_PLANS_PDF, FOUNDING_CLUB_OFFER } from '@/lib/plans';

const req = (path: string) => new NextRequest(new URL(path, 'https://deadeyeapp.vercel.app'));
const renderPage = async () => render(await ClubsPage());

describe('the /clubs page', () => {
  beforeEach(() => {
    state.user = null;
    vi.stubEnv('SUPPORT_EMAIL', 'clubs@example.test');
    vi.stubEnv('OWNER_EMAIL', '');
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('is open to a signed-out visitor, while club boards still need an account', async () => {
    expect((await updateSession(req('/clubs'))).headers.get('location')).toBeNull();
    expect((await updateSession(req('/clubs/some-club-id'))).headers.get('location')).toContain('/login');
  });

  it('shows every club plan price and the founding offer from plans.ts', async () => {
    await renderPage();
    for (const p of CLUB_PLANS) {
      const card = screen.getByRole('heading', { name: p.name }).closest('li')!;
      expect(card.textContent).toContain(p.price);
      expect(card.textContent).toContain(p.alt);
    }
    expect(screen.getByText(FOUNDING_CLUB_OFFER)).toBeTruthy();
    expect(screen.getByText(/Paid club plans open soon/, { selector: '#prices p' })).toBeTruthy();
  });

  it('offers the pricing sheet as a download', async () => {
    await renderPage();
    const pdf = screen.getByRole('link', { name: /Club pricing sheet/ });
    expect(pdf.getAttribute('href')).toBe(CLUB_PLANS_PDF);
    expect(pdf.hasAttribute('download')).toBe(true);
  });

  it('sends a new coach to sign up, and a signed-in one to coach home', async () => {
    await renderPage();
    const signUp = screen.getAllByRole('link', { name: 'Sign up free as a coach' });
    expect(signUp.length).toBeGreaterThan(0);
    signUp.forEach((a) => expect(a.getAttribute('href')).toBe('/signup'));
    cleanup();

    state.user = { id: 'coach-1' };
    await renderPage();
    expect(screen.queryByRole('link', { name: 'Sign up free as a coach' })).toBeNull();
    screen.getAllByRole('link', { name: 'Set up your team' }).forEach((a) => expect(a.getAttribute('href')).toBe('/coach'));
  });

  it('emails the address from the environment, and shows no email link without one', async () => {
    await renderPage();
    const email = screen.getByRole('link', { name: /Email us about your club/ });
    expect(email.getAttribute('href')).toMatch(/^mailto:clubs@example\.test\?subject=/);
    cleanup();

    vi.stubEnv('SUPPORT_EMAIL', '');
    await renderPage();
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it('has the safeguarding facts and the founding competition section to link to', async () => {
    await renderPage();
    expect(screen.getByText('Head coaches are 18 or over and confirm Garda vetting when they set up.')).toBeTruthy();
    expect(screen.getByText("Coaches and players under 18 can't be friends on Deadeye.")).toBeTruthy();
    const competition = document.getElementById('competition')!;
    expect(competition.textContent).toContain('every club that enters gets 25% off its first year');
    expect(competition.textContent).toContain('Closes 31 December 2026');
    expect(competition.textContent).not.toMatch(/draw|random/i);
    expect(competition.textContent).toContain('most useful feedback');
    expect(screen.getByRole('link', { name: /How to enter/ }).getAttribute('href')).toBe('/competition');
  });
});
