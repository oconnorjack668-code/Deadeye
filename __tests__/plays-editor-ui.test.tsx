// __tests__/plays-editor-ui.test.tsx
// The play editor as a coach uses it: dragging players on the court (the
// ball holder dribbles, anyone else cuts), the same moves from the form for
// keyboards and screen readers, undo, live age-rule warnings, and saving
// through the server action, which is only called with a valid play.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

const calls = vi.hoisted(() => ({ saved: [] as unknown[], pushed: [] as string[], tracked: [] as string[], result: { ok: true, id: 'play-9' } as unknown }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: (href: string) => calls.pushed.push(href), refresh: () => undefined }) }));
vi.mock('@/lib/events', () => ({ track: (name: string) => calls.tracked.push(name) }));
vi.mock('@/app/(app)/plays/actions', () => ({
  savePlay: async (input: unknown) => {
    calls.saved.push(input);
    return calls.result;
  },
  deletePlay: async () => ({ ok: true }),
}));

import { PlayEditor } from '@/components/plays/PlayEditor';

/** The court is drawn 580 x 540 px, so a foot is 10 px and (0, 0) ft sits at (40, 40) px. */
function court() {
  const svg = screen.getByRole('img', { name: /Play editor court/ }) as unknown as SVGSVGElement;
  svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 580, height: 540, right: 580, bottom: 540, x: 0, y: 0, toJSON: () => ({}) });
  return svg;
}
const px = (ft: { x: number; y: number }) => ({ clientX: ft.x * 10 + 40, clientY: ft.y * 10 + 40 });

function drag(svg: SVGSVGElement, token: Element, from: { x: number; y: number }, to: { x: number; y: number }) {
  fireEvent.pointerDown(token, { pointerId: 1, button: 0, ...px(from) });
  fireEvent.pointerMove(svg, { pointerId: 1, ...px({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }) });
  fireEvent.pointerMove(svg, { pointerId: 1, ...px(to) });
  fireEvent.pointerUp(svg, { pointerId: 1, ...px(to) });
}

const token = (svg: Element, id: string) => svg.querySelector(`[data-token="${id}"] circle`)!;
const stepText = () => screen.getByText(/^Step \d+ of \d+:$/).parentElement!.textContent;

beforeEach(() => {
  calls.saved = [];
  calls.pushed = [];
  calls.tracked = [];
  calls.result = { ok: true, id: 'play-9' };
});

