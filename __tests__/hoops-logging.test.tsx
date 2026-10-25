// __tests__/hoops-logging.test.tsx
// Logging shots by hand on the Hoops session page. Counting in your head used to
// be a dropdown, two typed numbers and an Add button for every spot. It is now
// the court, then one tap on how many went in, with the shots per spot and the
// way the player likes to log remembered on the phone.
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';

// How many sessions the database says the player has saved. null is a player it
// cannot answer for (signed out, or the request failed), as an empty client gives.
const db = vi.hoisted(() => ({ sessions: null as number | null, asked: 0 }));

const tracked = vi.hoisted(() => [] as string[]);
vi.mock('@/lib/events', () => ({ track: (name: string) => tracked.push(name) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock('@/lib/supabase/client', () => ({
  createClient: () =>
    db.sessions === null
      ? {}
      : {
          auth: { getUser: async () => ({ data: { user: { id: 'player' } }, error: null }) },
          from: () => ({
            select: () => ({
              eq: async () => {
                db.asked++;
                return { count: db.sessions, error: null };
              },
            }),
          }),
        },
}));
// jsdom has no layout, so no scrollIntoView; the page scrolls its error into view
Element.prototype.scrollIntoView = vi.fn();

import NewBasketballSessionPage from '@/app/(app)/basketball/new/page';

const PREFS_KEY = 'hoopiq-hoops-prefs-v1';
const DRAFT_KEY = 'hoopiq-hoops-draft-v1';

/** Taps the court at a spot given in feet (the court is 50 x 47 ft) */
function tapCourt(xFt: number, yFt: number) {
  const court = screen.getByRole('img', { name: /half court/i });
  court.getBoundingClientRect = () => ({ left: 0, top: 0, width: 500, height: 470, right: 500, bottom: 470, x: 0, y: 0, toJSON: () => ({}) });
  fireEvent.click(court, { clientX: xFt * 10, clientY: yFt * 10 });
}

/** The running total under the page title, e.g. "7/10 · 70%" */
function sessionTotal() {
  return screen.getByRole('heading', { name: 'Hoops Session' }).nextElementSibling?.textContent;
}

async function openTotals() {
  fireEvent.click(await screen.findByRole('button', { name: 'Enter totals' }));
}

describe('Hoops session: entering totals', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('logs a spot with two taps: the court, then how many went in', async () => {
    render(<NewBasketballSessionPage />);
    await openTotals();

    // Nothing to log until the player says where they are
    expect((screen.getByRole('button', { name: '7 of 10 made' }) as HTMLButtonElement).disabled).toBe(true);

    tapCourt(25, 20);
    expect((screen.getByRole('combobox', { name: /spot/i }) as HTMLSelectElement).value).toBe('free-throw');

    fireEvent.click(screen.getByRole('button', { name: '7 of 10 made' }));
    expect(sessionTotal()).toBe('7/10 · 70%');
    expect(screen.getByText('Added 7/10 from Free throw')).toBeTruthy();

    // The spot and the shots per spot stay, so the next round is one tap
    fireEvent.click(screen.getByRole('button', { name: '4 of 10 made' }));
    expect(sessionTotal()).toBe('11/20 · 55%');
  });

  it('undoes a whole spot in one tap', async () => {
    render(<NewBasketballSessionPage />);
    await openTotals();
    tapCourt(25, 20);
    fireEvent.click(screen.getByRole('button', { name: '6 of 10 made' }));
    fireEvent.click(screen.getByRole('button', { name: '9 of 10 made' }));
    expect(sessionTotal()).toBe('15/20 · 75%');

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(sessionTotal()).toBe('6/10 · 60%');
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
  });

  it('fixes a tap that landed in the wrong zone from the list', async () => {
    render(<NewBasketballSessionPage />);
    await openTotals();
    tapCourt(5, 6);
    const spot = screen.getByRole('combobox', { name: /spot/i });
    expect((spot as HTMLSelectElement).value).toBe('mid-left-corner');
    fireEvent.change(spot, { target: { value: 'three-left-corner' } });
    fireEvent.click(screen.getByRole('button', { name: '3 of 10 made' }));
    expect(screen.getByText('Added 3/10 from 3 left corner')).toBeTruthy();
  });

  it('switches to typing the makes for more than 20 shots', async () => {
    render(<NewBasketballSessionPage />);
    await openTotals();
    tapCourt(25, 20);

    fireEvent.change(screen.getByRole('textbox', { name: /other number of shots/i }), { target: { value: '50' } });
    expect(screen.queryByRole('button', { name: /of 50 made/ })).toBeNull();

    fireEvent.change(screen.getByRole('textbox', { name: 'Makes' }), { target: { value: '41' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(sessionTotal()).toBe('41/50 · 82%');
  });

  it('refuses more makes than shots, and an empty box', async () => {
    render(<NewBasketballSessionPage />);
    await openTotals();
    tapCourt(25, 20);
    fireEvent.change(screen.getByRole('textbox', { name: /other number of shots/i }), { target: { value: '30' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Makes' }), { target: { value: '31' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(screen.getByText(/makes no more than shots/)).toBeTruthy();
    expect(sessionTotal()).toBe('0/0 · –');
  });
});

describe('Hoops session: remembered on the phone', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('opens in the mode and shots per spot the player last used', async () => {
    const first = render(<NewBasketballSessionPage />);
    await openTotals();
    fireEvent.click(screen.getByRole('button', { name: '5' }));
    expect(JSON.parse(localStorage.getItem(PREFS_KEY)!)).toEqual({ mode: 'totals', attempts: 5 });
    first.unmount();

    render(<NewBasketballSessionPage />);
    expect((await screen.findByRole('button', { name: 'Enter totals' })).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '5' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: '5 of 5 made' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: '6 of 5 made' })).toBeNull();
  });

  it('keeps the spot when an unfinished session is reopened', async () => {
    const first = render(<NewBasketballSessionPage />);
    await screen.findByRole('button', { name: 'Enter totals' });
    tapCourt(25, 20);
    fireEvent.click(screen.getByRole('button', { name: 'MAKE' }));
    expect(JSON.parse(localStorage.getItem(DRAFT_KEY)!).spot.zone).toBe('free-throw');
    first.unmount();

    render(<NewBasketballSessionPage />);
    const make = await screen.findByRole('button', { name: 'MAKE' });
    expect((make as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(make);
    expect(sessionTotal()).toBe('2/2 · 100%');
  });

  it('stays on tracking every shot when the database cannot say whether the player is new', async () => {
    render(<NewBasketballSessionPage />);
    expect((await screen.findByRole('button', { name: 'Track every shot' })).getAttribute('aria-pressed')).toBe('true');
  });
});

// The welcome screen, the Today card and the starting steps all describe
// logging as "tap where you shot from, then how many went in", so a player's
// first log opens there rather than on a tap after every shot.
describe("Hoops session: a new player's first log", () => {
  beforeEach(() => {
    localStorage.clear();
    db.sessions = null;
    db.asked = 0;
  });

  /** Waits until the page has asked the database about saved sessions, and acted on the answer */
  async function answered() {
    await waitFor(() => expect(db.asked).toBe(1));
    await act(async () => {});
  }

  function pressed(name: string) {
    return screen.getByRole('button', { name }).getAttribute('aria-pressed');
  }

  it('opens in Enter totals, with 10 per spot ready', async () => {
    db.sessions = 0;
    render(<NewBasketballSessionPage />);
    await waitFor(() => expect(pressed('Enter totals')).toBe('true'));
    const tens = within(screen.getByText('How many went in?').parentElement!).getAllByRole('button');
    expect(tens).toHaveLength(11);
    expect(localStorage.getItem(PREFS_KEY)).toBeNull();
  });

  it('keeps tracking every shot for a player who has logged a session before', async () => {
    db.sessions = 3;
    render(<NewBasketballSessionPage />);
    await answered();
    expect(pressed('Track every shot')).toBe('true');
  });

  it('keeps the mode a new player already picked on this phone', async () => {
    localStorage.setItem(PREFS_KEY, JSON.stringify({ mode: 'track', attempts: 10 }));
    db.sessions = 0;
    render(<NewBasketballSessionPage />);
    await answered();
    expect(pressed('Track every shot')).toBe('true');
  });
});


describe('Hoops session: funnel steps (E3)', () => {
  beforeEach(() => {
    localStorage.clear();
    tracked.length = 0;
  });

  it('records that the logger was opened, once', async () => {
    render(<NewBasketballSessionPage />);
    await openTotals();
    expect(tracked).toEqual(['log_opened']);
  });

  it('records Finish only when it opens, which needs something logged', async () => {
    render(<NewBasketballSessionPage />);
    await openTotals();

    // Nothing logged yet: Finish refuses, so it is not recorded
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(tracked).toEqual(['log_opened']);

    tapCourt(25, 20);
    fireEvent.click(screen.getByRole('button', { name: '7 of 10 made' }));
    fireEvent.click(screen.getByRole('button', { name: 'Finish' }));
    expect(tracked).toEqual(['log_opened', 'log_finish_opened']);
  });
});
