// __tests__/opening-splash.test.tsx
// The opening splash in the page: hidden from screen readers, gone once its
// exit or a skip ends, and opening B's file (public/opening/swish.js) builds
// the hoop around the logo and starts it in one go. Also the page loader's
// pill: announced as "Loading", with the visit's slogan hidden from readers.
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, act } from '@testing-library/react';
import { OpeningSplash } from '@/components/brand/OpeningSplash';
import { PageLoader } from '@/components/brand/PageLoader';
import { SHORT_SLOGANS } from '@/lib/slogans';

const SWISH = fs.readFileSync(path.join(__dirname, '..', 'public', 'opening', 'swish.js'), 'utf8');
type Swish = { netD: (t: number) => string; css: () => string; start: () => boolean; ballY: (t: number) => number };

afterEach(() => {
  cleanup();
  const root = document.documentElement;
  root.removeAttribute('data-open');
  root.removeAttribute('data-sl');
  root.className = '';
  document.head.querySelectorAll('style').forEach((s) => s.remove());
});

function endAnimation(el: Element, name: string) {
  const e = new Event('animationend', { bubbles: true });
  Object.defineProperty(e, 'animationName', { value: name });
  el.dispatchEvent(e);
}

describe('the opening splash', () => {
  it('is hidden from screen readers and carries every short slogan for the head script to pick', () => {
    const { container } = render(<OpeningSplash />);
    const stage = container.querySelector('#dd-open');
    expect(stage?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelectorAll('.dd-open-slogan [data-i]')).toHaveLength(SHORT_SLOGANS.length);
  });

  it('leaves the page when its exit or a skip ends', () => {
    const root = document.documentElement;
    root.setAttribute('data-open', 'a');
    const { container } = render(<OpeningSplash />);
    const stage = container.querySelector('#dd-open') as HTMLElement;
    endAnimation(stage.querySelector('.dd-open-word') as Element, 'dd-open-rise'); // a child's animation: still up
    expect(root.getAttribute('data-open')).toBe('a');
    root.classList.add('dd-open-skip');
    endAnimation(stage, 'dd-open-skip');
    expect(root.getAttribute('data-open')).toBeNull();
    expect(root.classList.contains('dd-open-skip')).toBe(false);
  });
});

describe("opening B's swish file", () => {
  function loadSwish(): Swish {
    new Function(SWISH)();
    return (window as unknown as { __ddSwish: Swish }).__ddSwish;
  }

  it('draws a net that moves and a ball that lands exactly in the logo', () => {
    const s = loadSwish();
    expect(s.netD(0)).toMatch(/^M[\d. ]+L/);
    expect(s.netD(700)).not.toBe(s.netD(0)); // the ball is in the net
    expect(s.ballY(2000)).toBe(335);
    const css = s.css();
    for (const k of ['dd-b-drop', 'dd-b-spin', 'dd-b-fx', 'dd-b-bks']) expect(css).toContain(`@keyframes ${k}`);
    // Keyframes move transform and opacity only, so they stay on the compositor
    const props = new Set([...css.matchAll(/@keyframes[^{]*\{((?:[^{}]*\{[^}]*\})*)\}/g)].flatMap((m) => [...m[1].matchAll(/([a-z-]+):/g)].map((p) => p[1])));
    expect([...props].sort()).toEqual(['animation-timing-function', 'opacity', 'transform']);
  });

  it('builds the hoop around the splash and starts it once the app is on screen, only when B was picked', () => {
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { cb(0); return 0; });
    const go = vi.fn();
    document.addEventListener('dd-open-go', go);
    const root = document.documentElement;
    render(<OpeningSplash />);
    const s = loadSwish();
    expect(s.start()).toBe(false); // not B
    root.setAttribute('data-open', 'b');
    expect(s.start()).toBe(true);
    expect(document.querySelectorAll('.dd-b-scene')).toHaveLength(2);
    expect(document.getElementById('ddneta')?.getAttribute('values')?.split(';').length).toBeGreaterThan(60);
    // the hoop is drawn, but B waits until the app is on screen
    expect(root.classList.contains('dd-b-go')).toBe(false);
    expect(go).not.toHaveBeenCalled();
    root.classList.add('dd-open-run');
    document.dispatchEvent(new Event('dd-open-run'));
    expect(root.classList.contains('dd-b-go')).toBe(true);
    expect(go).toHaveBeenCalledTimes(1);
    expect(s.start()).toBe(false); // never twice
    document.removeEventListener('dd-open-go', go);
    root.classList.remove('dd-open-run', 'dd-b-go');
    root.removeAttribute('data-open');
    vi.unstubAllGlobals();
  });
});

describe('the page loader pill', () => {
  it('is announced as Loading and shows the visit’s slogan, hidden from readers', async () => {
    document.documentElement.setAttribute('data-sl', '3');
    await act(async () => {
      render(<PageLoader />);
    });
    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Loading');
    const line = screen.getByText(SHORT_SLOGANS[3].text);
    expect(line.getAttribute('aria-hidden')).toBe('true');
  });
});
