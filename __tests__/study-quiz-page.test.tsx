// __tests__/study-quiz-page.test.tsx
// The study quiz loads a topic's questions once, shows an error when there are
// none to be had, and fetches them again on Retake Quiz.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const db = vi.hoisted(() => ({ fetches: 0, fail: false }));

vi.mock('next/navigation', () => ({ useParams: () => ({ id: 'topic-1' }) }));
vi.mock('next/link', () => ({ default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => {
      const q = {
        select: () => q,
        eq: () => q,
        order: () => q,
        then: (resolve: (v: unknown) => void) => {
          db.fetches++;
          resolve(
            db.fail
              ? { data: null, error: { message: 'no' } }
              : { data: [{ id: 'item-1', quiz_questions: [{ question: 'Which foot is the pivot foot?', options: ['Left', 'Right'], correct_index: 1 }] }], error: null }
          );
        },
      };
      return q;
    },
  }),
}));

import QuizPage from '@/app/(app)/study/[id]/quiz/page';

beforeEach(() => {
  db.fetches = 0;
  db.fail = false;
});

describe('the study quiz', () => {
  it('loads the topic once and shows its question', async () => {
    render(<QuizPage />);
    expect(await screen.findByText('Which foot is the pivot foot?')).toBeTruthy();
    expect(db.fetches).toBe(1);
  });

  it('says so when the quiz cannot be found', async () => {
    db.fail = true;
    render(<QuizPage />);
    expect(await screen.findByText('Quiz not found')).toBeTruthy();
  });

  it('fetches the questions again on Retake Quiz', async () => {
    render(<QuizPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Right' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Retake Quiz' }));
    await waitFor(() => expect(db.fetches).toBe(2));
    expect(await screen.findByText('Which foot is the pivot foot?')).toBeTruthy();
  });
});
