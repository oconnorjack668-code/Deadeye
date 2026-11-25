// __tests__/opening.test.ts
// The opening animation's head script (src/lib/opening.ts): A, B, C in turn
// per cold open, A first on a new device, random when localStorage is
// blocked, once per visit, never on the website's own pages, B's file only
// when B plays with motion allowed, and a tap skips. Runs the real inlined
// script text, as the browser does.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OPENING_SCRIPT, MIN_SHOW_MS, earlyExitDelay, SWISH_SRC, VISIT_GAP_MS } from '@/lib/opening';
import { SHORT_SLOGANS } from '@/lib/slogans';

class MemoryStorage {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.has(k) ? (this.data.get(k) as string) : null; }
  setItem(k: string, v: string) { this.data.set(k, String(v)); }
  removeItem(k: string) { this.data.delete(k); }
}
const blocked = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('SecurityError'); },
};

let local: MemoryStorage | typeof blocked;
let session: MemoryStorage | typeof blocked;
let reducedMotion = false;

function setStorage(name: 'localStorage' | 'sessionStorage', s: unknown) {
  Object.defineProperty(window, name, { configurable: true, get: () => s });
}

/** One page load: a fresh <html> state, then the head script. */
function coldOpen(path = '/dashboard') {
  const root = document.documentElement;
  root.removeAttribute('data-open');
  root.removeAttribute('data-sl');
  root.className = '';
  document.head.querySelectorAll('script').forEach((s) => s.remove());
  window.history.replaceState({}, '', path);
  setStorage('localStorage', local);
  setStorage('sessionStorage', session);
  new Function(OPENING_SCRIPT)();
  return root.getAttribute('data-open');
}
/** A new visit: the tab's sessionStorage starts empty, localStorage is kept. */
const newVisit = () => { session = new MemoryStorage(); };

beforeEach(() => {
  local = new MemoryStorage();
  session = new MemoryStorage();
  reducedMotion = false;
  window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: q.includes('reduce') && reducedMotion })) as never;
});
afterEach(() => vi.restoreAllMocks());

describe('the opening rotation', () => {
  it('plays A on a brand-new device, then B, then C, then A again, one per visit', () => {
    const seen: (string | null)[] = [];
    for (let i = 0; i < 4; i++) {
      newVisit();
      seen.push(coldOpen());
    }
    expect(seen).toEqual(['a', 'b', 'c', 'a']);
    expect((local as MemoryStorage).getItem('dd-open-n')).toBe('0');
  });

  it('picks at random when localStorage is blocked', () => {
    local = blocked;
    vi.spyOn(Math, 'random').mockReturnValue(0.9);
    expect(coldOpen()).toBe('c');
    newVisit();
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
    expect(coldOpen()).toBe('a');
  });

  it('starts again at A if the stored counter is not a number', () => {
    (local as MemoryStorage).setItem('dd-open-n', 'junk');
    expect(coldOpen()).toBe('a');
  });

  it('plays once per visit: a reload or a second tab load in the same visit shows nothing', () => {
    expect(coldOpen()).toBe('a');
    expect(coldOpen()).toBeNull();
    expect(coldOpen('/profile')).toBeNull();
    // and the turn did not advance
    newVisit();
    expect(coldOpen()).toBe('b');
  });

  it('plays again on a cold open after a long gap, even if sessionStorage survived (installed app)', () => {
    const t0 = 1_000_000_000_000;
    const now = vi.spyOn(Date, 'now').mockReturnValue(t0);
    expect(coldOpen()).toBe('a');
    now.mockReturnValue(t0 + 5 * 60 * 1000);
    expect(coldOpen()).toBeNull(); // a reload five minutes later
    now.mockReturnValue(t0 + VISIT_GAP_MS + 1);
    expect(coldOpen()).toBe('b'); // same tab, half an hour on
  });

  it('shows nothing when sessionStorage is blocked, so it can never repeat on every load', () => {
    session = blocked;
    expect(coldOpen()).toBeNull();
    expect(coldOpen()).toBeNull();
  });

  it("never plays on the website's own pages, and does not use up the visit there", () => {
    for (const p of ['/', '/privacy', '/terms', '/parents', '/competition', '/install', '/clubs', '/auth/callback']) {
      expect(coldOpen(p), p).toBeNull();
    }
    expect(coldOpen('/login')).toBe('a');
    newVisit();
    expect(coldOpen('/clubs/abc')).toBe('b');
  });

  it('writes nothing to the device on website pages (ePrivacy: storage only where it is used)', () => {
    for (const p of ['/', '/privacy', '/parents/abc', '/competition']) {
      coldOpen(p);
      for (const k of ['dd-open-n', 'dd-sl-last', 'dd-open-t']) expect(local.getItem(k), `${p} ${k}`).toBeNull();
      for (const k of ['dd-opened', 'dd-sl']) expect(session.getItem(k), `${p} ${k}`).toBeNull();
      expect(document.documentElement.getAttribute('data-sl'), p).toBeNull();
    }
  });

  it('loads the swish file only when B plays with motion allowed', () => {
    const swish = () => [...document.head.querySelectorAll('script')].some((s) => s.getAttribute('src') === SWISH_SRC);
    coldOpen(); // a
    expect(swish()).toBe(false);
    newVisit();
    expect(coldOpen()).toBe('b');
    expect(swish()).toBe(true);
    reducedMotion = true;
    (local as MemoryStorage).setItem('dd-open-n', '0');
    newVisit();
    expect(coldOpen()).toBe('b'); // still B's turn: it shows as the still lockup
    expect(swish()).toBe(false);
  });

  it('a tap or a key skips it', () => {
    coldOpen();
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(document.documentElement.classList.contains('dd-open-skip')).toBe(true);
  });
});

describe("the visit's slogan", () => {
  it('stays the same across reloads in a visit and changes on the next visit', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    coldOpen();
    const first = document.documentElement.getAttribute('data-sl');
    coldOpen('/profile');
    expect(document.documentElement.getAttribute('data-sl')).toBe(first);
    newVisit();
    coldOpen();
    expect(document.documentElement.getAttribute('data-sl')).not.toBe(first);
  });

  it('is picked even when storage is blocked, inside the list', () => {
    local = blocked;
    session = blocked;
    coldOpen();
    const k = Number(document.documentElement.getAttribute('data-sl'));
    expect(k).toBeGreaterThanOrEqual(0);
    expect(k).toBeLessThan(SHORT_SLOGANS.length);
  });
});

describe('when the app ends the opening', () => {
  it('waits for the minimum, so the slogan is up long enough to read, then exits when the app is ready', () => {
    expect(earlyExitDelay(MIN_SHOW_MS.a, 300, 2000)).toBe(1500);
    expect(earlyExitDelay(MIN_SHOW_MS.a, 1900, 2000)).toBe(0);
    // the slogan finishes rising at about 1.16 s; it must still be on screen well after that
    expect(MIN_SHOW_MS.a).toBeGreaterThanOrEqual(1700);
    expect(MIN_SHOW_MS.c).toBeGreaterThanOrEqual(1700);
  });
  it('never holds an opening past its own end', () => {
    expect(earlyExitDelay(MIN_SHOW_MS.a, 2100, 2000)).toBeNull();
    // reduced motion: the still leaves at 1.4 s on its own, before the minimum
    expect(earlyExitDelay(MIN_SHOW_MS.a, 100, 1400)).toBeNull();
  });
  it('lets B land its lock and slogan before leaving', () => {
    expect(earlyExitDelay(MIN_SHOW_MS.b, 200, 2600)).toBe(2200);
  });
});
