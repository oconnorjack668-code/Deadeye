// __tests__/club-board-ui.test.tsx
// The club board screen: players read, head coaches post and set the
// challenge, and small teams never show their numbers.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
const rpc = vi.fn<(name: string, args: unknown) => Promise<{ data?: unknown; error: { message: string } | null }>>(async () => ({ error: null as { message: string } | null }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc }) }));

import { ClubBoard } from '@/components/clubs/ClubBoard';
import type { ClubTeam } from '@/lib/clubBoard';

const NOW = Date.parse('2026-10-22T12:00:00Z');
const teams: ClubTeam[] = [
  { team_id: 't14', name: 'Blazers U14 Girls', age_group: 'U14', league_id: null, players: 9, sessions_7d: 21, shots_7d: 1840, active_7d: 7, mine: true },
  { team_id: 't16', name: 'Blazers U16 Boys', age_group: 'U16', league_id: 'u18-shield', players: 11, sessions_7d: 30, shots_7d: 2410, active_7d: 8, mine: false },
  { team_id: 't12', name: 'Blazers U12', age_group: 'U12', league_id: null, players: 2, sessions_7d: null, shots_7d: null, active_7d: null, mine: false },
];
const props = {
  club: { id: 'wexford-bc-wexford', name: 'Wexford BC', place: 'Wexford' },
  teams,
  notices: [
    { id: 'n1', body: 'Training moved to Thursday at 7 this week.', created_at: '2026-10-22T09:00:00Z', author_name: 'Ann', team_name: 'Blazers U14 Girls', mine: false },
  ],
  challenge: { metric: 'shots' as const, target: 10000, starts_on: '2026-10-15', ends_on: '2026-11-11', progress: 6240 },
  myCoachTeams: [] as Array<{ id: string; name: string }>,
  canModerate: false,
  today: '2026-10-22',
  now: NOW,
};

beforeEach(() => {
  rpc.mockClear();
  refresh.mockClear();
});

describe('club board', () => {
  it('shows a player the club, the challenge, the teams and the notices, and nothing to post', () => {
    render(<ClubBoard {...props} />);
    expect(screen.getByRole('heading', { name: 'Wexford BC' })).toBeTruthy();
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('62');
    expect(screen.getByText('6,240')).toBeTruthy();
    expect(screen.getByText('21 days left')).toBeTruthy();
    expect(screen.getByText('Training moved to Thursday at 7 this week.')).toBeTruthy();
    expect(screen.getByText('New')).toBeTruthy();
    expect(screen.queryByLabelText('New notice')).toBeNull();
    expect(screen.queryByText('New challenge')).toBeNull();
    expect(screen.queryByLabelText('Delete notice')).toBeNull();
  });

  it('ranks the busiest team first and hides a team under 3 players', () => {
    render(<ClubBoard {...props} />);
    const rows = screen.getAllByRole('listitem').filter((li) => li.textContent?.includes('Blazers U1'));
    const race = rows.filter((li) => li.closest('ol'));
    expect(race.map((li) => li.querySelector('span.truncate')?.textContent)).toEqual(['Blazers U16 Boys', 'Blazers U14 GirlsYour team', 'Blazers U12']);
    expect(screen.getByText(/Totals show from 3 players/)).toBeTruthy();
    expect(screen.getByText(/8 of 11 trained · 2,410 shots · U16 · U18 Shield/)).toBeTruthy();
  });

  it('lets a head coach post a notice, and stops contact details first', async () => {
    render(<ClubBoard {...props} myCoachTeams={[{ id: 't14', name: 'Blazers U14 Girls' }]} />);
    const box = screen.getByLabelText('New notice');
    fireEvent.change(box, { target: { value: 'Text me on 087 123 4567' } });
    expect(screen.getByText(/cannot include emails, phone numbers/)).toBeTruthy();
    expect((screen.getByRole('button', { name: /Post/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.change(box, { target: { value: 'Game day Saturday, be there by 10' } });
    fireEvent.click(screen.getByRole('button', { name: /Post/ }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('post_club_notice', { p_team: 't14', p_body: 'Game day Saturday, be there by 10' }));
    expect(refresh).toHaveBeenCalled();
  });

  it('lets a head coach start a club challenge', async () => {
    render(<ClubBoard {...props} challenge={null} myCoachTeams={[{ id: 't14', name: 'Blazers U14 Girls' }]} />);
    expect(screen.getByText('No club challenge right now')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Set a club challenge' }));
    fireEvent.click(screen.getByRole('button', { name: 'Sessions' }));
    fireEvent.click(screen.getByRole('button', { name: '2 weeks' }));
    fireEvent.click(screen.getByRole('button', { name: 'Start challenge' }));
    await waitFor(() => expect(rpc).toHaveBeenCalledWith('set_club_challenge', { p_team: 't14', p_metric: 'sessions', p_target: 100, p_days: 14 }));
  });

  it('lets the owner remove any notice', () => {
    render(<ClubBoard {...props} canModerate />);
    expect(screen.getByLabelText('Delete notice')).toBeTruthy();
  });
});
