// __tests__/welcome-activation.test.tsx
// E2 and E3 of the activation backlog (docs/agent-os/backlog.md): a player away
// from a court can log a session they already trained from the welcome screen and
// from the end of the sample, and the welcome answer is recorded so a stall there
// shows in the funnel.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const tracked = vi.hoisted(() => [] as string[]);
vi.mock('@/lib/events', () => ({
  track: (name: string) => tracked.push(name),
  trackIfFromDemo: () => undefined,
}));
vi.mock('@/app/(app)/profile/RemindersCard', () => ({ RemindersCard: () => <div>reminders</div> }));
// The tracker is not under test: a stand-in that finishes the sample when pressed
vi.mock('@/components/video/ShotTracker', () => ({
  ShotTracker: ({ sample }: { sample: { onFinished?: (c: { makes: number; attempts: number }) => void } }) => (
    <button onClick={() => sample.onFinished?.({ makes: 4, attempts: 6 })}>finish the sample</button>
  ),
}));
vi.mock('@/lib/video/sampleClip', () => ({
  SAMPLE_POSTER: '/poster.jpg',
  SAMPLE_RIM: { x: 0.5, y: 0.2, width: 0.05, tilt: 0 },
  SAMPLE_TRUTH: { makes: 4, attempts: 6 },
  downloadSample: async () => 'blob:sample',
}));

import { WelcomeClient } from '@/app/(app)/welcome/WelcomeClient';
import { SampleClient } from '@/app/(app)/welcome/sample/SampleClient';

const hrefOf = (name: RegExp) => (screen.getByRole('link', { name }) as HTMLAnchorElement).getAttribute('href');

beforeEach(() => {
  tracked.length = 0;
  localStorage.clear();
});

describe('the welcome screen', () => {
  it('records that they saw it, then which answer they gave', () => {
    render(<WelcomeClient firstName="Sam" />);
    expect(tracked).toEqual(['welcome_seen']);
    fireEvent.click(screen.getByRole('button', { name: /not right now/i }));
    expect(tracked).toEqual(['welcome_seen', 'welcome_later']);
  });

  it('records the court answer too', () => {
    render(<WelcomeClient firstName={null} />);
    fireEvent.click(screen.getByRole('button', { name: /i'm at a court/i }));
    expect(tracked).toEqual(['welcome_seen', 'welcome_court']);
  });

  it('offers to log a session already trained, by hand, on the not-right-now branch (E2)', () => {
    render(<WelcomeClient firstName="Sam" />);
    expect(screen.queryByRole('link', { name: /trained today already/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /not right now/i }));
    expect(hrefOf(/trained today already/i)).toBe('/basketball/new');
  });

  it('does not push the by-hand link at a player who is at a court', () => {
    render(<WelcomeClient firstName="Sam" />);
    fireEvent.click(screen.getByRole('button', { name: /i'm at a court/i }));
    // The court branch already offers by hand as the second choice, under the camera
    expect(screen.queryByRole('link', { name: /trained today already/i })).toBeNull();
    expect(hrefOf(/log shots by hand instead/i)).toBe('/basketball/new');
  });
});

describe('the end of the sample', () => {
  it('offers the tracker, logging by hand, and the dashboard once it has been watched (E2)', async () => {
    render(<SampleClient />);
    fireEvent.click(await screen.findByRole('button', { name: /finish the sample/i }));
    await waitFor(() => expect(screen.getByRole('link', { name: /open the tracker/i })).toBeTruthy());
    expect(hrefOf(/open the tracker/i)).toBe('/video');
    expect(hrefOf(/log shots by hand/i)).toBe('/basketball/new');
    expect(hrefOf(/back to my dashboard/i)).toBe('/dashboard');
  });
});
