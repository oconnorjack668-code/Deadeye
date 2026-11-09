// E4 of the activation backlog (docs/agent-os/backlog.md): the reminders card on
// the dashboard asks its own question, and saving training days leaves one marker.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const tracked = vi.hoisted(() => [] as string[]);
const saveError = vi.hoisted(() => ({ value: null as { message: string } | null }));
vi.mock('@/lib/events', () => ({ track: (name: string) => tracked.push(name) }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => {
    const query: Record<string, unknown> = {};
    for (const m of ['select', 'eq']) query[m] = () => query;
    query.maybeSingle = async () => ({ data: null, error: null });
    query.update = () => ({ eq: async () => ({ error: saveError.value }) });
    return {
      auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
      from: () => query,
    };
  },
}));

import { RemindersCard } from '@/app/(app)/profile/RemindersCard';

beforeEach(() => {
  tracked.length = 0;
  saveError.value = null;
  // jsdom has no push support: the card needs these to show its day buttons
  Object.defineProperty(navigator, 'serviceWorker', {
    configurable: true,
    value: { getRegistration: async () => undefined },
  });
  Object.defineProperty(window, 'PushManager', { configurable: true, value: class {} });
  Object.defineProperty(window, 'Notification', { configurable: true, value: class {} });
});

describe('RemindersCard', () => {
  it('shows the question it is given in place of the usual line', async () => {
    render(<RemindersCard showWeekly={false} description="When do you next train? Pick your days." />);
    await waitFor(() => expect(screen.getByText('When do you next train? Pick your days.')).toBeTruthy());
    expect(screen.queryByText(/only if you haven.t trained yet/i)).toBeNull();
  });

  it('keeps the usual line when none is given', async () => {
    render(<RemindersCard showWeekly={false} />);
    await waitFor(() => expect(screen.getByText(/only if you haven.t trained yet/i)).toBeTruthy());
  });

  it('records reminder_set when a training day is saved', async () => {
    render(<RemindersCard showWeekly={false} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tue' }));
    await waitFor(() => expect(tracked).toEqual(['reminder_set']));
  });

  it('records nothing when the save fails', async () => {
    saveError.value = { message: 'offline' };
    render(<RemindersCard showWeekly={false} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tue' }));
    await screen.findByText(/could not save/i);
    expect(tracked).toEqual([]);
  });
});
