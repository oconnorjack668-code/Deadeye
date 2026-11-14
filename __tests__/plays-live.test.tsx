// __tests__/plays-live.test.tsx
// Plays is open to everyone unless PLAYS_LIVE=false, the founder's switch to
// close it for players. The owner keeps it either way. While closed, every
// Plays page shows a plain card, the actions that write refuse (deleting a
// play still works), and coaches are not offered plays to set or keep.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { setupDiagram } from '@/lib/plays/setups';
import { fakeClient, fakeState, type FakeState } from './support/supabaseFake';

const auth = vi.hoisted(() => ({ owner: false }));
const db = vi.hoisted(() => ({ state: null as unknown as FakeState, admin: null as unknown as FakeState }));

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/plays', useRouter: () => ({ push: () => undefined, refresh: () => undefined }) }));
vi.mock('@/lib/auth', () => ({
  requireUser: async () => ({ id: 'user-1' }),
  getCurrentUser: async () => ({ id: 'user-1' }),
  getHasPro: async () => false,
  checkIsOwner: async () => auth.owner,
  awaitingParentApproval: async () => false,
  PARENT_APPROVAL_NEEDED: 'Waiting for a parent.',
}));
vi.mock('@/lib/userTime', () => ({ userCalendarNow: async () => ({ today: '2026-11-14' }) }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => fakeClient(db.state) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => fakeClient(db.state) }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => fakeClient(db.admin) }));

import PlaysLayout from '@/app/(app)/plays/layout';
import PlaybookPage from '@/app/(app)/coach/playbook/page';
import CoachAssignmentsPage from '@/app/(app)/coach/assignments/page';
import { deletePlay, savePlay, submitQuizAttempt } from '@/app/(app)/plays/actions';
import { playsLiveForEveryone } from '@/lib/plays/live';

const PLAY = '00000000-0000-4000-8000-000000000001';
const myPlay = { id: PLAY, owner_id: 'user-1', title: 'Our motion', category: 'half_court' };
const closed = () => {
  process.env.PLAYS_LIVE = 'false';
};
const asCoach = () => {
  db.state.tables.coach_profiles = [{ user_id: 'user-1' }];
  db.state.tables.team_members = [{ team_id: 't1', user_id: 'user-1', role: 'coach', teams: { id: 't1', name: 'U14 Girls' } }];
  db.state.tables.plays = [myPlay];
};

beforeEach(() => {
  delete process.env.PLAYS_LIVE;
  auth.owner = false;
  db.state = fakeState();
  db.admin = fakeState();
});
afterEach(() => {
  cleanup();
  delete process.env.PLAYS_LIVE;
});

describe('Plays switch', () => {
  it('is open unless PLAYS_LIVE is exactly false', () => {
    expect(playsLiveForEveryone()).toBe(true);
    process.env.PLAYS_LIVE = 'no';
    expect(playsLiveForEveryone()).toBe(true);
    process.env.PLAYS_LIVE = ' FALSE ';
    expect(playsLiveForEveryone()).toBe(false);
  });

  it('shows the page while open', async () => {
    render(await PlaysLayout({ children: <p>plays page</p> }));
    expect(screen.getByText('plays page')).toBeTruthy();
  });

  it('shows players a plain card, not the page, while closed', async () => {
    closed();
    render(await PlaysLayout({ children: <p>plays page</p> }));
    expect(screen.getByRole('heading', { name: 'Plays are not open right now.' })).toBeTruthy();
    expect(screen.queryByText('plays page')).toBeNull();
    expect(screen.getByRole('link', { name: 'Plays' }).getAttribute('aria-current')).toBe('page');
  });

  it('stays open for the owner while closed', async () => {
    closed();
    auth.owner = true;
    render(await PlaysLayout({ children: <p>plays page</p> }));
    expect(screen.getByText('plays page')).toBeTruthy();
  });

  it('writes nothing while closed, but a coach can still delete their own play', async () => {
    closed();
    asCoach();
    expect(await submitQuizAttempt(PLAY, [])).toEqual({ ok: false, error: 'Plays are not open right now.' });
    const play = { title: 'Horns flare', category: 'half_court', minAge: 'U12', description: '', coachingPoints: [], diagram: setupDiagram('horns') };
    expect(await savePlay(play as never)).toEqual({ ok: false, error: 'Plays are not open right now.' });
    expect(db.state.writes).toEqual([]);
    expect(db.admin.writes).toEqual([]);
    expect(await deletePlay(PLAY)).toEqual({ ok: true });
    expect(db.state.writes.map((w) => [w.table, w.op])).toEqual([['plays', 'delete']]);
  });

  it('takes plays off the coach Playbook tab while closed, and keeps them there while open', async () => {
    asCoach();
    render(await PlaybookPage());
    expect(screen.getByRole('link', { name: 'Edit Our motion' })).toBeTruthy();
    cleanup();
    closed();
    render(await PlaybookPage());
    expect(screen.getByText(/Plays are not open right now\. Your plays and team playbooks are kept\./)).toBeTruthy();
    expect(screen.queryByText('Our motion')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Team playbooks' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Draw a play/ })).toBeNull();
  });

  it('offers no play to set as an assignment while closed', async () => {
    asCoach();
    const page = async () => render(await CoachAssignmentsPage({ searchParams: Promise.resolve({ play: PLAY }) }));
    await page();
    expect(screen.getByRole('combobox', { name: 'Play to learn' })).toBeTruthy();
    cleanup();
    closed();
    await page();
    expect(screen.queryByRole('combobox', { name: 'Play to learn' })).toBeNull();
  });
});
