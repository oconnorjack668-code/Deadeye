// src/components/layout/Navbar.tsx
'use client';

import React from 'react';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldAlert, Settings } from 'lucide-react';
import type { Profile } from '@/lib/auth';
import { Avatar } from '@/components/Avatar';
import { COACH_NAV_ITEMS, DESKTOP_NAV_ITEMS, isNavActive } from './BottomNav';
import { ModeSwitch } from './ModeSwitch';
import { MODE_HOME } from '@/lib/coachSide';
import type { AppMode } from '@/lib/supabase/types';

interface NavbarProps {
  profile: Profile | null;
  isOwner?: boolean;
  mode?: AppMode;
  /** Plays and coaches: shows the Playing / Coaching switch */
  canSwitch?: boolean;
}

export function Navbar({ profile, isOwner = false, mode = 'playing', canSwitch = false }: NavbarProps) {
  // Signing out lives in Settings, as a labelled button. An unlabelled icon here,
  // right beside Settings, was easy to tap by mistake.
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 md:px-8 max-w-7xl mx-auto">
        {/* Brand Logo */}
        <Link href={MODE_HOME[mode]} className="flex items-center gap-2.5">
          <Logo size={36} />
          {/* On phones the switch needs the room */}
          <div className={`${canSwitch ? 'hidden sm:flex' : 'flex'} flex-col`}>
            <span className="text-base font-black tracking-tight text-white uppercase leading-none">
              Deadeye
            </span>
            <span className={`text-[10px] font-semibold tracking-wider uppercase leading-none mt-0.5 ${mode === 'coaching' ? 'text-indigo-300' : 'text-red-400'}`}>
              {mode === 'coaching' ? 'Coaching' : 'Aim is earned'}
            </span>
          </div>
        </Link>

        {/* Desktop section links (phones use BottomNav) */}
        <nav className="hidden md:flex items-center gap-1">
          {(mode === 'coaching' ? COACH_NAV_ITEMS : DESKTOP_NAV_ITEMS).map((item: (typeof COACH_NAV_ITEMS)[number]) => {
            const Icon = item.icon;
            const isActive = isNavActive(pathname, item.match, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                  isActive ? 'bg-red-500/10 text-red-400' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side: Owner badge, Profile link, Settings */}
        <div className="flex items-center gap-2 sm:gap-3">
          {canSwitch && <ModeSwitch mode={mode} />}
          {isOwner && (
            <Link
              href="/admin"
              title="Owner tools"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold hover:bg-amber-500/20"
            >
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Owner Access</span>
            </Link>
          )}

          <Link
            href="/profile"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${
              pathname === '/profile'
                ? 'border-red-500 bg-red-500/10 text-white'
                : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 text-zinc-300'
            }`}
          >
            <Avatar name={profile?.display_name || 'Player'} emoji={profile?.avatar_emoji} color={profile?.avatar_color} size={24} />
            <span className="text-xs font-medium hidden sm:inline">
              {profile?.display_name || 'Player'}
            </span>
          </Link>

          <Link
            href="/settings"
            title="Settings"
            aria-label="Settings"
            className={`h-9 w-9 flex items-center justify-center rounded-xl border transition-colors ${
              pathname === '/settings'
                ? 'border-red-500 bg-red-500/10 text-white'
                : 'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:text-white'
            }`}
          >
            <Settings className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
