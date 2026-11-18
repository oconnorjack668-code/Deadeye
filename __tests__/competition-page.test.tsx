// __tests__/competition-page.test.tsx
// The public /competition page. A signed-out visitor must reach it (not the
// login page) and read the prizes, the closing time, how winners are chosen
// and the full rules, then be asked to sign up. A signed-in player sees the
// entry checklist instead, with a link to log the session the rules ask for.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { NextRequest } from 'next/server';
import type { CompetitionState } from '@/lib/competition-server';

const auth = { user: null as { id: string; email: string } | null };
let state: CompetitionState | null = null;

vi.mock('@/lib/auth', () => ({ getCurrentUser: async () => auth.user }));
vi.mock('@/lib/competition-server', () => ({ loadCompetitionState: async () => state }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getClaims: async () => ({ data: auth.user ? { claims: { sub: auth.user.id } } : null }) },
  }),
}));

import CompetitionPage from '@/app/competition/page';
import { updateSession } from '@/lib/supabase/middleware';

const req = (path: string) => new NextRequest(new URL(path, 'https://deadeye.test'));
const renderPage = async () => render(await CompetitionPage());

describe('the /competition page', () => {
  beforeEach(() => {
    auth.user = null;
    state = null;
    vi.stubEnv('COMPETITION_LIVE', '1');
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllEnvs();
  });

  it('before launch, shows the rules and prizes with "Opening soon", and no way to enter', async () => {
    vi.stubEnv('COMPETITION_LIVE', '');
    auth.user = { id: 'user-1', email: 'kid@example.ie' };
    const { container } = await renderPage();
    expect(screen.getByText('Opening soon')).toBeTruthy();
    expect(container.textContent).toMatch(/10 players win Deadeye Pro for life/);
    expect(screen.getByRole('heading', { name: 'Official rules' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Sign up free to enter' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Enter as a player' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Enter' })).toBeNull();
  });

  it('is open to a signed-out visitor, and so is the parent link', async () => {
    expect((await updateSession(req('/competition'))).headers.get('location')).toBeNull();
    expect((await updateSession(req('/parents/competition/aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'))).headers.get('location')).toBeNull();
    expect((await updateSession(req('/api/parents/competition'))).headers.get('location')).toBeNull();
    // Entering still needs an account
    expect((await updateSession(req('/api/competition'))).headers.get('location')).toContain('/login');
  });

  it('shows a signed-out visitor the prizes, the offer, the closing time, the judging and the rules', async () => {
    const { container } = await renderPage();
    const text = (container.textContent ?? '').replace(/\s+/g, ' ');
    expect(text).toMatch(/10 players win Deadeye Pro for life/);
    expect(text).toMatch(/1 club wins a year of the Club plan free, worth €899/);
    expect(text).toMatch(/Everyone who enters gets 25% off their first year/);
    expect(text).toMatch(/23:59 Irish time on 31 December 2026/);
    expect(text).toMatch(/judged, not drawn/);
    expect(text).not.toMatch(/second prize|runner-up/i);
    expect(screen.getByRole('heading', { name: 'Official rules' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '9. Under-18s' })).toBeTruthy();
    expect(text).toMatch(/deleted 6 months after the offer closes/);
    expect(text).not.toMatch(/Founder only|delete this box|\[DELETE_PERIOD\]/);
    expect(screen.getByRole('link', { name: 'Sign up free to enter' }).getAttribute('href')).toBe('/signup');
    expect(screen.getByRole('link', { name: 'Log in' }).getAttribute('href')).toBe('/login?redirectTo=%2Fcompetition');
    expect(screen.queryByRole('button', { name: 'Enter' })).toBeNull();
  });

  it('shows a signed-in player what is left to do, with a link to log a session', async () => {
    auth.user = { id: 'user-1', email: 'kid@example.ie' };
    state = {
      route: 'ask-parent',
      facts: { ageCheck: { is_16_plus: true, consent_status: 'not_needed', parent_email: null }, ageBracket: '14-17' },
      accountParentName: null,
      hasSession: false,
      playerEntry: null,
      clubEntry: null,
      coachTeams: null,
      coachClubName: null,
    };
    await renderPage();
    expect(screen.getByRole('link', { name: 'Log a session' }).getAttribute('href')).toBe('/basketball/new');
    expect((screen.getByRole('button', { name: 'Enter' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole('textbox', { name: /One thing you liked and one thing you would change/ })).toBeTruthy();
    expect(screen.getByRole('textbox', { name: /Parent or guardian's email/ })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: /I agree to the rules/ })).toBeTruthy();
    expect(screen.getByRole('checkbox', { name: "This is my parent or guardian's email, not mine." })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Enter my club' })).toBeNull();
  });

  it('shows an entry waiting for a parent without any link to approve it', async () => {
    auth.user = { id: 'user-1', email: 'kid@example.ie' };
    state = {
      route: 'under16',
      facts: { ageCheck: { is_16_plus: false, consent_status: 'approved', parent_email: 'mam@example.ie' }, ageBracket: '13' },
      accountParentName: null,
      hasSession: true,
      playerEntry: {
        id: 'e1',
        kind: 'player',
        team_id: null,
        club_name: null,
        feedback: 'I liked the tracker a lot. I would change the colours.',
        status: 'pending_parent',
        parent_email: 'mam@example.ie',
        parent_token_sent_at: null,
        parent_decided_at: null,
      },
      clubEntry: null,
      coachTeams: null,
      coachClubName: null,
    };
    const { container } = await renderPage();
    expect(screen.getByRole('status').textContent).toBe('Waiting for your parent or guardian. We’ll email them as soon as we can.');
    expect(container.innerHTML).not.toMatch(/parents\/competition/);
    expect(screen.getByRole('button', { name: 'Change my feedback' })).toBeTruthy();
  });

  it('offers an adult head coach "Enter my club"', async () => {
    auth.user = { id: 'coach-1', email: 'coach@example.ie' };
    state = {
      route: 'adult',
      facts: { ageCheck: { is_16_plus: true, consent_status: 'not_needed', parent_email: null }, ageBracket: '30+' },
      accountParentName: null,
      hasSession: false,
      playerEntry: null,
      clubEntry: null,
      coachTeams: [{ id: 't1', name: 'U16 Girls', clubName: 'Wexford Wildcats', playersWhoTrained: 1 }],
      coachClubName: null,
    };
    await renderPage();
    expect(screen.getByRole('heading', { name: 'Enter my club' })).toBeTruthy();
    expect((screen.getByRole('textbox', { name: 'Club name' }) as HTMLInputElement).value).toBe('Wexford Wildcats');
    expect(screen.getByRole('checkbox', { name: /knows about this entry/ })).toBeTruthy();
  });
});
