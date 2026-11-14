// __tests__/film-pages.test.tsx
// The F3 pages with the Supabase fake: the Film library (themes, Pro tags,
// free packs, "From your coach", Continue), a clip page (locked on Free,
// open with Pro, open when the coach set it, notes, coach tools), a pack
// page, the head coach's progress view for film (statuses and scores and
// totals, never anyone's own answers; assistants see neither), and the
// assignment form's film picker.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
vi.mock('@/app/(app)/film/actions', () => ({
  submitFilmAttempt: async () => ({ ok: true, score: 0, total: 0 }),
  saveFilmNote: async () => ({ ok: true }),
  createPack: async () => ({ ok: true, id: 'x' }),
  addClipToPack: async () => ({ ok: true }),
  removeClipFromPack: async () => ({ ok: true }),
  deletePack: async () => ({ ok: true }),
}));
vi.mock('@/lib/auth', () => ({
  requireUser: async () => ({ id: auth.id }),
  getHasPro: async () => auth.pro,
}));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => fakeClient(db.state) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => fakeClient(db.state) }));

import FilmPage from '@/app/(app)/film/page';
import FilmClipPage from '@/app/(app)/film/[id]/page';
import FilmPackPage from '@/app/(app)/film/packs/[id]/page';
import ProgressPage from '@/app/(app)/coach/assignments/[id]/page';
import { PostAssignment, type FilmChoice } from '@/app/(app)/coach/assignments/PostAssignment';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const FREE = id(1);
const PRO = id(2);
const IN_FREE_PACK = id(3);
const PACK = id(50);
const PRO_PACK = id(51);
const ASSIGNMENT = id(90);

const question = (key: string, moment_s: number) => ({
  key,
  question: `Read ${key}?`,
  options: ['Help', 'Stay'],
  correct_index: 0,
  explanation: 'Because.',
  moment_s,
});
const clip = (n: number, title: string, theme: string, is_free: boolean) => ({
  id: id(n),
  youtube_video_id: `abcdefghij${n}`,
  start_s: 0,
  end_s: 30,
  title,
  channel_name: 'Official League',
  theme,
  level: 'beginner',
  questions: [question('q1', 10), question('q2', 20)],
  is_free,
});

function library(): FakeState {
  const s = fakeState();
  s.tables.film_clips = [clip(1, 'Help from the gap', 'help_defence', true), clip(2, 'Spacing on the drive', 'spacing', false), clip(3, 'Reading the hedge', 'pick_and_roll', false)];
  s.tables.film_packs = [
    { id: PACK, owner_id: null, title: 'Start here', description: 'The basics.', is_free: true },
    { id: PRO_PACK, owner_id: null, title: 'Advanced reads', description: '', is_free: false },
  ];
  s.tables.film_pack_clips = [
    { pack_id: PACK, clip_id: FREE, position: 0 },
    { pack_id: PACK, clip_id: IN_FREE_PACK, position: 1 },
    { pack_id: PRO_PACK, clip_id: PRO, position: 0 },
  ];
  return s;
}

beforeEach(() => {
  auth.id = 'user-1';
  auth.pro = false;
  db.state = library();
});

const renderFilm = async (params: Record<string, string> = {}) => render(await FilmPage({ searchParams: Promise.resolve(params) }));
const renderClip = async (clipId: string) => render(await FilmClipPage({ params: Promise.resolve({ id: clipId }) }));

