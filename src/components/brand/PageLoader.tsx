// src/components/brand/PageLoader.tsx
// The pill that shows while a page is still loading after 400 ms: the logo
// ball turning and the visit's slogan (docs/agent-os/design/
// 2026-11-22-loading.md, section 3). A page that loads sooner never shows it:
// the delay is in CSS (.deadeye-loader-in), so it costs nothing to render.
'use client';

import React, { useSyncExternalStore } from 'react';
import { SHORT_SLOGANS, visitSlogan } from '@/lib/slogans';

const noSubscribe = () => () => {};

export function PageLoader() {
  // The head script's pick for this visit; the first line on the server
  const slogan = useSyncExternalStore(noSubscribe, () => visitSlogan(), () => SHORT_SLOGANS[0]);
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
