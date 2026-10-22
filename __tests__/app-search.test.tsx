// __tests__/app-search.test.tsx
// The search screen from the top bar: suggestions before typing, things to do
// as you type, content from /api/search, the keyboard, and recent picks kept
// on the phone.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }), usePathname: () => '/dashboard' }));

import { AppSearch } from '@/components/search/AppSearch';

const fetchMock = vi.fn();

beforeEach(() => {
  localStorage.clear();
  push.mockReset();
  fetchMock.mockReset().mockResolvedValue({
    ok: true,
    json: async () => ({ groups: [{ id: 'drills', title: 'Drills', results: [{ title: 'Mikan drill', hint: 'Finishing drill', href: '/drills/mikan' }] }] }),
  });
  vi.stubGlobal('fetch', fetchMock);
});

function openSearch() {
  render(<AppSearch mode="playing" isOwner={false} />);
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  return screen.getByRole('combobox');
}

describe('AppSearch', () => {
  it('suggests where to start before anything is typed', () => {
    openSearch();
    expect(screen.getByText('Suggestions')).toBeTruthy();
    expect(screen.getByRole('option', { name: /Log shots/ })).toBeTruthy();
  });

  it('finds a thing to do as you type, and Enter goes there', () => {
    const box = openSearch();
    fireEvent.change(box, { target: { value: 'camera' } });
    expect(screen.getAllByRole('option')[0].textContent).toContain('Track shots with the camera');
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/video?tab=shots');
  });

  it('adds drills and the rest from the server, and the arrow keys move through them', async () => {
    const box = openSearch();
    fireEvent.change(box, { target: { value: 'mikan' } });
    await screen.findByRole('option', { name: /Mikan drill/ });
    expect(fetchMock).toHaveBeenCalledWith('/api/search?q=mikan&mode=playing', expect.anything());
    fireEvent.keyDown(box, { key: 'ArrowDown' });
    fireEvent.keyDown(box, { key: 'Enter' });
    expect(push).toHaveBeenCalledWith('/drills/mikan');
  });

  it('remembers what was picked, on this phone, for next time', () => {
    const box = openSearch();
    fireEvent.change(box, { target: { value: 'streak' } });
    fireEvent.click(screen.getByRole('option', { name: /Streaks/ }));
    expect(JSON.parse(localStorage.getItem('deadeye-recent-searches')!)[0].href).toBe('/streak');

    fireEvent.click(screen.getByRole('button', { name: 'Search' }));
    expect(screen.getByText('Recent')).toBeTruthy();
    expect(screen.getByRole('option', { name: /Streaks/ })).toBeTruthy();
  });

  it('says so when nothing matches', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ groups: [] }) });
    const box = openSearch();
    fireEvent.change(box, { target: { value: 'zzzz' } });
    await screen.findByText(/Nothing for/);
  });

  it('closes with Escape, and opens with / when not typing', () => {
    const box = openSearch();
    fireEvent.keyDown(box, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.keyDown(window, { key: '/' });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });
});
