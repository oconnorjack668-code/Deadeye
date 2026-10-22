// __tests__/follow-button.test.tsx
// Follow on the founder card (set_follow, 00050): one tap to follow, one to stop.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
const rpc = vi.fn();
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ rpc }) }));

import { FollowButton } from '@/app/(app)/players/[id]/FollowButton';

beforeEach(() => {
  rpc.mockReset();
  refresh.mockReset();
});

describe('FollowButton', () => {
  it('follows, then stops following', async () => {
    rpc.mockResolvedValueOnce({ data: 'following', error: null }).mockResolvedValueOnce({ data: 'not_following', error: null });
    render(<FollowButton userId="founder-1" initial={false} />);

    fireEvent.click(screen.getByRole('button', { name: /follow/i }));
    await screen.findByRole('button', { name: /following/i });
    expect(rpc).toHaveBeenLastCalledWith('set_follow', { p_user: 'founder-1', p_follow: true });

    fireEvent.click(screen.getByRole('button', { name: /following/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /^follow$/i })).toBeTruthy());
    expect(rpc).toHaveBeenLastCalledWith('set_follow', { p_user: 'founder-1', p_follow: false });
  });

  it('says so when it did not work, and stays as it was', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'down' } });
    render(<FollowButton userId="founder-1" initial={false} />);
    fireEvent.click(screen.getByRole('button', { name: /follow/i }));
    await screen.findByText(/did not work/i);
    expect(screen.getByRole('button', { name: /^follow$/i })).toBeTruthy();
  });
});
