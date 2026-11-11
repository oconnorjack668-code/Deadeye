// E4 of the activation backlog (docs/agent-os/backlog.md): the reminders card on
// the dashboard asks its own question, and saving training days leaves one marker.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const tracked = vi.hoisted(() => [] as string[]);
const saveError = vi.hoisted(() => ({ value: null as { message: string } | null }));
const prefs = vi.hoisted(() => ({ value: null as { reminder_enabled: boolean; reminder_days: number[] } | null }));
vi.mock('@/lib/events', () => ({ track: (name: string) => tracked.push(name) }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => {
    const query: Record<string, unknown> = {};
    for (const m of ['select', 'eq']) query[m] = () => query;
    query.maybeSingle = async () => ({ data: prefs.value, error: null });
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
  prefs.value = null;
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

  it('shows the default days as a suggestion while reminders are off', async () => {
    render(<RemindersCard showWeekly={false} />);
    expect(await screen.findByText(/suggested days/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Mon' }).className).toContain('bg-transparent');
  });

  it('says reminders are still off after a day is saved, and records nothing', async () => {
    render(<RemindersCard showWeekly={false} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tue' }));
    expect(await screen.findByText('Saved. Switch on Remind me to get reminders on these days.')).toBeTruthy();
    expect(tracked).toEqual([]);
  });

  it('records reminder_set when Remind me is switched on, and asks for notifications', async () => {
    render(<RemindersCard showWeekly={false} />);
    fireEvent.click(await screen.findByRole('switch', { name: /remind me/i }));
    expect(await screen.findByText('Saved. Turn on notifications on this device to get the reminder.')).toBeTruthy();
    expect(tracked).toEqual(['reminder_set']);
  });

  it('records reminder_set when a day is saved with reminders on, with filled days and no suggestion label', async () => {
    prefs.value = { reminder_enabled: true, reminder_days: [1, 3, 5] };
    render(<RemindersCard showWeekly={false} />);
    const tue = await screen.findByRole('button', { name: 'Tue' });
    expect(screen.queryByText(/suggested days/i)).toBeNull();
    expect(screen.getByRole('button', { name: 'Mon' }).className).toContain('bg-orange-600');
    fireEvent.click(tue);
    await waitFor(() => expect(tracked).toEqual(['reminder_set']));
  });

  it('says reminders are off when Remind me is switched off', async () => {
    prefs.value = { reminder_enabled: true, reminder_days: [1, 3, 5] };
    render(<RemindersCard showWeekly={false} />);
    fireEvent.click(await screen.findByRole('switch', { name: /remind me/i }));
    expect(await screen.findByText('Reminders are off.')).toBeTruthy();
    expect(tracked).toEqual([]);
  });

  it('records nothing when the save fails', async () => {
    saveError.value = { message: 'offline' };
    render(<RemindersCard showWeekly={false} />);
    fireEvent.click(await screen.findByRole('button', { name: 'Tue' }));
    await screen.findByText(/could not save/i);
    expect(tracked).toEqual([]);
  });
});
