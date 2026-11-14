// __tests__/plays-coach-pages.test.tsx
// The F2 pages with the Supabase fake: drawing and copying a play (coaches
// only, Free keeps 5), the play page's tools for coaches and the Pro lock
// lifted for a play the coach set, "From your coach" at the top of the
// library, the quiz page, the coach's Playbook tab, and the progress view a
// head coach sees for a play they set (statuses and totals, never anyone's
// own answers; assistants see neither).
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { LIBRARY_PLAYS } from '@/data/plays/library';
import { fakeClient, fakeState, type FakeState } from './support/supabaseFake';

const auth = vi.hoisted(() => ({ id: 'user-1', pro: false }));
const db = vi.hoisted(() => ({ state: null as unknown as FakeState }));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('notFound');
  },
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
}));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/events', () => ({ track: () => undefined }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({}) }));
vi.mock('@/app/(app)/plays/actions', () => ({ savePlay: async () => ({ ok: true, id: 'x' }), deletePlay: async () => ({ ok: true }), submitQuizAttempt: async () => ({ ok: true }) }));
// Film is open in these tests; film-live.test.ts covers it closed
process.env.FILM_LIVE = 'true';
vi.mock('@/lib/auth', () => ({
  requireUser: async () => ({ id: auth.id }),
  getHasPro: async () => auth.pro,
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => fakeClient(db.state) }));

import NewPlayPage from '@/app/(app)/plays/new/page';
import PlayPage from '@/app/(app)/plays/[id]/page';
import PlaysPage from '@/app/(app)/plays/page';
import PlayQuizPage from '@/app/(app)/plays/[id]/quiz/page';
import PlaybookPage from '@/app/(app)/coach/playbook/page';
import PlayProgressPage from '@/app/(app)/coach/assignments/[id]/page';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const library = LIBRARY_PLAYS.map((p, i) => ({
  id: id(i + 1),
  owner_id: null,
  title: p.title,
  category: p.category,
  min_age: p.min_age,
  tags: p.tags,
  description: p.description,
  coaching_points: p.coaching_points,
  diagram: p.diagram,
  is_free: p.is_free,
}));
const idOf = (slug: string) => library[LIBRARY_PLAYS.findIndex((p) => p.slug === slug)].id;
const COACH_PLAY = id(100);
const coachPlay = { ...library[0], id: COACH_PLAY, owner_id: 'coach-1', title: 'Our motion', is_free: false };
const ASSIGNMENT = id(200);

function asCoach(role: 'coach' | 'assistant' = 'coach') {
  auth.id = 'coach-1';
  db.state.tables.coach_profiles = [{ user_id: 'coach-1' }];
  db.state.tables.team_members = [{ team_id: 't1', user_id: 'coach-1', role, teams: { id: 't1', name: 'U14 Girls' } }];
}

function asPlayerOnTeam() {
  auth.id = 'user-1';
  db.state.tables.team_members = [{ team_id: 't1', user_id: 'user-1', role: 'player' }];
}

beforeEach(() => {
  auth.id = 'user-1';
  auth.pro = false;
  db.state = fakeState();
  db.state.tables.plays = [...library, coachPlay];
});

describe('drawing a play (/plays/new)', () => {
  const renderNew = async (from?: string) => render(await NewPlayPage({ searchParams: Promise.resolve(from ? { from } : {}) }));

  it('is for coaches', async () => {
    await renderNew();
    expect(screen.getByText(/Drawing plays is for coaches/)).toBeTruthy();
    expect(screen.queryByRole('img', { name: /Play editor court/ })).toBeNull();
  });

  it('opens the editor for a coach', async () => {
    asCoach();
    await renderNew();
    expect(screen.getByRole('heading', { level: 1, name: 'Draw a play' })).toBeTruthy();
    expect(screen.getByRole('img', { name: /Play editor court/ })).toBeTruthy();
  });

  it('says so at the Free limit of 5 plays, and opens with Pro', async () => {
    asCoach();
    db.state.tables.plays = [...library, ...Array.from({ length: 5 }, (_, i) => ({ ...coachPlay, id: id(300 + i) }))];
    await renderNew();
    expect(screen.getByText(/You have 5 plays, which is what Free keeps/)).toBeTruthy();
    expect(screen.queryByRole('img', { name: /Play editor court/ })).toBeNull();
    auth.pro = true;
    const { container } = await renderNew();
    expect(within(container).getByRole('img', { name: /Play editor court/ })).toBeTruthy();
  });

  it('copies a play the coach can open, and not a Pro play on Free', async () => {
    asCoach();
    await renderNew(idOf('give-and-go'));
    expect(screen.getByRole('heading', { level: 1, name: 'Copy and edit' })).toBeTruthy();
    expect(screen.getByText('A copy of Give-and-go. Change anything; the original stays as it is.')).toBeTruthy();
    expect((screen.getByLabelText('Name') as HTMLInputElement).value).toBe('Give-and-go');
    const { container } = await renderNew(idOf('floppy'));
    expect(within(container).getByRole('heading', { level: 1, name: 'Draw a play' })).toBeTruthy();
  });
});

