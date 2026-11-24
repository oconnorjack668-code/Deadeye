// __tests__/onboarding-setup.test.tsx
// Setup for Irish players (backlog D4, docs/agent-os/design/2026-11-23-setup.md):
// a 13 to 15 sign-up is not asked their age again and saves 13-15; a 16 or
// older sign-up must pick "16 or 17" or "18 or older" (nothing picked for
// them) and saves 16-17 or 18+. Centimetres first; Irish/UK labels with the
// stored goal strings unchanged.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
// One router object, as Next gives: setup loads the profile once per router
const push = vi.fn();
const router = { push, refresh: vi.fn() };
vi.mock('next/navigation', () => ({
  useRouter: () => router,
}));

let is16Plus: boolean = false;
let savedProfile: Record<string, unknown> = {};
const upsert = vi.fn<(row: Record<string, unknown>) => Promise<{ error: null }>>(async () => ({ error: null }));

function query(result: unknown) {
  const q: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'limit']) q[m] = () => q;
  q.single = async () => ({ data: result });
  q.maybeSingle = async () => ({ data: result });
  q.then = (resolve: (v: unknown) => void) => resolve({ data: [] });
  return q;
}

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
    from: (table: string) => {
      if (table === 'age_checks') return query({ is_16_plus: is16Plus });
      if (table === 'profiles') return { ...query({ account_role: 'both', ...savedProfile }), upsert, update: () => ({ eq: async () => ({}) }) };
      return { ...query(null), insert: async () => ({ error: null }) };
    },
  }),
}));

import OnboardingPage from '@/app/(app)/onboarding/page';

beforeEach(() => {
  push.mockClear();
  upsert.mockClear();
  savedProfile = {};
  window.scrollTo = vi.fn();
  globalThis.fetch = vi.fn(async () => new Response('{}')) as unknown as typeof fetch;
  Element.prototype.scrollIntoView = vi.fn();
});

async function openSetup() {
  render(<OnboardingPage />);
  await screen.findByRole('heading', { name: 'Tell us about your game' });
  fireEvent.change(screen.getByLabelText('Your name or a nickname'), { target: { value: 'Sam' } });
}

async function finish() {
  fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  await screen.findByRole('heading', { name: 'What level do you play at?' });
  fireEvent.click(screen.getByRole('button', { name: /Next/ }));
  await screen.findByRole('heading', { name: 'What are you working on?' });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: /Finish setup/ }));
  });
}

describe('setup age question (D4, option A)', () => {
  it('asks a 13 to 15 sign-up nothing and saves 13-15', async () => {
    is16Plus = false;
    await openSetup();
    expect(screen.queryByText('How old are you?')).toBeNull();
    expect(screen.queryByRole('radio', { name: '18 or older' })).toBeNull();
    await finish();
    await waitFor(() => expect(upsert).toHaveBeenCalled());
    expect(upsert.mock.calls[0][0].age_bracket).toBe('13-15');
    // the Signal step: opening setup is counted once, as setup_started
    const bodies = (globalThis.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.map((c) => String((c[1] as RequestInit).body));
    expect(bodies).toEqual([JSON.stringify({ name: 'setup_started' })]);
  });

  it('asks a 16 or older sign-up, with nothing picked, and will not go on without an answer', async () => {
    is16Plus = true;
    await openSetup();
    const sixteen = screen.getByRole('radio', { name: '16 or 17' }) as HTMLInputElement;
    const adult = screen.getByRole('radio', { name: '18 or older' }) as HTMLInputElement;
    expect(sixteen.checked).toBe(false);
    expect(adult.checked).toBe(false);
    expect(screen.getByText(/Why we ask: players under 18 get extra protections/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(screen.getByText('Choose 16 or 17, or 18 or older.')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Tell us about your game' })).toBeTruthy();
  });

  it('saves 16-17 for "16 or 17"', async () => {
    is16Plus = true;
    await openSetup();
    fireEvent.click(screen.getByRole('radio', { name: '16 or 17' }));
    await finish();
    await waitFor(() => expect(upsert).toHaveBeenCalled());
    expect(upsert.mock.calls[0][0].age_bracket).toBe('16-17');
  });

  it('saves 18+ for "18 or older"', async () => {
    is16Plus = true;
    await openSetup();
    fireEvent.click(screen.getByRole('radio', { name: '18 or older' }));
    await finish();
    await waitFor(() => expect(upsert).toHaveBeenCalled());
    expect(upsert.mock.calls[0][0].age_bracket).toBe('18+');
  });
});

describe('setup for Irish players', () => {
  it('starts in centimetres, even though the table defaults to imperial, with feet and inches a tap away', async () => {
    is16Plus = false;
    savedProfile = { measurement_system: 'imperial', onboarding_completed: false };
    await openSetup();
    expect(screen.getByText('cm')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Use feet and inches' }));
    expect(screen.getByLabelText('Height, feet')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Use centimetres' })).toBeTruthy();
  });

  it('shows "defence" and plain words but saves the stored goal strings', async () => {
    is16Plus = false;
    await openSetup();
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    expect(await screen.findByRole('radio', { name: /School or club team/ })).toBeTruthy();
    expect(screen.queryByText(/NCAA|Varsity|High School/)).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByRole('heading', { name: 'What are you working on?' });

    // two goals are picked by default; swap one for the defence goal
    fireEvent.click(screen.getByRole('button', { name: /3-point shooting consistency/ }));
    const defence = screen.getByRole('button', { name: 'Lockdown on-ball defence' });
    expect(defence.getAttribute('aria-pressed')).toBe('false');
    fireEvent.click(defence);
    expect(defence.getAttribute('aria-pressed')).toBe('true');

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Finish setup/ }));
    });
    await waitFor(() => expect(upsert).toHaveBeenCalled());
    expect(upsert.mock.calls[0][0].goals).toEqual(['Consistent Training Habit', 'Lockdown On-Ball Defense']);
  });

  it('stops taps on goals past three, so the cap can be seen', async () => {
    is16Plus = false;
    await openSetup();
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByRole('heading', { name: 'What level do you play at?' });
    fireEvent.click(screen.getByRole('button', { name: /Next/ }));
    await screen.findByRole('heading', { name: 'What are you working on?' });
    fireEvent.click(screen.getByRole('button', { name: 'Mid-range pull-up' }));
    expect((screen.getByRole('button', { name: 'Off-hand ball handling' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByLabelText('3 of 3 picked')).toBeTruthy();
  });
});
