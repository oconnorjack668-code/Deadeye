// src/components/brand/OpeningSplashRunner.tsx
// Starts the opening once the app is on screen, then takes data-open off
// <html> when it has finished, so the splash is gone from the page.
//
// The splash HTML arrives with the page and is held at its first frame (CSS in
// opening.css, until html.dd-open-run). This runs when React has hydrated,
// which is when the phone has finished the heavy work of loading the app and
// its own splash screen is gone; it waits two frames so the first frame of the
// opening has really been painted, then starts it. Before 25 Nov 2026 the
// clock started as the HTML was parsed, so most of the opening played behind
// the phone's splash screen and players saw only its last second.
//
// The opening then plays to its own end (MIN_SHOW_MS is its full length); a
// tap or a key still skips it. The head script starts it anyway after
// RUN_FALLBACK_MS if this never runs.
'use client';

import { useEffect } from 'react';
import { MIN_SHOW_MS, RUN_CLASS, RUN_EVENT, earlyExitDelay, isOpening } from '@/lib/opening';

const END = /^dd-open-(exit|out|skip|wait)/;

export function OpeningSplashRunner() {
  useEffect(() => {
    const root = document.documentElement;
    const stage = document.getElementById('dd-open');
    const open = root.getAttribute('data-open');
    if (!stage || !isOpening(open)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let raf = 0;

    const finish = () => {
      root.removeAttribute('data-open');
      root.classList.remove('dd-open-out', 'dd-open-skip', 'dd-b-go', RUN_CLASS);
    };
    const onEnd = (e: AnimationEvent) => {
      if (e.target === stage && END.test(e.animationName)) finish();
    };
    // The splash's own exit animation knows how long it has run and when it would end
    const schedule = () => {
      const exit = stage.getAnimations?.().find((a): a is CSSAnimation => 'animationName' in a && String(a.animationName).startsWith('dd-open-exit'));
      if (!exit) return;
      const elapsed = Number(exit.currentTime ?? 0);
      const ownEnd = Number(exit.effect?.getTiming().delay ?? 0);
      const wait = earlyExitDelay(MIN_SHOW_MS[open], elapsed, ownEnd);
      if (wait !== null) timer = setTimeout(() => root.classList.add('dd-open-out'), wait);
    };
    const run = () => {
      if (root.classList.contains(RUN_CLASS)) return;
      root.classList.add(RUN_CLASS);
      document.dispatchEvent(new Event(RUN_EVENT));
    };

    stage.addEventListener('animationend', onEnd);
    // B starts when /opening/swish.js has drawn the hoop (it waits for the run too)
    const waitForB = open === 'b' && !root.classList.contains('dd-b-go');
    if (waitForB) document.addEventListener('dd-open-go', schedule, { once: true });
    // Two frames: the first frame of the opening is on screen before it moves
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        run();
        if (!waitForB) schedule();
      });
    });
    return () => {
      stage.removeEventListener('animationend', onEnd);
      document.removeEventListener('dd-open-go', schedule);
      cancelAnimationFrame(raf);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
