// __tests__/levelUpCelebration.test.tsx
import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LevelUpCelebration } from '@/components/LevelUpCelebration';

const KEY = 'deadeye-level-seen';

describe('LevelUpCelebration', () => {
  beforeEach(() => localStorage.clear());

  it('celebrates a level higher than the one last shown on this phone, once', async () => {
    localStorage.setItem(KEY, '4');
    const first = render(<LevelUpCelebration level={6} tier="Prospect" />);
    expect(await screen.findByText('Level 6')).toBeTruthy();
    expect(screen.getByText('up 2 levels')).toBeTruthy();
    // Crossed from Rookie into Prospect
    expect(screen.getByText('You are now a Prospect')).toBeTruthy();
    await waitFor(() => expect(localStorage.getItem(KEY)).toBe('6'));
    first.unmount();

    render(<LevelUpCelebration level={6} tier="Prospect" />);
    await waitFor(() => expect(localStorage.getItem(KEY)).toBe('6'));
    expect(screen.queryByText('Level up')).toBeNull();
  });

  it('only remembers the level on a first visit, rather than celebrating months of levels', async () => {
    render(<LevelUpCelebration level={23} tier="All-Star" />);
    await waitFor(() => expect(localStorage.getItem(KEY)).toBe('23'));
    expect(screen.queryByText('Level up')).toBeNull();
  });
});
