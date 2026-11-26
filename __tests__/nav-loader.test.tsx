// __tests__/nav-loader.test.tsx
// The slogan pill on every move between pages (NavLoader): up at once on a
// tap to another in-app page, a new line each time, at least the minimum time,
// gone once the new page is there; never for links that leave or stay put.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { resetLoaderSlogan } from '@/components/brand/PageLoader';
import { SHORT_SLOGANS } from '@/lib/slogans';

let path = '/dashboard';
vi.mock('next/navigation', () => ({ usePathname: () => path }));
const { NavLoader, NAV_PILL_MIN_MS, navTarget } = await import('@/components/brand/NavLoader');

function link(href: string, attrs: Record<string, string> = {}) {
  const a = document.createElement('a');
  a.href = href;
  for (const [k, v] of Object.entries(attrs)) a.setAttribute(k, v);
  a.textContent = 'go';
  document.body.appendChild(a);
  return a;
}
const click = (el: Element, init: MouseEventInit = {}) =>
  act(() => { el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init })); });
const line = () => screen.queryByRole('status')?.textContent?.replace('Loading', '') ?? null;

beforeEach(() => {
  vi.useFakeTimers();
  resetLoaderSlogan();
  path = '/dashboard';
  window.history.replaceState({}, '', '/dashboard');
  document.documentElement.setAttribute('data-sl', '0');
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('the navigation pill', () => {
  it('comes up at once on a tap to another page, with a new line each time', () => {
    const view = render(<NavLoader />);
    expect(line()).toBeNull();
    click(link('/basketball'));
    const first = line();
    expect(first).toBe(SHORT_SLOGANS[0].text);
    // the new page arrives; the pill stays the minimum, then goes
    path = '/basketball';
    window.history.replaceState({}, '', '/basketball');
    view.rerender(<NavLoader />);
    act(() => { vi.advanceTimersByTime(NAV_PILL_MIN_MS + 250); });
    act(() => { vi.advanceTimersByTime(300); });
    expect(line()).toBeNull();
    click(link('/basketball/new')); // a page inside the same section shows it too
    expect(line()).toBe(SHORT_SLOGANS[1].text);
  });

  it('stays up at least the minimum even when the page is instant', () => {
    const view = render(<NavLoader />);
    click(link('/profile'));
    path = '/profile';
    window.history.replaceState({}, '', '/profile');
    view.rerender(<NavLoader />);
    act(() => { vi.advanceTimersByTime(NAV_PILL_MIN_MS - 100); });
    expect(line()).not.toBeNull();
  });

  it('ignores links that leave the app, open a new tab, or go nowhere new', () => {
    render(<NavLoader />);
    click(link('https://example.com/x'));
    click(link('/basketball', { target: '_blank' }));
    click(link('/dashboard'));
    click(link('/basketball'), { metaKey: true });
    expect(line()).toBeNull();
  });

  it('works out the target from the click', () => {
    const a = link('/games/new?x=1');
    const e = new MouseEvent('click', { bubbles: true, button: 0 });
    Object.defineProperty(e, 'target', { value: a });
    expect(navTarget(e, window.location)?.pathname).toBe('/games/new');
  });
});