describe('/film', () => {
  it('lists clips by theme, tags Pro clips on Free, and opens clips in a free pack', async () => {
    await renderFilm();
    expect(screen.getByRole('heading', { name: 'Spacing' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Help defence' })).toBeTruthy();
    const pro = screen.getByRole('link', { name: /Spacing on the drive/ });
    expect(within(pro).getByText('Pro')).toBeTruthy();
    expect(within(screen.getByRole('link', { name: /Reading the hedge/ })).queryByText('Pro')).toBeNull();
    expect(within(screen.getByRole('link', { name: /Help from the gap/ })).queryByText('Pro')).toBeNull();
    expect(screen.getByRole('link', { name: /Start here/ }).getAttribute('href')).toBe(`/film/packs/${PACK}`);
    expect(screen.getByText(/1 clip is free, and so are the free packs/)).toBeTruthy();
    expect(screen.queryByText('Clips are on the way')).toBeNull();
  });

  it('filters by theme and level, and says when nothing is saved yet', async () => {
    await renderFilm({ theme: 'spacing' });
    expect(screen.queryByRole('link', { name: /Help from the gap/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Spacing on the drive/ })).toBeTruthy();
    document.body.innerHTML = '';
    await renderFilm({ saved: '1' });
    expect(screen.getByText(/You have not saved a clip yet/)).toBeTruthy();
  });

  it('puts film from the coach first, opens it even when Pro, and tells the player what the coach sees', async () => {
    db.state.tables.team_members = [{ user_id: 'user-1', team_id: 't1', role: 'player' }];
    db.state.tables.team_assignments = [{ id: ASSIGNMENT, team_id: 't1', title: 'Watch: Spacing', due_date: null, film_clip_id: PRO, film_pack_id: null, created_at: '2026-11-10' }];
    await renderFilm();
    const coach = screen.getByRole('heading', { name: 'From your coach' }).closest('section')!;
    expect(within(coach).getByRole('link', { name: /Spacing on the drive/ }).getAttribute('href')).toBe(`/film/${PRO}`);
    expect(within(coach).getByText('Your coach sees whether you did it and whether you got it right.')).toBeTruthy();
    const listed = screen.getAllByRole('link', { name: /Spacing on the drive/ }).find((l) => !coach.contains(l))!;
    expect(within(listed).queryByText('Pro')).toBeNull();
  });

  it('shows a pack part way through under Continue, pointing at the next clip', async () => {
    db.state.tables.film_attempts = [{ user_id: 'user-1', clip_id: FREE, score: 2, total: 2 }];
    await renderFilm();
    const going = screen.getByRole('heading', { name: 'Continue' }).closest('section')!;
    const link = within(going).getByRole('link', { name: /Start here/ });
    expect(link.getAttribute('href')).toBe(`/film/${IN_FREE_PACK}`);
    expect(link.textContent).toMatch(/1 of 2 clips done/);
  });
});

describe('/film/[id]', () => {
  it('locks a Pro clip on Free: no video, no notes', async () => {
    await renderClip(PRO);
    expect(screen.getByText('This clip is part of Pro')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Play video/ })).toBeNull();
    expect(screen.queryByLabelText('Your notes')).toBeNull();
  });

  it('opens a Pro clip with Pro: the tap card, where it is from, save and private notes', async () => {
    auth.pro = true;
    db.state.tables.film_notes = [{ user_id: 'user-1', clip_id: PRO, body: 'Watch the low man' }];
    await renderClip(PRO);
    expect(screen.getByRole('button', { name: 'Play video: Spacing on the drive' })).toBeTruthy();
    expect(screen.getByText('Video from Official League on YouTube.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save this clip' })).toBeTruthy();
    expect((screen.getByLabelText('Your notes') as HTMLTextAreaElement).value).toBe('Watch the low man');
    expect(screen.getByText('Only you can see these.')).toBeTruthy();
    expect(screen.queryByText(/Your coach sees/)).toBeNull();
  });

  it('opens a Pro clip on Free when the coach set it, in a pack, and says the coach sees the result', async () => {
    db.state.tables.film_packs.push({ id: id(60), owner_id: 'coach-1', title: 'Coach pack', description: '', is_free: false });
    db.state.tables.film_pack_clips.push({ pack_id: id(60), clip_id: PRO, position: 0 });
    db.state.tables.team_assignments = [{ id: ASSIGNMENT, team_id: 't1', title: 'Watch', film_pack_id: id(60), film_clip_id: null }];
    await renderClip(PRO);
    expect(screen.getByRole('button', { name: /Play video/ })).toBeTruthy();
    expect(screen.getByText('Your coach sees whether you did it and whether you got it right.')).toBeTruthy();
  });

  it('opens a Pro clip that is in a free library pack', async () => {
    await renderClip(IN_FREE_PACK);
    expect(screen.getByRole('button', { name: /Play video/ })).toBeTruthy();
  });

  it('gives a coach Add to pack and Assign to team', async () => {
    db.state.tables.team_members = [{ user_id: 'user-1', team_id: 't1', role: 'coach', teams: { id: 't1', name: 'U14 Girls' } }];
    db.state.tables.film_packs.push({ id: id(61), owner_id: 'user-1', title: 'My pack', description: '', is_free: false });
    await renderClip(FREE);
    expect(screen.getByRole('link', { name: /Assign to team/ }).getAttribute('href')).toBe(`/coach/assignments?team=t1&clip=${FREE}`);
    const pick = screen.getByLabelText('Add to a pack') as HTMLSelectElement;
    expect([...pick.options].map((o) => o.textContent)).toEqual(['My pack', 'A new pack']);
  });

  it('is not found for a clip that is not published (row-level security returns nothing) or a bad id', async () => {
    await expect(FilmClipPage({ params: Promise.resolve({ id: id(99) }) })).rejects.toThrow('notFound');
    await expect(FilmClipPage({ params: Promise.resolve({ id: 'nope' }) })).rejects.toThrow('notFound');
  });
});

describe('/film/packs/[id]', () => {
  it('lists the clips in order, with the ones done ticked', async () => {
    db.state.tables.film_attempts = [{ user_id: 'user-1', clip_id: FREE }];
    render(await FilmPackPage({ params: Promise.resolve({ id: PACK }) }));
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([expect.stringMatching(/^1Help from the gap.*Done/), expect.stringMatching(/^2Reading the hedge/)]);
  });

  it('locks a Pro library pack on Free', async () => {
    render(await FilmPackPage({ params: Promise.resolve({ id: PRO_PACK }) }));
    expect(screen.getByText('This pack is part of Pro')).toBeTruthy();
    expect(screen.queryByRole('link', { name: /Spacing on the drive/ })).toBeNull();
  });
});

