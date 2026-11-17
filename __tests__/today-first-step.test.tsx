// The Today card for a player with no session: one button, quiet links, and a
// marker for whichever way in the player taps (src/components/TodayFirstStep.tsx).
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const tracked = vi.hoisted(() => [] as string[]);
vi.mock('@/lib/events', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/events')>()),
  track: (name: string) => tracked.push(name),
}));
vi.mock('next/link', () => ({
  default: ({ href, children, onClick, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a
      href={href}
      {...rest}
      onClick={(e) => {
        e.preventDefault();
        onClick?.(e);
      }}
    >
      {children}
    </a>
  ),
}));

import { TodayFirstStep } from '@/components/TodayFirstStep';
import { EVENT_NAMES } from '@/lib/events';
import { readFileSync } from 'node:fs';

beforeEach(() => {
  tracked.length = 0;
});

function renderCard() {
  render(<TodayFirstStep programHref="/programs?goal=shooting" programLabel="see shooting programs" />);
}

describe('TodayFirstStep', () => {
  it('has one main action, Log shots, and it comes first', () => {
    renderCard();
    const links = screen.getAllByRole('link');
    expect(links[0].textContent).toBe('Log shots');
    expect(links[0].getAttribute('href')).toBe('/basketball/new');
    // The main action is the only one styled as a button
    expect(links.filter((l) => l.className.includes('bg-orange-600'))).toHaveLength(1);
    // 44px tap target, and no button nested inside the link
    expect(links[0].className).toContain('h-11');
    expect(links[0].querySelector('button')).toBeNull();
  });

  it('keeps the camera and programs as quiet links', () => {
    renderCard();
    expect(screen.getByRole('link', { name: 'track with the camera' }).getAttribute('href')).toBe('/video');
    expect(screen.getByRole('link', { name: 'see shooting programs' }).getAttribute('href')).toBe('/programs?goal=shooting');
  });

  it('records which way in the player tapped', () => {
    renderCard();
    fireEvent.click(screen.getByRole('link', { name: 'Log shots' }));
    fireEvent.click(screen.getByRole('link', { name: 'track with the camera' }));
    fireEvent.click(screen.getByRole('link', { name: 'see shooting programs' }));
    expect(tracked).toEqual(['today_log_tapped', 'today_track_tapped', 'today_program_tapped']);
  });

  it('every marker is in the owner funnel query', () => {
    const sql = readFileSync('docs/funnel-counts.sql', 'utf8');
    for (const name of ['today_log_tapped', 'today_track_tapped', 'today_program_tapped', 'video_opened'] as const) {
      expect(EVENT_NAMES).toContain(name);
      expect(sql).toContain(`'${name}'`);
    }
  });
});
