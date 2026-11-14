// __tests__/film-player.test.tsx
// The film clip player as a player uses it, with a fake video in place of
// the YouTube IFrame API: nothing loads from YouTube before the tap; after
// it the clip stops at each question, which shows below the video and takes
// focus; an answer shows why; "See it again" goes back 3 seconds; Continue
// plays on; at the end the answers are kept once. Slower speeds work, and if
// the API cannot load the questions still come, one after another.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { FilmQuestion } from '@/lib/film/questions';
import type { CreateFilmVideo, FilmVideo } from '@/lib/film/youtubePlayer';

const calls = vi.hoisted(() => ({ submitted: [] as unknown[], tracked: [] as string[] }));
vi.mock('@/app/(app)/film/actions', () => ({
  submitFilmAttempt: async (clipId: string, picks: unknown) => {
    calls.submitted.push({ clipId, picks });
    return { ok: true, score: 1, total: 2 };
  },
}));
vi.mock('@/lib/events', () => ({ track: (name: string) => calls.tracked.push(name) }));

import { FilmClipPlayer } from '@/components/film/FilmClipPlayer';

const QUESTIONS: FilmQuestion[] = [
  { key: 'q1', question: 'Where should 4 be?', options: ['In the corner', 'In the gap'], correct_index: 1, explanation: 'Help from the gap.', moment_s: 15 },
  { key: 'q2', question: 'What is the next pass?', options: ['Skip pass', 'Back to the top'], correct_index: 0, explanation: 'Swing it.', moment_s: 30 },
];

function fakeVideo() {
  let t = 10;
  const video: FilmVideo & { setTime(s: number): void } = {
    play: vi.fn(),
    pause: vi.fn(),
    seekTo: vi.fn((s: number) => {
      t = s;
    }),
    currentTime: () => t,
    setRate: vi.fn(),
    rates: () => [0.25, 0.5, 1, 1.5],
    destroy: vi.fn(),
    setTime: (s: number) => {
      t = s;
    },
  };
  const create = vi.fn<CreateFilmVideo>(async () => video);
  return { video, create };
}

function renderPlayer(create: CreateFilmVideo) {
  return render(<FilmClipPlayer clipId="clip-1" videoId="abcdefghijk" title="Help side" startS={10} endS={40} questions={QUESTIONS} createVideo={create} />);
}

async function tapAndAttach() {
  fireEvent.click(screen.getByRole('button', { name: 'Play video: Help side' }));
  await act(async () => {});
}

