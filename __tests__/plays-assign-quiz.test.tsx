// __tests__/plays-assign-quiz.test.tsx
// Setting a play for a team from the assignment form (the play picker sets
// play_id and links to the play; Pro plays are listed but locked on Free),
// and the role quiz a player then takes: tap a spot, see the right one and
// why, and the attempt is sent to the server at the end.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { LIBRARY_PLAYS } from '@/data/plays/library';
import { buildQuiz } from '@/lib/plays/quiz';

const calls = vi.hoisted(() => ({
  inserts: [] as Array<Record<string, unknown>>,
  insertError: null as null | { message: string; hint?: string },
  submitted: [] as unknown[],
  tracked: [] as string[],
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined, push: () => undefined }) }));
vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/events', () => ({ track: (name: string) => calls.tracked.push(name) }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: () => ({
      insert: async (row: Record<string, unknown>) => {
        calls.inserts.push(row);
        return { error: calls.insertError };
      },
    }),
  }),
}));
vi.mock('@/app/(app)/plays/actions', () => ({
  submitQuizAttempt: async (playId: string, picks: unknown) => {
    calls.submitted.push({ playId, picks });
    return { ok: true, score: 2, of: 3, knowsIt: true };
  },
}));

import { PostAssignment, type PlayChoice } from '@/app/(app)/coach/assignments/PostAssignment';
import { PlayQuiz } from '@/components/plays/PlayQuiz';

const TEAMS = [{ id: 't1', name: 'U14 Girls' }];
const PLAYS: PlayChoice[] = [
  { id: 'p-own', title: 'Horns flare', group: 'Your plays' },
  { id: 'p-lib', title: 'Give-and-go', group: 'Library' },
  { id: 'p-pro', title: 'Floppy', group: 'Library', locked: true },
];

beforeEach(() => {
  calls.inserts = [];
  calls.insertError = null;
  calls.submitted = [];
  calls.tracked = [];
});

describe('setting a play from the assignment form', () => {
  it('sets play_id and links to the play, with a title that names it', async () => {
    render(<PostAssignment teams={TEAMS} defaultTeam={null} myId="coach-1" plays={PLAYS} />);
    fireEvent.change(screen.getByLabelText('Play to learn'), { target: { value: 'p-own' } });
    expect((screen.getByLabelText('Assignment title') as HTMLInputElement).value).toBe('Learn the play: Horns flare');
    expect(screen.queryByLabelText('Link')).toBeNull();
    expect(screen.getByText('Opens the play')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Post to the whole team' }));
    await screen.findByText(/Posted to U14 Girls/);
    expect(calls.inserts[0]).toMatchObject({ team_id: 't1', created_by: 'coach-1', play_id: 'p-own', link: '/plays/p-own', title: 'Learn the play: Horns flare' });
  });

  it('starts on the play a coach came from ("Assign to team")', () => {
    render(<PostAssignment teams={TEAMS} defaultTeam="t1" myId="coach-1" plays={PLAYS} defaultPlay="p-lib" />);
    expect((screen.getByLabelText('Play to learn') as HTMLSelectElement).value).toBe('p-lib');
  });

  it('lists a Pro play on Free but will not let it be picked', () => {
    render(<PostAssignment teams={TEAMS} defaultTeam={null} myId="coach-1" plays={PLAYS} defaultPlay="p-pro" />);
    const option = screen.getByRole('option', { name: 'Floppy (Pro)' }) as HTMLOptionElement;
    expect(option.disabled).toBe(true);
    expect((screen.getByLabelText('Play to learn') as HTMLSelectElement).value).toBe('');
  });

  it('sends no play_id at all for an ordinary assignment, so it still posts before 00061 runs', async () => {
    render(<PostAssignment teams={TEAMS} defaultTeam={null} myId="coach-1" plays={PLAYS} />);
    fireEvent.change(screen.getByLabelText('Assignment title'), { target: { value: '200 makes' } });
    fireEvent.click(screen.getByRole('button', { name: 'Post to the whole team' }));
    await screen.findByText(/Posted to/);
    expect(calls.inserts[0]).not.toHaveProperty('play_id');
    expect(calls.inserts[0].link).toBeNull();
  });

  it('explains when the database refuses a Pro play', async () => {
    calls.insertError = { message: 'This play is part of Deadeye Pro', hint: 'pro_play' };
    render(<PostAssignment teams={TEAMS} defaultTeam={null} myId="coach-1" plays={PLAYS} defaultPlay="p-lib" />);
    fireEvent.click(screen.getByRole('button', { name: 'Post to the whole team' }));
    expect(await screen.findByText(/can only be added or set by a coach with Pro/)).toBeTruthy();
  });
});

describe('the role quiz', () => {
  const play = LIBRARY_PLAYS.find((p) => p.slug === 'four-out-one-in')!;
  const questions = buildQuiz(play.diagram);

  it('asks where you go, answered by tapping a named spot, then shows the right spot and why', () => {
    render(<PlayQuiz playId="p1" title={play.title} diagram={play.diagram} questions={questions} />);
    expect(screen.getByRole('heading', { name: "You're 1. In step 2, where do you go?" })).toBeTruthy();
    expect(screen.getAllByRole('button', { name: /^the / })).toHaveLength(15);
    fireEvent.click(screen.getByRole('button', { name: 'the right wing' }));
    expect(screen.getByText('Not quite: you go to the basket.')).toBeTruthy();
    expect(screen.getByText(/^Cut to the basket\./)).toBeTruthy();
    expect((screen.getByRole('button', { name: 'the left wing' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('sends the picks at the end and says whether you know the play', async () => {
    render(<PlayQuiz playId="p1" title={play.title} diagram={play.diagram} questions={questions} />);
    fireEvent.click(screen.getByRole('button', { name: 'the basket' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    fireEvent.click(screen.getByRole('button', { name: 'the left block' }));
    fireEvent.click(screen.getByRole('button', { name: 'Next question' }));
    fireEvent.click(screen.getByRole('button', { name: 'the top' }));
    fireEvent.click(screen.getByRole('button', { name: 'See how you did' }));
    expect(screen.getByText('2/3')).toBeTruthy();
    expect(screen.getByText(/You know this play/)).toBeTruthy();
    await vi.waitFor(() => expect(calls.tracked).toEqual(['play_quiz_done']));
    expect(calls.submitted).toEqual([
      {
        playId: 'p1',
        picks: [
          { key: 'o1:2', pick: 'basket' },
          { key: 'o5:3', pick: 'left-block' },
          { key: 'o2:6', pick: 'top' },
        ],
      },
    ]);
  });
});
