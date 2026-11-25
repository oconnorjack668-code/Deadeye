// src/components/brand/PageLoader.tsx
// The pill that shows while a page is still loading after 400 ms: the logo
// ball turning and a slogan (docs/agent-os/design/2026-11-22-loading.md,
// section 3). A page that loads sooner never shows it: the delay is in CSS
// (.deadeye-loader-in), so it costs nothing to render.
//
// The line changes each time the pill appears (founder, 25 Nov 2026: one line
// per visit meant the same one or two slogans every time). It never changes
// while the pill is on screen, so it is not a live rotation (WCAG 2.2.2). The
// first pill of a load shows the visit's line, the same one the opening
// showed; each later pill moves on to the next line in the list.
'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { SHORT_SLOGANS, visitSlogan } from '@/lib/slogans';

const noSubscribe = () => () => {};

// The last line a pill showed during this page load (client only)
let lastShown = -1;

/** The next line for a new pill: the visit's line first, then the following ones in turn. */
export function nextLoaderSlogan(): number {
  const n = SHORT_SLOGANS.length;
  lastShown = lastShown < 0 ? Math.max(0, SHORT_SLOGANS.indexOf(visitSlogan())) : (lastShown + 1) % n;
  return lastShown;
}

/** Tests only: forget which line was shown last. */
export function resetLoaderSlogan() {
  lastShown = -1;
}

export function PageLoader() {
  const hydrated = useSyncExternalStore(noSubscribe, () => true, () => false);
  // One pick per pill, made on the client when it mounts; the server and the
  // hydration pass render the first line, and the pill is still invisible
  // then (its 400 ms fade-in delay), so the swap is never seen
  const [pick] = useState(() => (typeof document === 'undefined' ? -1 : nextLoaderSlogan()));
  const slogan = hydrated && pick >= 0 ? SHORT_SLOGANS[pick] : SHORT_SLOGANS[0];
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[92px] z-30 flex justify-center px-4">
      <div
        role="status"
        className="deadeye-loader-in flex h-11 items-center gap-2.5 rounded-full border border-zinc-700 bg-zinc-900/95 pl-2 pr-4 shadow-lg shadow-black/30"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- tiny pre-sized static asset, as in Logo */}
        <img src="/logo.webp" alt="" width={26} height={26} className="deadeye-spin rounded-full" />
        <span className="sr-only">Loading</span>
        <span aria-hidden="true" className="whitespace-nowrap text-xs font-bold uppercase tracking-[0.2em] text-red-400">
          {slogan.text}
        </span>
      </div>
    </div>
  );
}
