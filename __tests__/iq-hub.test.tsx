// __tests__/iq-hub.test.tsx
// The IQ tab is now three parts, Lessons, Film and Plays. The IQ tab in the
// bottom bar stays lit across all of them, and Film says plainly that clips
// are not here yet (no made-up content).
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('@/lib/auth', () => ({ requireUser: async () => ({ id: 'user-1' }) }));

import { NAV_ITEMS, DESKTOP_NAV_ITEMS, isNavActive } from '@/components/layout/BottomNav';
import FilmPage from '@/app/(app)/film/page';

describe('the IQ tab in the navigation', () => {
  const iq = NAV_ITEMS.find((i) => i.label === 'IQ')!;
  const desktopIq = DESKTOP_NAV_ITEMS.find((i) => i.href === '/study')!;

  it.each(['/study', '/study/abc', '/film', '/film/abc', '/plays', '/plays/abc', '/film-questions'])('is lit on %s', (path) => {
    expect(isNavActive(path, iq.match)).toBe(true);
    expect(isNavActive(path, desktopIq.match)).toBe(true);
  });

  it('is not lit on other tabs', () => {
    expect(isNavActive('/drills', iq.match)).toBe(false);
    expect(isNavActive('/filmstrip', iq.match)).toBe(false);
  });
});

describe('the Film part of the IQ tab', () => {
  it('says film is coming, shows the IQ tabs, and links to asking a coach', async () => {
    render(await FilmPage());
    const tabs = screen.getByRole('navigation', { name: 'Basketball IQ' });
    expect(within(tabs).getByRole('link', { name: 'Film' }).getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('Film is on the way')).toBeTruthy();
    expect(screen.getByRole('link', { name: /Was that the right read/ }).getAttribute('href')).toBe('/film-questions');
  });
});
