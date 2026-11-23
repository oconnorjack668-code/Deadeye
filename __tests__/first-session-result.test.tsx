// __tests__/first-session-result.test.tsx
// D2: the result after a first save shows the player's own number, the zone
// on the chart, what they earned, and two equal next steps.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/achievements-server', () => ({ loadAchievements: vi.fn() }));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { FirstSessionResultView } from '@/components/basketball/FirstSessionResult';

// CountUp asks about reduced motion; jsdom has no matchMedia. Reduced motion: the final number straight away
window.matchMedia = ((q: string) => ({ matches: true, media: q, addEventListener() {}, removeEventListener() {} })) as unknown as typeof window.matchMedia;

afterEach(cleanup);

const base = {
  sessionId: '1234567890abcdef',
  date: '2026-11-20',
  badge: { title: 'First Session', xp: 50 },
  level: { level: 2, tier: 'Rookie', progress: 0.1, toNext: 68 },
};

describe('first-session result', () => {
  it('shows the score, the percent, and where it came from', () => {
    render(<FirstSessionResultView {...base} zones={[{ zone: 'mid-center', makes: 6, attempts: 10 }]} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('6 of 10 shots, 60%');
    expect(screen.getByText('from Mid top')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Shot chart. Mid top: 60% on 10 shots.' })).toBeTruthy();
  });

  it('counts the spots when the session used more than one', () => {
    render(
      <FirstSessionResultView
        {...base}
        zones={[
          { zone: 'paint', makes: 4, attempts: 5 },
          { zone: 'free-throw', makes: 3, attempts: 5 },
        ]}
      />
    );
    expect(screen.getByText('from 2 spots')).toBeTruthy();
  });

  it('shows the badge and level just earned', () => {
    render(<FirstSessionResultView {...base} zones={[{ zone: 'paint', makes: 1, attempts: 2 }]} />);
    expect(screen.getByText('First Session')).toBeTruthy();
    expect(screen.getByText('+50 XP')).toBeTruthy();
    expect(screen.getByText('68 XP to Level 3')).toBeTruthy();
  });

  it('offers Go again and Done for today at the same size, and a share that opens the sheet', () => {
    render(<FirstSessionResultView {...base} zones={[{ zone: 'paint', makes: 1, attempts: 2 }]} />);
    const again = screen.getByRole('link', { name: 'Go again' });
    const done = screen.getByRole('link', { name: 'Done for today' });
    expect(again.getAttribute('href')).toBe('/basketball/new');
    expect(done.getAttribute('href')).toBe('/dashboard');
    const height = (el: HTMLElement) => el.className.split(' ').filter((c) => /^h-\d+$/.test(c));
    expect(height(again)).toEqual(height(done));
    expect(height(again)).toEqual(['h-13']);
    expect(screen.getByRole('button', { name: 'Share this result' })).toBeTruthy();
  });
});
