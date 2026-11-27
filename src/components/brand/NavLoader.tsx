// src/components/brand/NavLoader.tsx
// The slogan pill on every move between pages in the app (founder, 26 Nov
// 2026: the pill only showed in some sections and sometimes kept the same
// line). It used to live in (app)/loading.tsx, which only shows when the top
// section changes (Today to Hoops, say) and the page takes over 400 ms, so a
// tap into a page inside a section never showed it, and a quick one never did.
//
// Now: tap a link to another page and the pill comes up at once with the next
// slogan, stays at least NAV_PILL_MIN_MS so it can be read, and fades out once
// the new page is there. Each pill is a new PageLoader (keyed), so each one
// takes the next line (PageLoader's nextLoaderSlogan). The line never changes
// while the pill is up (WCAG 2.2.2). It sits above the bottom bar and never
// takes taps.
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { PageLoader } from './PageLoader';

/** The shortest time the pill is up, so the slogan can be read. */
export const NAV_PILL_MIN_MS = 1200;
/** It never stays longer than this, even if the page never arrives. */
export const NAV_PILL_MAX_MS = 10000;
const FADE_MS = 200;

/** The in-app page a click is going to, or null when it is not a move to another page here. */
export function navTarget(e: MouseEvent, here: Location): URL | null {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return null;
  const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
  if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return null;
  let url: URL;
  try {
    url = new URL(a.href, here.href);
  } catch {
    return null;
  }
  if (url.origin !== here.origin) return null;
  if (url.pathname === here.pathname && url.search === here.search) return null;
  return url;
}

type Pill = { key: number; leaving: boolean } | null;

export function NavLoader() {
  const pathname = usePathname();
  const [pill, setPill] = useState<Pill>(null);
  const started = useRef<number | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  const leaveAfter = useCallback(
    (ms: number) => {
      clear();
      timers.current.push(
        setTimeout(() => {
          setPill((p) => (p ? { ...p, leaving: true } : p));
          timers.current.push(setTimeout(() => setPill(null), FADE_MS));
        }, ms)
      );
    },
    [clear]
  );

  // A tap on a link to another page: up at once, with the next line
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const url = navTarget(e, window.location);
      if (!url) return;
      started.current = performance.now();
      setPill((p) => ({ key: (p?.key ?? 0) + 1, leaving: false }));
      // Same page, new query: the pathname will not change, so just hold it the minimum
      leaveAfter(url.pathname === window.location.pathname ? NAV_PILL_MIN_MS : NAV_PILL_MAX_MS);
    };
    document.addEventListener('click', onClick, true);
    return () => {
      document.removeEventListener('click', onClick, true);
      clear();
    };
  }, [clear, leaveAfter]);

  // The new page is here: leave once the minimum is up
  useEffect(() => {
    if (started.current === null) return;
    leaveAfter(Math.max(0, NAV_PILL_MIN_MS - (performance.now() - started.current)));
  }, [pathname, leaveAfter]);

  return pill ? <PageLoader key={pill.key} instant leaving={pill.leaving} /> : null;
}
