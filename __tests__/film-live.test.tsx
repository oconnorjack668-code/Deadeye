// __tests__/film-live.test.tsx
// Film stays closed to players until FILM_LIVE=true (the DPIA covering it is
// signed first, STATUS S1). The owner can open it before then. While closed,
// every Film page shows the "on the way" card and the actions write nothing.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { fakeClient, fakeState, type FakeState } from './support/supabaseFake';

const auth = vi.hoisted(() => ({ owner: false }));
const db = vi.hoisted(() => ({ state: null as unknown as FakeState }));

vi.mock('next/cache', () => ({ revalidatePath: () => undefined }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/film', useRouter: () => ({ push: () => undefined }) }));
vi.mock('@/lib/auth', () => ({
  requireUser: async () => ({ id: 'user-1' }),
  getCurrentUser: async () => ({ id: 'user-1' }),
  getHasPro: async () => false,
  checkIsOwner: async () => auth.owner,
  awaitingParentApproval: async () => false,
  PARENT_APPROVAL_NEEDED: 'Waiting for a parent.',
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => fakeClient(db.state) }));

import FilmLayout from '@/app/(app)/film/layout';
import { saveFilmNote, submitFilmAttempt, createPack } from '@/app/(app)/film/actions';
import { filmLiveForEveryone } from '@/lib/film/live';

const CLIP = '00000000-0000-4000-8000-000000000001';

beforeEach(() => {
  delete process.env.FILM_LIVE;
  auth.owner = false;
  db.state = fakeState({});
});
afterEach(() => {
  cleanup();
  delete process.env.FILM_LIVE;
});

describe('Film switch', () => {
  it('is closed unless FILM_LIVE is exactly true', () => {
    expect(filmLiveForEveryone()).toBe(false);
    process.env.FILM_LIVE = 'yes';
    expect(filmLiveForEveryone()).toBe(false);
    process.env.FILM_LIVE = ' TRUE ';
    expect(filmLiveForEveryone()).toBe(true);
  });

  it('shows players the on-the-way card, not the page, while closed', async () => {
    render(await FilmLayout({ children: <p>film page</p> }));
    expect(screen.getByText('Film is on the way')).toBeTruthy();
    expect(screen.queryByText('film page')).toBeNull();
    expect(screen.getByRole('link', { name: /Was that the right read/ }).getAttribute('href')).toBe('/film-questions');
  });

  it('opens for the owner before it is live, and for everyone once it is', async () => {
    auth.owner = true;
    render(await FilmLayout({ children: <p>film page</p> }));
    expect(screen.getByText('film page')).toBeTruthy();
    cleanup();
    auth.owner = false;
    process.env.FILM_LIVE = 'true';
    render(await FilmLayout({ children: <p>film page</p> }));
    expect(screen.getByText('film page')).toBeTruthy();
  });

  it('writes nothing for a player while closed', async () => {
    expect(await submitFilmAttempt(CLIP, [{ key: 'q1', pick: 0 }])).toEqual({ ok: false, error: 'Film is not open yet.' });
    expect(await saveFilmNote(CLIP, 'note')).toEqual({ ok: false, error: 'Film is not open yet.' });
    expect(db.state.writes).toEqual([]);
  });

  it('refuses a new pack while closed, even from a coach', async () => {
    db.state.tables.team_members = [{ user_id: 'user-1', team_id: 't1', role: 'coach', teams: { id: 't1', name: 'U14' } }];
    const result = await createPack('My pack', CLIP);
    expect(result.ok).toBe(false);
    expect(db.state.writes).toEqual([]);
  });
});
