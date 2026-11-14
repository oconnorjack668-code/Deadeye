// src/components/study/IqTabs.tsx
// The three parts of the IQ tab: Lessons, Film and Plays, shown at the top of
// each (docs/plans/film-and-plays.md section 4). Plain links, so it needs no
// JavaScript and each part keeps its own address.
import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const IQ_TABS = [
  { id: 'lessons', href: '/study', label: 'Lessons' },
  { id: 'film', href: '/film', label: 'Film' },
  { id: 'plays', href: '/plays', label: 'Plays' },
] as const;

export type IqTab = (typeof IQ_TABS)[number]['id'];

export function IqTabs({ active }: { active: IqTab }) {
  return (
    <nav aria-label="Basketball IQ" className="mb-5 grid grid-cols-3 gap-1 rounded-xl border border-zinc-800 bg-zinc-900/70 p-1">
      {IQ_TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === active ? 'page' : undefined}
          className={cn(
            'flex h-11 items-center justify-center rounded-lg text-sm font-semibold',
            tab.id === active ? 'bg-blue-600 text-white' : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
