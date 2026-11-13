// __tests__/settingsHeardFrom.test.tsx
// Settings → Privacy shows the optional sign-up answer and lets the player
// clear it (safety re-review of PR #97, N2: objecting should be one tap).
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const updateUser = vi.hoisted(() => vi.fn());
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { updateUser } }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/components/video/SoundPicker', () => ({ SoundPicker: () => null }));
vi.mock('@/components/ReportProblem', () => ({ ReportProblem: () => null }));
vi.mock('@/components/AppearancePicker', () => ({ AppearancePicker: () => null }));

import { SettingsClient } from '@/app/(app)/settings/SettingsClient';

const initial = {
  display_name: 'Test Player',
  account_role: 'player' as const,
  is_public: false,
  show_position: false,
  show_height: false,
  show_location: false,
  allow_friend_requests: true,
  share_with_coaches: false,
  ai_coaching_enabled: true,
  country: null,
  region: null,
  timezone: null,
  measurement_system: 'metric' as const,
};

function renderSettings(heardFrom: 'friend' | null) {
  return render(
    <SettingsClient
      email="tester@example.com"
      plan="Free"
      initial={initial}
      avatar={null}
      notifications={null}
      dataControls={null}
      supportEmail={null}
      version="1.0.0"
      heardFrom={heardFrom}
    />
  );
}

describe('Settings: the sign-up answer', () => {
  beforeEach(() => updateUser.mockReset());

  it('shows the answer as the player saw it and clears only that key', async () => {
    updateUser.mockResolvedValue({ data: {}, error: null });
    renderSettings('friend');
    expect(screen.getByText('Where you heard about Deadeye: A friend or teammate')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Clear my answer' }));

    await waitFor(() => expect(screen.queryByText(/Where you heard about Deadeye/)).toBeNull());
    expect(updateUser).toHaveBeenCalledWith({ data: { heard_from: null } });
    expect(screen.getByText('Answer cleared')).toBeTruthy();
  });

  it('keeps the answer on screen and says so when clearing fails', async () => {
    updateUser.mockResolvedValue({ data: {}, error: { message: 'offline' } });
    renderSettings('friend');
    fireEvent.click(screen.getByRole('button', { name: 'Clear my answer' }));
    await waitFor(() => expect(screen.getByText('Could not clear your answer. Please try again.')).toBeTruthy());
    expect(screen.getByText(/Where you heard about Deadeye/)).toBeTruthy();
  });

  it('shows nothing when the player skipped the question', () => {
    renderSettings(null);
    expect(screen.queryByText(/Where you heard about Deadeye/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Clear my answer' })).toBeNull();
  });
});
