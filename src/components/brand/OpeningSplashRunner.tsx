// src/components/brand/OpeningSplashRunner.tsx
// Ends the opening once the app is ready (this runs when React has hydrated),
// but never before the lock lands (MIN_SHOW_MS) and never after the opening's
// own end, which the CSS already handles if this never runs. Then takes
// data-open off <html>, so the splash is gone from the page.
'use client';

import { useEffect } from 'react';
import { MIN_SHOW_MS, earlyExitDelay, isOpening } from '@/lib/opening';

const END = /^dd-open-(exit|out|skip|wait)/;

export function OpeningSplashRunner() {
  useEffect(() => {
    const root = document.documentElement;
    const stage = document.getElementById('dd-open');
    const open = root.getAttribute('data-open');
    if (!stage || !isOpening(open)) return;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = () => {
      root.removeAttribute('data-open');
      root.classList.remove('dd-open-out', 'dd-open-skip', 'dd-b-go');
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

    stage.addEventListener('animationend', onEnd);
    // B starts when /opening/swish.js has drawn the hoop
    const waitForB = open === 'b' && !root.classList.contains('dd-b-go');
    if (waitForB) document.addEventListener('dd-open-go', schedule, { once: true });
    else schedule();
    return () => {
      stage.removeEventListener('animationend', onEnd);
      document.removeEventListener('dd-open-go', schedule);
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
