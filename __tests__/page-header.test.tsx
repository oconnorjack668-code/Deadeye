// __tests__/page-header.test.tsx
// The section wash behind each hub's title is 140% wide. Unclipped, it
// widened the hub's scroller and Hoops, Gym, Train, Plays, Film and IQ slid
// sideways by about 52px on a phone (backlog D8). jsdom does no layout, so
// this guards the clip itself; the 375/390px check is in the PR.
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Dumbbell } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';

describe('PageHeader', () => {
  it('clips its wide wash sideways, without making a scroll box', () => {
    render(<PageHeader tone="gym" icon={Dumbbell} title="Gym" subtitle="Lift" />);
    const wrapper = screen.getByRole('heading', { name: 'Gym' }).closest('.relative.mb-5')!;
    expect(wrapper.className).toContain('overflow-x-clip');
    expect(wrapper.className).not.toMatch(/overflow(-x)?-(hidden|auto|scroll)/);
  });
});
