// src/components/LandingHeader.tsx
// The landing page header, with a menu of the page's sections that stays on
// screen and shows where you are. On a phone - where nearly everyone reads
// this page - the section links used to be hidden entirely, so "how do I get
// the app" meant scrolling the whole page to find it. Here they sit in a strip
// under the logo that scrolls sideways, with Get the app first.
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { cn } from '@/lib/utils';

export const LANDING_SECTIONS = [
  { id: 'get-the-app', label: 'Get the app' },
  { id: 'features', label: 'Features' },
  { id: 'pricing', label: 'Pricing' },
  { id: 'parents', label: 'For parents' },
] as const;

export function LandingHeader() {
  const [active, setActive] = useState<string | null>(null);

  // The section nearest the top of the screen is the one being read. Watched
  // with an observer rather than a scroll handler, so nothing runs per frame.
  useEffect(() => {
    const els = LANDING_SECTIONS.map((s) => document.getElementById(s.id)).filter((e): e is HTMLElement => !!e);
    if (els.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) visible.set(e.target.id, e.isIntersecting);
        const first = LANDING_SECTIONS.find((s) => visible.get(s.id));
        setActive(first ? first.id : null);
      },
      // A band just under the header: a section counts while it crosses it
      { rootMargin: '-120px 0px -60% 0px', threshold: 0 }
    );
    els.forEach((e) => observer.observe(e));
    return () => observer.disconnect();
  }, []);

  const linkClass = (id: string) =>
    cn(
      'whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition-colors',
      active === id
        ? 'bg-zinc-100 text-zinc-950'
        : id === 'get-the-app'
          ? 'bg-orange-600/15 text-orange-300 hover:bg-orange-600/25'
          : 'text-zinc-400 hover:text-white'
    );

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-900 bg-zinc-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Logo size={28} />
          <span className="text-lg font-black uppercase tracking-tight text-white">Deadeye</span>
        </Link>
        <div className="flex items-center gap-1">
          <nav aria-label="Sections" className="mr-2 hidden items-center gap-1 md:flex">
            {LANDING_SECTIONS.map((s) => (
              <a key={s.id} href={`#${s.id}`} className={linkClass(s.id)} aria-current={active === s.id ? 'true' : undefined}>
                {s.label}
              </a>
            ))}
          </nav>
          <Link href="/login" className="rounded-lg px-3 py-1.5 text-sm text-zinc-300 hover:text-white">
            Log in
          </Link>
          <Link href="/signup" className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-orange-500">
            Start free
          </Link>
        </div>
      </div>
      {/* Phones and small tablets: the same sections as a strip that scrolls sideways */}
      <nav aria-label="Sections" className="border-t border-zinc-900/80 md:hidden">
        <div className="mx-auto flex max-w-5xl gap-1.5 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
          {LANDING_SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={linkClass(s.id)} aria-current={active === s.id ? 'true' : undefined}>
              {s.label}
            </a>
          ))}
        </div>
      </nav>
    </header>
  );
}
