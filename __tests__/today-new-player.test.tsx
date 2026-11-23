// Today for a new player (D6, design/2026-11-22-polish.md): the starting-steps
// row that repeated the Today card is gone, the stat tiles say "1 day" and
// "1 zone", the founding offer waits for the first log on Today (the Pro page
// always has it), and the Log menu rows wear their section colours.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';

const pathname = vi.hoisted(() => ({ value: '/dashboard' }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => {}, push: () => {} }),
  usePathname: () => pathname.value,
}));
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

import { plural } from '@/lib/utils';
import { StatCard } from '@/components/StatCard';
import { StarterSteps } from '@/components/StarterSteps';
import { FoundingCard } from '@/components/FoundingCard';
import { QuickLog } from '@/components/layout/QuickLog';
import { foundingCardOnToday, FOUNDING_REMINDER_DAYS, type FoundingState } from '@/lib/founding';

beforeEach(() => {
  cleanup();
  localStorage.clear();
  pathname.value = '/dashboard';
});

describe('singular labels', () => {
  it('says 1 day, 1 zone, 1 session and plural otherwise', () => {
    expect(plural(1, 'day')).toBe('day');
    expect(plural(0, 'day')).toBe('days');
    expect(plural(2, 'zone')).toBe('zones');
    expect(plural(1, 'session')).toBe('session');
  });

  it('the dashboard uses it for every count it shows', () => {
    const page = readFileSync('src/app/(app)/dashboard/page.tsx', 'utf8');
    expect(page).not.toMatch(/zones tracked`/);
    expect(page).not.toMatch(/badge="days"|badge="sessions"/);
    expect(page).toContain("plural(shootingByZone.length, 'zone')");
    expect(page).toContain("plural(metrics.currentStreak, 'day')");
  });

  it('a stat tile shows a white number with its unit right beside it', () => {
    render(<StatCard label="Streak" value={1} badge={plural(1, 'day')} hint="A rest day is safe" />);
    const number = screen.getByText('1');
    expect(number.className).toContain('text-white');
    // Number and unit share one row, with no space-between pushing them apart
    const row = number.parentElement!;
    expect(row.textContent).toBe('1day');
    expect(row.className).not.toContain('justify-between');
  });
});

describe('starting steps for a new player', () => {
  it('drops the "Log your first shots" row while Today asks for it', () => {
    render(<StarterSteps iqDone={false} shotsDone={false} shotsInToday />);
    expect(screen.getByText(/Starting steps · 0 of 4/)).toBeTruthy();
    expect(screen.queryByText('Log your first shots')).toBeNull();
    expect(screen.getByText("Answer today's IQ question")).toBeTruthy();
    expect(screen.getAllByRole('link')).toHaveLength(3);
  });

  it('shows it, ticked, once the first shots are logged', () => {
    render(<StarterSteps iqDone={false} shotsDone shotsInToday={false} />);
    expect(screen.getByText('Log your first shots')).toBeTruthy();
    expect(screen.getByText(/Starting steps · 1 of 4/)).toBeTruthy();
  });

  it('keeps the row when Today is showing something else (a program)', () => {
    render(<StarterSteps iqDone={false} shotsDone={false} shotsInToday={false} />);
    expect(screen.getByRole('link', { name: /Log your first shots/ })).toBeTruthy();
  });
});

describe('founding offer timing (founder, 2026-11-23)', () => {
  const canClaim: FoundingState = { kind: 'can-claim', placesLeft: 80 };

  it('Today hides the offer from a player with no session, and shows it after one', () => {
    expect(foundingCardOnToday(canClaim, false)).toBe(false);
    expect(foundingCardOnToday(canClaim, true)).toBe(true);
  });

  it("still gives a founding member the heads-up in their last week, and nothing before it", () => {
    const until = new Date(Date.now() + 3 * 86_400_000);
    expect(foundingCardOnToday({ kind: 'active', until, daysLeft: FOUNDING_REMINDER_DAYS }, false)).toBe(true);
    expect(foundingCardOnToday({ kind: 'active', until, daysLeft: FOUNDING_REMINDER_DAYS + 1 }, true)).toBe(false);
    expect(foundingCardOnToday({ kind: 'none' }, true)).toBe(false);
  });

  it('the dashboard renders the card only through that rule', () => {
    const page = readFileSync('src/app/(app)/dashboard/page.tsx', 'utf8');
    expect(page).toContain('foundingCardOnToday(founding, hasLogged)');
    expect(page).toMatch(/\{foundingCardShown && <FoundingCard state=\{founding\} where="dashboard"/);
  });

  it('the Pro page shows the offer whatever the player has logged', () => {
    const pro = readFileSync('src/app/(app)/pro/page.tsx', 'utf8');
    expect(pro).not.toContain('foundingCardOnToday');
    expect(pro).toMatch(/<FoundingCard state=\{founding\} where="pro"/);
    render(<FoundingCard state={canClaim} where="pro" />);
    expect(screen.getByText(/Founding member offer/i)).toBeTruthy();
  });
});

describe('Log menu', () => {
  it('the Log button is orange, the action colour', () => {
    render(<QuickLog />);
    const button = screen.getByRole('button', { name: 'Log training' });
    expect(button.className).toContain('bg-orange-600');
    expect(button.className).not.toContain('bg-red-600');
  });

  it('each row keeps its icon and wears its own section colour', () => {
    render(<QuickLog />);
    fireEvent.click(screen.getByRole('button', { name: 'Log training' }));
    const rows = screen.getAllByRole('menuitem');
    expect(rows.map((r) => r.textContent)).toEqual([
      'Hoops sessionDrills and shooting',
      'Gym workoutSets, reps and tests',
      'Track with cameraCounts shots on your phone',
      'Game statsBox score from a real game',
    ]);
    const borders = rows.map((r) => r.className.match(/border-(\w+)-500\/30/)?.[1]);
    expect(borders).toEqual(['orange', 'emerald', 'cyan', 'amber']);
    for (const row of rows) {
      // the section icon tile and the chevron
      expect(row.querySelectorAll('svg')).toHaveLength(2);
      expect(row.className).toContain('min-h-16');
    }
  });
});
