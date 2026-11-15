// __tests__/study-topic-page.test.tsx
// An IQ topic lists its lessons. A lesson with a curated video must not load
// YouTube's player until the player taps play (S27); a lesson without one
// keeps the search link.
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const VIDEO_ID = 'dQw4w9WgXcQ';

const tables: Record<string, unknown> = {
  study_topics: { id: 'topic-1', title: 'Team defence', description: 'Where to stand and why' },
  study_items: [
    { id: 'item-1', title: 'Help defence', description: 'One pass away', youtube_video_id: VIDEO_ID, quiz_questions: [], key_takeaways: [] },
    { id: 'item-2', title: 'Closeouts', description: 'High hands', youtube_video_id: 'placeholder', quiz_questions: [], key_takeaways: [] },
  ],
  study_progress: [],
};

vi.mock('next/navigation', () => ({ notFound: () => { throw new Error('notFound'); } }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('@/lib/auth', () => ({ requireUser: async () => ({ id: 'user-1' }) }));
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from: (table: string) => {
      const result = { data: tables[table], error: null };
      const q = {
        select: () => q,
        eq: () => q,
        in: () => q,
        not: () => q,
        order: () => q,
        maybeSingle: async () => result,
        then: (resolve: (v: unknown) => void) => resolve(result),
      };
      return q;
    },
  }),
}));

import StudyTopicPage from '@/app/(app)/study/[id]/page';

async function renderPage() {
  return render(await StudyTopicPage({ params: Promise.resolve({ id: 'topic-1' }) }));
}

describe('an IQ topic page', () => {
  it('loads no YouTube player until the player taps play', async () => {
    const { container } = await renderPage();

    expect(screen.getByText('Help defence')).toBeTruthy();
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.innerHTML).not.toMatch(/youtube-nocookie\.com|ytimg\.com/i);
    expect(screen.getByText(/This plays from YouTube; YouTube sees that you watched it/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Play video: Help defence' }));

    const frame = screen.getByTitle('Help defence') as HTMLIFrameElement;
    expect(frame.src.startsWith(`https://www.youtube-nocookie.com/embed/${VIDEO_ID}`)).toBe(true);
  });

  it('offers a search, not a player, for a lesson with no video chosen', async () => {
    await renderPage();

    // Only the curated lesson has a play button
    expect(screen.getAllByRole('button', { name: /play video/i })).toHaveLength(1);
    expect(screen.getByRole('link', { name: /search videos/i })).toBeTruthy();
  });
});
