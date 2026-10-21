// src/components/layout/QuickLog.tsx
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, X, Target, Dumbbell, Camera, Trophy } from 'lucide-react';

const ACTIONS = [
  { href: '/basketball/new', label: 'Hoops session', hint: 'Drills and shooting', icon: Target, tone: 'bg-orange-600' },
  { href: '/workouts/new', label: 'Gym workout', hint: 'Sets, reps and tests', icon: Dumbbell, tone: 'bg-emerald-600' },
  { href: '/video', label: 'Track with camera', hint: 'Counts shots on your phone', icon: Camera, tone: 'bg-cyan-600' },
  { href: '/games/new', label: 'Game stats', hint: 'Box score from a real game', icon: Trophy, tone: 'bg-amber-600' },
];

// Screens where a floating "log something" button would be redundant or in the
// way: the logging forms themselves, the camera tracker, the coach chat (it sat
// on top of the send button), and the welcome screens a new player is guided
// through.
const HIDDEN_ON = [
  '/basketball/new',
  '/workouts/new',
  '/workouts/tests/new',
  '/games/new',
  '/video',
  '/onboarding',
  '/ai-coach/chat',
  '/welcome',
];

/**
 * Phone-only quick log action. Logging is the thing players do most, but it was
 * only reachable from the dashboard - from the Gym, IQ or a program day you had
 * to navigate home first. This puts it two taps from anywhere.
 */
export function QuickLog() {
  const pathname = usePathname();
  // Stored as "the route the menu was opened on" rather than a bare boolean, so
  // any navigation - a menu item, the bottom nav, the back button - closes it by
  // derivation instead of an effect that would cascade a second render.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (next: boolean) => setOpenAt(next ? pathname : null);

  useEffect(() => {
    if (!open) return;
    // setOpenAt rather than the setOpen helper: a useState setter is stable, so
    // the effect does not need it as a dependency.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenAt(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <div className="md:hidden">
      {open && (
        <>
          <button
            type="button"
            aria-label="Close log menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />
          <div
            role="menu"
            aria-label="Log training"
            className="fixed bottom-36 left-4 right-4 z-50 space-y-2"
          >
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.href}
                  href={a.href}
                  role="menuitem"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-2xl border border-zinc-700/70 bg-zinc-900 p-3 shadow-xl active:bg-zinc-800"
                >
                  <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${a.tone}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-white">{a.label}</span>
                    <span className="block text-xs text-zinc-400">{a.hint}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={open ? 'Close log menu' : 'Log training'}
        className={`fixed bottom-[5.5rem] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-2xl ring-1 ring-black/20 transition-transform active:scale-95 ${
          open ? 'bg-zinc-700 text-white' : 'bg-red-600 text-white'
        }`}
      >
        {open ? <X className="h-6 w-6" /> : <Plus className="h-7 w-7" />}
      </button>
    </div>
  );
}
