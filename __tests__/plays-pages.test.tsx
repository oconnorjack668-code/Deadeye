// __tests__/plays-pages.test.tsx
// The plays library (/plays) and a play's page (/plays/[id]) as a player sees
// them: plays grouped by type, the filters, Pro plays tagged and locked on
// Free but open with Pro, and a play's court, steps and coaching points.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { LIBRARY_PLAYS } from '@/data/plays/library';

const rows = LIBRARY_PLAYS.map((p, i) => ({
  id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
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
const idOf = (slug: string) => rows[LIBRARY_PLAYS.findIndex((p) => p.slug === slug)].id;

const state = vi.hoisted(() => ({ pro: false, saved: [] as string[] }));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('notFound');
  },
  useRouter: () => ({ refresh: () => undefined }),
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
vi.mock('@/lib/auth', () => ({
  requireUser: async () => ({ id: 'user-1' }),
  getHasPro: async () => state.pro,
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      const filters: Array<[string, unknown]> = [];
      const result = () => {
        let data: Array<Record<string, unknown>> =
          table === 'plays' ? rows : table === 'play_saves' ? state.saved.map((play_id) => ({ play_id, user_id: 'user-1' })) : [];
        for (const [col, value] of filters) data = data.filter((r) => r[col] === value);
        return data;
      };
      const q = {
        select: () => q,
        eq: (col: string, value: unknown) => {
          filters.push([col, value]);
          return q;
        },
        is: (col: string, value: unknown) => {
          filters.push([col, value]);
          return q;
        },
        // Team lookups (00061): this player is on no team, so these find nothing
        in: () => q,
        limit: () => q,
        order: () => q,
        maybeSingle: async () => ({ data: result()[0] ?? null, error: null }),
        then: (resolve: (v: unknown) => void) => resolve({ data: result(), error: null }),
      };
      return q;
    },
  }),
}));

import PlaysPage from '@/app/(app)/plays/page';
import PlayPage from '@/app/(app)/plays/[id]/page';

async function renderLibrary(params: Record<string, string> = {}) {
  return render(await PlaysPage({ searchParams: Promise.resolve(params) }));
}

async function renderPlay(id: string) {
  return render(await PlayPage({ params: Promise.resolve({ id }) }));
}

beforeEach(() => {
  state.pro = false;
  state.saved = [];
});

describe('the plays library', () => {
  it('sits under the IQ tab, with Plays as the current part', async () => {
    await renderLibrary();
    const tabs = screen.getByRole('navigation', { name: 'Basketball IQ' });
    expect(within(tabs).getByRole('link', { name: 'Plays' }).getAttribute('aria-current')).toBe('page');
    expect(within(tabs).getByRole('link', { name: 'Lessons' }).getAttribute('href')).toBe('/study');
    expect(within(tabs).getByRole('link', { name: 'Film' }).getAttribute('href')).toBe('/film');
  });

  it('groups plays by type, principles first', async () => {
    await renderLibrary();
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual(['Principles', 'Half-court sets', 'Pick-and-roll', 'Baseline out of bounds', 'Press breaks']);
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
  });

  it('tags Pro plays on Free, without hiding them, and says how many are free', async () => {
    await renderLibrary();
    const floppy = screen.getByRole('link', { name: /Floppy/ });
    expect(within(floppy).getByText('Pro')).toBeTruthy();
    const giveAndGo = screen.getByRole('link', { name: /Give-and-go/ });
    expect(within(giveAndGo).queryByText('Pro')).toBeNull();
    expect(screen.getByText(/5 plays are free/)).toBeTruthy();
  });

  it('shows no Pro tags with Pro', async () => {
    state.pro = true;
    await renderLibrary();
    expect(screen.queryByText('Pro')).toBeNull();
    expect(screen.queryByText(/plays are free/)).toBeNull();
  });

  it('filters by type', async () => {
    await renderLibrary({ cat: 'blob' });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('link', { name: /Box: baseline out of bounds/ })).toBeTruthy();
  });

  it('filters by age group, keeping plays marked for that grade or younger', async () => {
    await renderLibrary({ age: 'U11' });
    expect(screen.queryByRole('link', { name: /Pick-and-roll: the basics/ })).toBeNull();
    expect(screen.getByRole('link', { name: /Give-and-go/ })).toBeTruthy();
  });

  it('searches titles, descriptions and tags', async () => {
    await renderLibrary({ q: 'high-low' });
    const titles = screen.getAllByRole('listitem').map((li) => li.querySelector('.font-bold')?.textContent);
    expect(titles.sort()).toEqual(['1-4 high: back door, then high-low', 'Horns: ball screen and high-low']);
  });

  it('shows saved plays only, and says so when there are none', async () => {
    await renderLibrary({ saved: '1' });
    expect(screen.getByText(/You have not saved a play yet/)).toBeTruthy();
    state.saved = [idOf('floppy')];
    const { container } = await renderLibrary({ saved: '1' });
    expect(within(container).getAllByRole('listitem')).toHaveLength(1);
  });

  it('ignores filter values it does not know', async () => {
    await renderLibrary({ cat: 'nonsense', age: 'U99' });
    expect(screen.getAllByRole('listitem')).toHaveLength(10);
  });
});

describe('a play page', () => {
  it('shows a free play with its court, steps, coaching points and a save button', async () => {
    await renderPlay(idOf('give-and-go'));
    expect(screen.getByRole('heading', { level: 1, name: 'Give-and-go' })).toBeTruthy();
    expect(screen.getByText('Principles · All ages')).toBeTruthy();
    expect(screen.getByRole('img', { name: /Give-and-go, step 1 of 4: 1 passes to 2/ })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
    expect(screen.getByText('Give (pass), then go (cut) straight away.')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Save this play' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('shows a saved play as saved', async () => {
    state.saved = [idOf('give-and-go')];
    await renderPlay(idOf('give-and-go'));
    expect(screen.getByRole('button', { name: 'Remove from saved plays' }).getAttribute('aria-pressed')).toBe('true');
  });

  it('locks a Pro play on Free: what it is, that it is Pro, and no court', async () => {
    await renderPlay(idOf('floppy'));
    expect(screen.getByText('This play is part of Pro')).toBeTruthy();
    expect(screen.getByRole('link', { name: /See what Pro includes/ })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Play' })).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.queryByRole('button', { name: /Save this play/ })).toBeNull();
  });

  it('opens a Pro play with Pro', async () => {
    state.pro = true;
    await renderPlay(idOf('floppy'));
    expect(screen.queryByText('This play is part of Pro')).toBeNull();
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
  });

  it('is not found for a play that does not exist or an address that is not an id', async () => {
    await expect(renderPlay('00000000-0000-4000-8000-999999999999')).rejects.toThrow('notFound');
    await expect(renderPlay('floppy')).rejects.toThrow('notFound');
  });
});
