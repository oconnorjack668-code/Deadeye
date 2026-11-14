// __tests__/play-player.test.tsx
// Playing a play: stepping through it, "Show my role", and reduced motion,
// where the court moves a step at a time instead of sliding.
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { LIBRARY_PLAYS } from '@/data/plays/library';

const tracked = vi.hoisted(() => [] as string[]);
vi.mock('@/lib/events', () => ({ track: (name: string) => tracked.push(name) }));

import { PlayPlayer } from '@/components/plays/PlayPlayer';
import { PlayCourt } from '@/components/plays/PlayCourt';
import { buildDiagram } from '@/lib/plays/build';

const giveAndGo = LIBRARY_PLAYS.find((p) => p.slug === 'give-and-go')!;

function setReducedMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('reduce'),
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
}

function caption() {
  return screen.getByText(/^Step \d of \d:/).parentElement!.textContent;
}

afterEach(() => {
  vi.useRealTimers();
});

describe('PlayPlayer', () => {
  it('starts still on step 1, and records that a play was opened', () => {
    setReducedMotion(false);
    render(<PlayPlayer diagram={giveAndGo.diagram} title={giveAndGo.title} />);
    expect(caption()).toContain('Step 1 of 4: 1 passes to 2');
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();
    expect(tracked).toContain('play_opened');
  });

  it('steps forward and back, and jumps to a step from the list', () => {
    setReducedMotion(false);
    render(<PlayPlayer diagram={giveAndGo.diagram} title={giveAndGo.title} />);
    fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
    expect(caption()).toContain('Step 2 of 4: 1 cuts to the middle');
    fireEvent.click(screen.getByRole('button', { name: 'Previous step' }));
    expect(caption()).toContain('Step 1 of 4');
    fireEvent.click(screen.getByRole('button', { name: /1 cuts to the basket/ }));
    expect(caption()).toContain('Step 3 of 4: 1 cuts to the basket');
    expect(screen.getByRole('button', { name: /1 cuts to the basket/ }).getAttribute('aria-current')).toBe('step');
  });

  it('shows one player their job at every step and fades everyone else', () => {
    setReducedMotion(false);
    const { container } = render(<PlayPlayer diagram={giveAndGo.diagram} title={giveAndGo.title} />);
    fireEvent.click(screen.getByRole('button', { name: 'Show my role: 1' }));
    expect(screen.getByRole('button', { name: 'Show my role: 1' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('You are 1. Start at the top with the ball.')).toBeTruthy();
    expect(screen.getByText('You: Pass to 2')).toBeTruthy();
    expect(screen.getByText('You: Cut to the basket')).toBeTruthy();
    expect(screen.getByText('You: Catch the pass from 2')).toBeTruthy();
    expect(container.querySelector('[data-player="1"]')!.getAttribute('opacity')).toBe('1');
    expect(container.querySelector('[data-player="3"]')!.getAttribute('opacity')).toBe('0.3');

    fireEvent.click(screen.getByRole('button', { name: 'Everyone' }));
    expect(screen.queryByText(/^You: /)).toBeNull();
    expect(container.querySelector('[data-player="3"]')!.getAttribute('opacity')).toBe('1');
  });

  it('with reduced motion, plays a step at a time and holds each one', () => {
    vi.useFakeTimers();
    setReducedMotion(true);
    const { container } = render(<PlayPlayer diagram={giveAndGo.diagram} title={giveAndGo.title} />);
    const token = () => container.querySelector('[data-player="1"] circle')!;
    const startX = token().getAttribute('cx');

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(700);
    });
    // Half a hold later nothing has slid
    expect(token().getAttribute('cx')).toBe(startX);
    expect(caption()).toContain('Step 1 of 4');

    act(() => {
      vi.advanceTimersByTime(700 * 2);
    });
    // One step on: 1 has passed; step 2 (1 steps away) is drawn, 1 not yet moved
    expect(caption()).toContain('Step 2 of 4');
    expect(token().getAttribute('cx')).toBe(startX);
    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(caption()).toContain('Step 3 of 4');
    expect(token().getAttribute('cx')).toBe(String(21 * 10));

    act(() => {
      vi.advanceTimersByTime(1400 * 3);
    });
    expect(screen.getByRole('button', { name: 'Play again' })).toBeTruthy();
  });

  it('plays at half speed when asked', () => {
    vi.useFakeTimers();
    setReducedMotion(true);
    render(<PlayPlayer diagram={giveAndGo.diagram} title={giveAndGo.title} />);
    fireEvent.click(screen.getByRole('button', { name: '0.5x' }));
    expect(screen.getByRole('button', { name: '0.5x' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(caption()).toContain('Step 1 of 4');
    act(() => {
      vi.advanceTimersByTime(1400);
    });
    expect(caption()).toContain('Step 2 of 4');
  });
});

describe('PlayCourt', () => {
  it('draws each kind of move its own way: dashed pass, zigzag dribble, arrow cut, bar screen', () => {
    const d = buildDiagram(
      { positions: { o1: { x: 25, y: 31 }, o2: { x: 45, y: 21 }, o3: { x: 5, y: 21 }, o5: { x: 25, y: 20 } }, ball: 'o1' },
      [
        {
          moves: [
            { type: 'screen', from: 'o5', to: 'o1', at: { x: 28, y: 28.5 } },
            { type: 'cut', from: 'o3', at: { x: 5, y: 10 } },
          ],
        },
        {
          moves: [
            { type: 'dribble', from: 'o1', at: { x: 37, y: 22 } },
            { type: 'cut', from: 'o2', at: { x: 45, y: 10 } },
          ],
        },
        { moves: [{ type: 'pass', from: 'o1', to: 'o2' }] },
      ]
    );
    const at = (t: number) => render(<PlayCourt diagram={d} t={t} label="Test" />).container;

    const first = at(0);
    expect(first.querySelector('[data-move="screen"] line')).toBeTruthy();
    expect(first.querySelector('[data-move="cut"] polygon')).toBeTruthy();

    const second = at(1000);
    const zig = second.querySelector('[data-move="dribble"] polyline')!.getAttribute('points')!.split(' ');
    expect(zig.length).toBeGreaterThan(4);

    const third = at(2000);
    expect(third.querySelector('[data-move="pass"] polyline')!.getAttribute('stroke-dasharray')).toBe('9 7');
  });

  it('marks defenders X1-X5 as rings, and hides a thumbnail from screen readers', () => {
    const d = buildDiagram({ positions: { o1: { x: 25, y: 31 }, x1: { x: 25, y: 27 } }, ball: 'o1' }, [{ moves: [] }]);
    const { container } = render(<PlayCourt diagram={d} label="" />);
    expect(container.querySelector('[data-player="X1"] text')!.textContent).toBe('X1');
    expect(container.querySelector('svg')!.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('[data-ball="o1"]')).toBeTruthy();
  });
});
