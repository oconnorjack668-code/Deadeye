// __tests__/dashboard-seen.test.tsx
// E6 of the activation backlog (docs/agent-os/backlog.md): a player with no
// saved session who opens the dashboard is recorded once, with nothing on
// screen, so the funnel shows whether players who stalled after setup come back.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';

const tracked = vi.hoisted(() => [] as string[]);
vi.mock('@/lib/events', async (importActual) => ({
  ...(await importActual<typeof import('@/lib/events')>()),
  track: (name: string) => tracked.push(name),
}));

import { DashboardSeen } from '@/app/(app)/dashboard/DashboardSeen';
import { isEventName } from '@/lib/events';

beforeEach(() => {
  tracked.length = 0;
});

describe('the dashboard marker for a player with no session', () => {
  it('records dashboard_seen once when the dashboard opens, and shows nothing', () => {
    const { container, rerender } = render(<DashboardSeen />);
    rerender(<DashboardSeen />);
    expect(tracked).toEqual(['dashboard_seen']);
    expect(container.innerHTML).toBe('');
  });

  it('is a step the events route accepts, so the row is kept rather than refused', () => {
    expect(isEventName('dashboard_seen')).toBe(true);
  });
});