describe('/coach/assignments/[id] for film', () => {
  function setUp(role: 'coach' | 'assistant') {
    db.state.tables.team_assignments = [
      { id: ASSIGNMENT, team_id: 't1', title: 'Watch: Start here', due_date: '2026-11-20', created_at: '2026-11-10T00:00:00Z', play_id: null, film_clip_id: null, film_pack_id: PACK },
    ];
    db.state.tables.team_members = [{ team_id: 't1', user_id: 'user-1', role }];
    db.state.tables.teams = [{ id: 't1', name: 'U14 Girls' }];
    db.state.rpc.team_roster = [
      { user_id: 'p1', display_name: 'Aoife', role: 'player' },
      { user_id: 'p2', display_name: 'Ciara', role: 'player' },
      { user_id: 'user-1', display_name: 'Coach', role },
    ];
    db.state.tables.film_attempts = [
      { user_id: 'p1', clip_id: FREE, score: 1, total: 2, completed_at: '2026-11-11T00:00:00Z' },
      { user_id: 'p1', clip_id: IN_FREE_PACK, score: 2, total: 2, completed_at: '2026-11-11T00:00:00Z' },
    ];
    db.state.rpc.film_assignment_split = [
      { clip_id: FREE, question_key: 'q1', pick: '0', players: 1 },
      { clip_id: FREE, question_key: 'q1', pick: '1', players: 0 },
    ];
  }

  it('shows a head coach each player done or not with their score, and the team split as totals', async () => {
    setUp('coach');
    render(await ProgressPage({ params: Promise.resolve({ id: ASSIGNMENT }) }));
    const aoife = screen.getByText('Aoife').closest('li')!;
    expect(aoife.textContent).toMatch(/3 of 4 right/);
    expect(aoife.textContent).toMatch(/Done/);
    expect(screen.getByText('Ciara').closest('li')!.textContent).toMatch(/Not started/);
    expect(screen.getByRole('heading', { name: 'How the team answered' })).toBeTruthy();
    expect(screen.getByText(/Nobody's own answers are shown/)).toBeTruthy();
    expect(screen.getAllByText('1 of 1').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'Open Start here' }).getAttribute('href')).toBe(`/film/packs/${PACK}`);
  });

  it('shows an assistant that it was set, not who did it', async () => {
    setUp('assistant');
    render(await ProgressPage({ params: Promise.resolve({ id: ASSIGNMENT }) }));
    expect(screen.getByText(/Head coaches see who has watched the film/)).toBeTruthy();
    expect(screen.queryByText('Aoife')).toBeNull();
  });
});

describe('PostAssignment with film', () => {
  const FILM: FilmChoice[] = [
    { id: id(61), kind: 'pack', title: 'My pack', group: 'Your packs' },
    { id: FREE, kind: 'clip', title: 'Help from the gap', group: 'Clips' },
    { id: PRO, kind: 'clip', title: 'Spacing on the drive', group: 'Clips', locked: true },
  ];

  it('starts on the clip from Assign to team, and posts it with its link', async () => {
    render(<PostAssignment teams={[{ id: 't1', name: 'U14 Girls' }]} defaultTeam="t1" myId="coach-1" film={FILM} defaultFilm={{ kind: 'clip', id: FREE }} />);
    expect((screen.getByLabelText('Assignment title') as HTMLInputElement).value).toBe('Watch: Help from the gap');
    expect(screen.getByText('Opens the clip')).toBeTruthy();
    fireEvent.submit(screen.getByRole('button', { name: 'Post to the whole team' }).closest('form')!);
    await vi.waitFor(() => expect(db.state.writes).toHaveLength(1));
    expect(db.state.writes[0].values).toMatchObject({ team_id: 't1', film_clip_id: FREE, link: `/film/${FREE}` });
    expect(db.state.writes[0].values).not.toHaveProperty('play_id');
  });

  it('lists Pro film as locked for a coach on Free, and a pack sets film_pack_id', async () => {
    render(<PostAssignment teams={[{ id: 't1', name: 'U14 Girls' }]} defaultTeam="t1" myId="coach-1" film={FILM} />);
    const pick = screen.getByLabelText('Film to watch') as HTMLSelectElement;
    const pro = [...pick.options].find((o) => o.textContent === 'Spacing on the drive (Pro)')!;
    expect(pro.disabled).toBe(true);
    fireEvent.change(pick, { target: { value: `pack:${id(61)}` } });
    expect((screen.getByLabelText('Assignment title') as HTMLInputElement).value).toBe('Watch: My pack');
    fireEvent.submit(pick.closest('form')!);
    await vi.waitFor(() => expect(db.state.writes).toHaveLength(1));
    expect(db.state.writes[0].values).toMatchObject({ film_pack_id: id(61), link: `/film/packs/${id(61)}` });
  });
});
