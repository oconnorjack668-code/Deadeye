// src/components/layout/BottomNav.tsx
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Target, Dumbbell, Sparkles, BookOpen, Trophy, CalendarCheck, Shield, ClipboardList, ListChecks, NotebookPen } from 'lucide-react';
import type { AppMode } from '@/lib/supabase/types';
import { shownMode } from '@/lib/coachSide';

// Pages that live under the IQ hub (Lessons, Film, Plays) light up the IQ tab.
// /film-questions is listed on its own: it does not start with /film/.
export const IQ_PATHS = ['/study', '/film', '/plays', '/film-questions'];

// Pages that live under the Train hub light up the Train tab
const TRAIN_PATHS = ['/train', '/programs', '/drills', '/guides', '/style-match', '/video', '/ai-coach', '/leaderboard', '/achievements', '/goals'];

// Phones: five tabs (more than five gets cramped); everything else is in the Train hub
export const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: LayoutDashboard, match: ['/dashboard'] },
  { href: '/basketball', label: 'Hoops', icon: Target, match: ['/basketball'] },
  { href: '/workouts', label: 'Gym', icon: Dumbbell, match: ['/workouts'] },
  { href: '/train', label: 'Train', icon: CalendarCheck, match: TRAIN_PATHS },
  { href: '/study', label: 'IQ', icon: BookOpen, match: IQ_PATHS },
];

// Desktop top bar has room for the most-used hub pages too
export const DESKTOP_NAV_ITEMS = [
  ...NAV_ITEMS.slice(0, 3),
  { href: '/train', label: 'Train', icon: CalendarCheck, match: ['/train', '/programs', '/drills', '/guides', '/style-match', '/video'] },
  { href: '/study', label: 'IQ Study', icon: BookOpen, match: IQ_PATHS },
  { href: '/ai-coach', label: 'AI Coach', icon: Sparkles, match: ['/ai-coach'] },
  { href: '/leaderboard', label: 'Ranks', icon: Trophy, match: ['/leaderboard'] },
];

// Coaching mode: the coach home, teams, assignments, the playbook (plays the
// coach draws and each team's plays) and the drill library to plan a
// practice. Same five tabs on phones and desktop. Settings is the gear in the
// top bar on every screen, so it gave its tab to the playbook (F2).
export const COACH_NAV_ITEMS = [
  // Exact, so the home tab is not lit on /coach/assignments
  { href: '/coach', label: 'Home', icon: LayoutDashboard, match: ['/coach', '/coach/setup'], exact: true },
  { href: '/teams', label: 'Teams', icon: Shield, match: ['/teams'] },
  { href: '/coach/assignments', label: 'Assignments', icon: ClipboardList, match: ['/coach/assignments'] },
  { href: '/coach/playbook', label: 'Playbook', icon: NotebookPen, match: ['/coach/playbook', '/plays/new'] },
  { href: '/drills', label: 'Drills', icon: ListChecks, match: ['/drills'] },
];

export function isNavActive(pathname: string, match: string[], exact = false): boolean {
  return match.some((m) => pathname === m || (!exact && pathname.startsWith(`${m}/`)));
}

export function BottomNav({ mode: savedMode = 'playing' }: { mode?: AppMode }) {
  const pathname = usePathname();
  const mode = shownMode(savedMode, pathname);
  const items: Array<(typeof NAV_ITEMS)[number] & { exact?: boolean }> = mode === 'coaching' ? COACH_NAV_ITEMS : NAV_ITEMS;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/90 bg-zinc-950/95 backdrop-blur-lg md:hidden">
      <div className="grid grid-cols-5 px-1 pt-1.5 safe-bottom">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = isNavActive(pathname, item.match, item.exact);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`flex flex-col items-center justify-center py-1.5 rounded-xl transition-all ${
                isActive ? 'text-red-500 font-semibold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Icon className={`h-6 w-6 ${isActive ? 'scale-110' : ''} transition-transform`} />
              <span className="text-xs mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