function tickAt(video: { setTime(s: number): void }, s: number) {
  video.setTime(s);
  act(() => {
    vi.advanceTimersByTime(250);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  calls.submitted.length = 0;
  calls.tracked.length = 0;
});
afterEach(() => {
  vi.useRealTimers();
});

describe('FilmClipPlayer', () => {
  it('loads nothing from YouTube before the tap, and says where the video plays from', () => {
    const { create } = fakeVideo();
    const { container } = renderPlayer(create);
    expect(container.querySelector('iframe')).toBeNull();
    expect(create).not.toHaveBeenCalled();
    expect(screen.getByText('This plays from YouTube; YouTube sees that you watched it.')).toBeTruthy();
    expect(screen.getByText('The clip stops 2 times to ask you a question.')).toBeTruthy();
    expect(calls.tracked).toEqual(['film_opened']);
  });

  it('after the tap, builds the player from the stored id with the API allowed, and attaches to it', async () => {
    const { create } = fakeVideo();
    const { container } = renderPlayer(create);
    await tapAndAttach();
    const frame = container.querySelector('iframe')!;
    const url = new URL(frame.src);
    expect(url.host).toBe('www.youtube-nocookie.com');
    expect(url.pathname).toBe('/embed/abcdefghijk');
    expect(url.searchParams.get('enablejsapi')).toBe('1');
    expect(url.searchParams.get('cc_load_policy')).toBe('1');
    expect(create).toHaveBeenCalledWith(frame, expect.any(Object));
  });

  it('stops at the moment and shows the question below the video, with focus on it', async () => {
    const { video, create } = fakeVideo();
    const { container } = renderPlayer(create);
    await tapAndAttach();
    tickAt(video, 12);
    expect(screen.queryByRole('heading', { name: 'Where should 4 be?' })).toBeNull();
    tickAt(video, 15.1);
    expect(video.pause).toHaveBeenCalled();
    const heading = screen.getByRole('heading', { name: 'Where should 4 be?' });
    expect(document.activeElement).toBe(heading);
    // Below the player, never on top of it
    const frame = container.querySelector('iframe')!;
    expect(frame.closest('div')!.contains(heading)).toBe(false);
    expect(frame.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText('Question 1 of 2')).toBeTruthy();
  });

  it('shows the right answer and why after a pick, goes back 3 seconds on See it again, and plays on with Continue', async () => {
    const { video, create } = fakeVideo();
    renderPlayer(create);
    await tapAndAttach();
    tickAt(video, 15.1);
    fireEvent.click(screen.getByRole('button', { name: 'In the corner' }));
    expect(screen.getByText('Not quite. The answer is: In the gap')).toBeTruthy();
    expect(screen.getByText('Help from the gap.')).toBeTruthy();
    expect((screen.getByRole('button', { name: /In the gap/ }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: /See it again/ }));
    expect(video.seekTo).toHaveBeenLastCalledWith(12);
    expect(video.play).toHaveBeenCalledTimes(1);
    tickAt(video, 15.05);
    expect(screen.getByText('Not quite. The answer is: In the gap')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(video.play).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('heading', { name: 'Where should 4 be?' })).toBeNull();
  });

  it('stops at the end and keeps the answers once', async () => {
    const { video, create } = fakeVideo();
    renderPlayer(create);
    await tapAndAttach();
    tickAt(video, 15.1);
    fireEvent.click(screen.getByRole('button', { name: 'In the gap' }));
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    tickAt(video, 30.2);
    fireEvent.click(screen.getByRole('button', { name: 'Back to the top' }));
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    tickAt(video, 39.9);
    await act(async () => {});
    expect(screen.getByText(/You got/).textContent).toMatch(/You got 1 of 2 right/);
    expect(calls.submitted).toEqual([
      {
        clipId: 'clip-1',
        picks: [
          { key: 'q1', pick: 1 },
          { key: 'q2', pick: 1 },
        ],
      },
    ]);
    expect(screen.getByText('Answers saved.')).toBeTruthy();
    expect(calls.tracked).toContain('film_done');
    tickAt(video, 40);
    fireEvent.click(screen.getByRole('button', { name: /Watch again/ }));
    expect(video.seekTo).toHaveBeenLastCalledWith(10);
    expect(calls.submitted).toHaveLength(1);
  });

  it('lets the speed be slowed down', async () => {
    const { video, create } = fakeVideo();
    renderPlayer(create);
    await tapAndAttach();
    const speed = screen.getByLabelText('Speed') as HTMLSelectElement;
    expect([...speed.options].map((o) => o.textContent)).toEqual(['0.25x', '0.5x', 'Normal']);
    fireEvent.change(speed, { target: { value: '0.5' } });
    expect(video.setRate).toHaveBeenCalledWith(0.5);
  });

  it('says why a video will not play', async () => {
    const { create } = fakeVideo();
    create.mockImplementation(async (_frame, handlers) => {
      handlers.onError(150);
      return fakeVideo().video;
    });
    renderPlayer(create);
    await tapAndAttach();
    expect(screen.getByRole('alert').textContent).toMatch(/no longer lets this video play/);
  });

  it('still asks the questions, one after another, when the video controls cannot load', async () => {
    const create = vi.fn<CreateFilmVideo>(async () => {
      throw new Error('blocked');
    });
    renderPlayer(create);
    await tapAndAttach();
    expect(screen.getByRole('alert').textContent).toMatch(/Watch it, then answer the questions below/);
    expect(screen.queryByRole('button', { name: /See it again/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'In the gap' }));
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    expect(screen.getByRole('heading', { name: 'What is the next pass?' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Skip pass' }));
    fireEvent.click(screen.getByRole('button', { name: /Continue/ }));
    await act(async () => {});
    expect(screen.getByText(/You got/).textContent).toMatch(/You got 2 of 2 right/);
    expect(calls.submitted).toHaveLength(1);
  });
});