describe('a play page, F2 additions', () => {
  const renderPlay = async (playId: string) => render(await PlayPage({ params: Promise.resolve({ id: playId }) }));

  it('opens a Pro play on Free when the coach set it, with the quiz and what the coach sees', async () => {
    asPlayerOnTeam();
    db.state.tables.team_assignments = [{ id: ASSIGNMENT, team_id: 't1', play_id: idOf('floppy') }];
    await renderPlay(idOf('floppy'));
    expect(screen.queryByText('This play is part of Pro')).toBeNull();
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /Quiz on your role/ }).getAttribute('href')).toBe(`/plays/${idOf('floppy')}/quiz`);
    expect(screen.getByText('Your coach sees whether you did it and whether you got it right.')).toBeTruthy();
  });

  it('gives no coach tools or coach line to a player looking at a library play', async () => {
    await renderPlay(idOf('give-and-go'));
    expect(screen.queryByRole('heading', { name: 'For your team' })).toBeNull();
    expect(screen.queryByText(/Your coach sees/)).toBeNull();
  });

  it('gives a coach Copy and edit, Add to team playbook and Assign to team; Edit only on their own play', async () => {
    asCoach();
    await renderPlay(idOf('give-and-go'));
    const tools = screen.getByRole('region', { name: 'For your team' });
    expect(within(tools).getByRole('link', { name: /Copy and edit/ }).getAttribute('href')).toBe(`/plays/new?from=${idOf('give-and-go')}`);
    expect(within(tools).getByRole('button', { name: /Add to team playbook/ })).toBeTruthy();
    expect(within(tools).getByRole('link', { name: /Assign to team/ }).getAttribute('href')).toBe(`/coach/assignments?team=t1&play=${idOf('give-and-go')}`);
    expect(within(tools).queryByRole('link', { name: /^Edit/ })).toBeNull();

    const { container } = await renderPlay(COACH_PLAY);
    expect(within(container).getByRole('link', { name: /^Edit/ }).getAttribute('href')).toBe(`/plays/${COACH_PLAY}/edit`);
  });

  it('shows a play already in the team playbook as in it', async () => {
    asCoach();
    db.state.tables.team_playbook = [{ team_id: 't1', play_id: idOf('give-and-go') }];
    await renderPlay(idOf('give-and-go'));
    expect(screen.getByRole('button', { name: /Remove from team playbook/ }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('From your coach, at the top of the library', () => {
  it('shows the plays set for the team and its playbook, whether you know them, and what the coach sees', async () => {
    asPlayerOnTeam();
    db.state.tables.team_assignments = [
      { id: ASSIGNMENT, team_id: 't1', title: 'Learn Floppy', due_date: '2026-11-20', play_id: idOf('floppy'), created_at: '2026-11-13T10:00:00Z' },
      { id: id(201), team_id: 't1', title: '200 makes', due_date: null, play_id: null, created_at: '2026-11-12T10:00:00Z' },
    ];
    db.state.tables.team_playbook = [{ team_id: 't1', play_id: COACH_PLAY }];
    db.state.tables.play_quiz_attempts = [{ user_id: 'user-1', play_id: idOf('floppy'), score: 3 }];
    render(await PlaysPage({ searchParams: Promise.resolve({}) }));

    const section = screen.getByRole('region', { name: 'From your coach' });
    const assigned = within(section).getByRole('link', { name: /Floppy/ });
    expect(assigned.textContent).toMatch(/Learn Floppy · Due/);
    expect(assigned.textContent).toMatch(/You know it/);
    expect(within(section).getByRole('link', { name: /Our motion/ }).textContent).toMatch(/In your team playbook/);
    expect(within(section).queryByText(/200 makes/)).toBeNull();
    expect(within(section).getByText('Your coach sees whether you did it and whether you got it right.')).toBeTruthy();
    // Floppy is Pro, but the coach set it, so the library does not tag it
    const libraryFloppy = screen.getAllByRole('link', { name: /Floppy/ }).find((l) => !section.contains(l))!;
    expect(within(libraryFloppy).queryByText('Pro')).toBeNull();
  });

  it('is not there for a player on no team', async () => {
    render(await PlaysPage({ searchParams: Promise.resolve({}) }));
    expect(screen.queryByRole('region', { name: 'From your coach' })).toBeNull();
  });
});

describe('the quiz page', () => {
  const renderQuiz = async (playId: string) => render(await PlayQuizPage({ params: Promise.resolve({ id: playId }) }));

  it('asks the first of three questions, by tapping spots', async () => {
    await renderQuiz(idOf('four-out-one-in'));
    expect(screen.getByText('Question 1 of 3')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Spots on the court' })).toBeTruthy();
    expect(screen.queryByText(/Your coach sees/)).toBeNull();
  });

  it('says what the coach sees when the coach set the play', async () => {
    asPlayerOnTeam();
    db.state.tables.team_assignments = [{ id: ASSIGNMENT, team_id: 't1', play_id: idOf('four-out-one-in') }];
    await renderQuiz(idOf('four-out-one-in'));
    expect(screen.getByText('Your coach sees whether you did it and whether you got it right.')).toBeTruthy();
  });

  it('locks a Pro play on Free', async () => {
    await renderQuiz(idOf('floppy'));
    expect(screen.getByText('This play is part of Pro')).toBeTruthy();
    expect(screen.queryByText(/Question 1/)).toBeNull();
  });
});

describe('the Playbook tab', () => {
  it('lists the coach plays against the Free limit, and each team playbook with a way to take plays out', async () => {
    asCoach();
    db.state.tables.team_playbook = [{ team_id: 't1', play_id: idOf('give-and-go'), plays: { id: idOf('give-and-go'), title: 'Give-and-go', category: 'principles', owner_id: null } }];
    render(await PlaybookPage());
    expect(screen.getByRole('heading', { name: 'Your plays · 1 of 5' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Edit Our motion' }).getAttribute('href')).toBe(`/plays/${COACH_PLAY}/edit`);
    expect(screen.getByRole('link', { name: /Draw a play/ }).getAttribute('href')).toBe('/plays/new');
    expect(screen.getByRole('heading', { name: 'U14 Girls' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Take Give-and-go out of this playbook' })).toBeTruthy();
  });

  it('is for coaches', async () => {
    render(await PlaybookPage());
    expect(screen.getByText(/The playbook is for coaches/)).toBeTruthy();
  });
});

describe('progress on a play set for the team', () => {
  const renderProgress = async () => render(await PlayProgressPage({ params: Promise.resolve({ id: ASSIGNMENT }) }));

  beforeEach(() => {
    db.state.tables.team_assignments = [
      { id: ASSIGNMENT, team_id: 't1', title: 'Learn 4-out', due_date: '2026-11-20', created_at: '2026-11-13T10:00:00Z', play_id: idOf('four-out-one-in') },
    ];
    db.state.tables.teams = [{ id: 't1', name: 'U14 Girls' }];
    db.state.rpc.team_roster = [
      { user_id: 'p1', display_name: 'Aoife', role: 'player' },
      { user_id: 'p2', display_name: 'Ben', role: 'player' },
      { user_id: 'p3', display_name: 'Cara', role: 'player' },
      { user_id: 'coach-1', display_name: 'Coach', role: 'coach' },
    ];
    db.state.tables.play_quiz_attempts = [
      { user_id: 'p1', play_id: idOf('four-out-one-in'), score: 3 },
      { user_id: 'p2', play_id: idOf('four-out-one-in'), score: 1 },
    ];
    db.state.rpc.play_assignment_split = [
      { question_key: 'o1:2', pick: 'basket', players: 1 },
      { question_key: 'o1:2', pick: 'right-wing', players: 1 },
    ];
  });

  it('shows a head coach each player as knows it, done or not started, and the team split as totals', async () => {
    asCoach('coach');
    await renderProgress();
    const players = screen.getByRole('region', { name: 'Players' });
    const rows = within(players).getAllByRole('listitem').map((li) => li.textContent);
    expect(rows).toEqual(['AoifeKnows it', 'BenDone', 'CaraNot started']);
    expect(players.textContent).toMatch(/1 know it · 1 done · 1 not started/);

    const split = screen.getByRole('region', { name: 'How the team answered' });
    expect(within(split).getByText("You're 1. In step 2, where do you go?")).toBeTruthy();
    expect(within(split).getByText('the basket (right answer)')).toBeTruthy();
    expect(within(split).getAllByText('1 of 2')).toHaveLength(2);
    // Totals only: no player is named next to an answer
    for (const name of ['Aoife', 'Ben', 'Cara']) expect(split.textContent).not.toContain(name);
  });

  it('shows an assistant coach neither who knows it nor the split', async () => {
    asCoach('assistant');
    await renderProgress();
    expect(screen.getByText(/Head coaches see who has learned the play/)).toBeTruthy();
    expect(screen.queryByRole('region', { name: 'Players' })).toBeNull();
    expect(screen.queryByText('Aoife')).toBeNull();
  });

  it('is not found for a player, or for an assignment without a play', async () => {
    asPlayerOnTeam();
    await expect(renderProgress()).rejects.toThrow('notFound');
    asCoach();
    db.state.tables.team_assignments[0].play_id = null;
    await expect(renderProgress()).rejects.toThrow('notFound');
  });
});