describe('the play editor', () => {
  it('opens on the set-up of a new play, with the six set-ups to start from', () => {
    render(<PlayEditor />);
    expect(screen.getByRole('img', { name: 'Play editor court. The set-up' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Set-up' }).getAttribute('aria-pressed')).toBe('true');
    for (const name of ['4-out 1-in', '5-out', 'Horns', 'Box', 'Stack', '1-4 high']) expect(screen.getByRole('button', { name })).toBeTruthy();
  });

  it('records a dribble when the ball holder is dragged, and a cut for anyone else', () => {
    render(<PlayEditor />);
    fireEvent.click(screen.getByRole('button', { name: /^Step 1:/ }));
    const svg = court();
    // 4-out 1-in: 1 has the ball at the left slot (15.5, 28.5); 3 is on the left wing (5, 21)
    drag(svg, token(svg, 'o1'), { x: 15.5, y: 28.5 }, { x: 24.5, y: 30.5 });
    expect(stepText()).toBe('Step 1 of 1: 1 dribbles to the top');
    drag(svg, token(svg, 'o3'), { x: 5, y: 21 }, { x: 15, y: 8.5 });
    expect(stepText()).toBe('Step 1 of 1: 1 dribbles to the top, 3 cuts to the left block');
  });

  it('records a pass when the ball is dropped on a teammate', () => {
    render(<PlayEditor />);
    fireEvent.click(screen.getByRole('button', { name: /^Step 1:/ }));
    const svg = court();
    const ball = svg.querySelector('[data-ball-handle] circle')!;
    drag(svg, ball, { x: 16.9, y: 29.9 }, { x: 34.5, y: 28.5 });
    expect(stepText()).toBe('Step 1 of 1: 1 passes to 2');
  });

  it('works by tapping too: a player, then where they go', () => {
    render(<PlayEditor />);
    fireEvent.click(screen.getByRole('button', { name: /^Step 1:/ }));
    const svg = court();
    fireEvent.pointerDown(token(svg, 'o4'), { pointerId: 2, button: 0, ...px({ x: 45, y: 21 }) });
    fireEvent.pointerUp(svg, { pointerId: 2, ...px({ x: 45, y: 21 }) });
    fireEvent.pointerDown(svg, { pointerId: 3, button: 0, ...px({ x: 48, y: 3.5 }) });
    fireEvent.pointerUp(svg, { pointerId: 3, ...px({ x: 48, y: 3.5 }) });
    expect(stepText()).toBe('Step 1 of 1: 4 cuts to the right corner');
  });

  it('adds moves from the form, without dragging, and undo takes them back', () => {
    render(<PlayEditor />);
    fireEvent.click(screen.getByRole('button', { name: /^Step 1:/ }));
    const form = screen.getByRole('form', { name: 'Add a move to step 1' });
    fireEvent.change(within(form).getByLabelText('Move'), { target: { value: 'pass' } });
    fireEvent.change(within(form).getByLabelText('Teammate'), { target: { value: 'o2' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Add move' }));
    expect(stepText()).toBe('Step 1 of 1: 1 passes to 2');
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(stepText()).toBe('Step 1 of 1: Everyone holds');
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    expect(stepText()).toBe('Step 1 of 1: 1 passes to 2');
  });

  it('warns straight away when a ball screen is marked for U11', () => {
    render(<PlayEditor />);
    fireEvent.click(screen.getByRole('button', { name: /^Step 1:/ }));
    const form = screen.getByRole('form', { name: 'Add a move to step 1' });
    fireEvent.change(within(form).getByLabelText('Player'), { target: { value: 'o5' } });
    fireEvent.change(within(form).getByLabelText('Move'), { target: { value: 'screen' } });
    fireEvent.change(within(form).getByLabelText('Teammate'), { target: { value: 'o1' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Add move' }));
    expect(screen.queryByText(/Ball screens are not allowed/)).toBeNull();
    fireEvent.change(screen.getByLabelText('Youngest age group'), { target: { value: 'U11' } });
    expect(screen.getByText(/Ball screens are not allowed at U11 and under/)).toBeTruthy();
  });

  it('says what is missing instead of saving, then saves a valid play and opens it', async () => {
    render(<PlayEditor />);
    fireEvent.click(screen.getByRole('button', { name: 'Save play' }));
    expect((await screen.findByRole('alert')).textContent).toBe('Give the play a name.');
    expect(calls.saved).toEqual([]);

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Horns flare' } });
    fireEvent.change(screen.getByLabelText('Coaching points, one per line (optional)'), { target: { value: 'Sprint\n\nSet a wide screen' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save play' }));
    await vi.waitFor(() => expect(calls.pushed).toEqual(['/plays/play-9']));
    expect(calls.saved[0]).toMatchObject({ title: 'Horns flare', category: 'half_court', minAge: 'U12', coachingPoints: ['Sprint', 'Set a wide screen'] });
    expect(calls.tracked).toEqual(['play_drawn']);
  });

  it('shows the reason when the server refuses, such as the Free limit', async () => {
    calls.result = { ok: false, error: 'On Free you can keep 5 plays.' };
    render(<PlayEditor />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Sixth play' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save play' }));
    expect((await screen.findByRole('alert')).textContent).toBe('On Free you can keep 5 plays.');
    expect(calls.pushed).toEqual([]);
  });
});
