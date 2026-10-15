// src/app/(app)/train/page.tsx
import React from 'react';
import Link from 'next/link';
import { requireUser, getCurrentProfile } from '@/lib/auth';
import { PageHeader } from '@/components/layout/PageHeader';
import { CalendarCheck, Wand2, ListChecks, Sparkles, Video, Users, BookHeart, Trophy, ChevronRight, Medal, Crosshair, Crown, Shield, UserPlus, MessageCircle, ClipboardList, ClipboardCheck } from 'lucide-react';

export const metadata = { title: 'Train - Deadeye' };

interface Item {
  href: string;
  icon: typeof CalendarCheck;
  title: string;
  desc: string;
  /** Tailwind classes for the icon tile - keeps each group visually distinct */
  tile: string;
  iconColor: string;
  badge?: string;
}

/**
 * Sixteen equally-weighted cards in one flat grid made this page a wall. The
 * features are grouped by what the player is actually trying to do, so the page
 * can be scanned by intent rather than read end to end.
 */
const GROUPS: Array<{ label: string; labelColor: string; items: Item[] }> = [
  {
    label: 'Plan',
    labelColor: 'text-orange-400',
    items: [
      { href: '/programs', icon: CalendarCheck, title: 'Programs', desc: 'Multi-week plans', tile: 'bg-orange-600/20', iconColor:'text-orange-400' },
      { href: '/train/generate', icon: Wand2, title: 'Workout builder', desc: 'Pick time and focus', tile: 'bg-amber-600/20', iconColor:'text-amber-400' },
      { href: '/goals', icon: Crosshair, title: 'Goals', desc: 'Set weekly targets', tile: 'bg-orange-600/20', iconColor:'text-orange-300' },
    ],
  },
  {
    label: 'Learn',
    labelColor: 'text-blue-400',
    items: [
      { href: '/drills', icon: ListChecks, title: 'Drill library', desc: 'Steps, cues and mistakes', tile: 'bg-orange-600/20', iconColor:'text-orange-400' },
      { href: '/style-match', icon: Users, title: 'Play style match', desc: 'NBA players you play like', tile: 'bg-cyan-600/20', iconColor:'text-cyan-400' },
      { href: '/guides', icon: BookHeart, title: 'Guides', desc: 'Mindset, recovery, nutrition', tile: 'bg-emerald-600/20', iconColor:'text-emerald-400' },
    ],
  },
  {
    label: 'Compete',
    labelColor: 'text-amber-400',
    items: [
      { href: '/games', icon: ClipboardList, title: 'Game stats', desc: 'Live tracking, averages', tile: 'bg-amber-600/20', iconColor:'text-amber-400' },
      { href: '/achievements', icon: Medal, title: 'Achievements', desc: 'Challenges, badges, rank', tile: 'bg-amber-600/20', iconColor:'text-amber-300' },
      { href: '/friends', icon: UserPlus, title: 'Friends', desc: 'Weekly leaderboard', tile: 'bg-cyan-600/20', iconColor:'text-cyan-400' },
      { href: '/leaderboard', icon: Trophy, title: 'Leaderboard', desc: 'Season points and streaks', tile: 'bg-amber-600/20', iconColor:'text-amber-300' },
    ],
  },
  {
    label: 'Coaching',
    labelColor: 'text-red-400',
    items: [
      { href: '/ai-coach', icon: Sparkles, title: 'AI coach', desc: 'Feedback on your sessions', tile: 'bg-red-600/20', iconColor:'text-red-400' },
      { href: '/ai-coach/chat', icon: MessageCircle, title: 'Ask coach', desc: 'Chat, knows your numbers', tile: 'bg-red-600/20', iconColor:'text-red-300' },
      { href: '/video', icon: Video, title: 'Video AI', desc: 'Shot tracking, form check, jump test', tile: 'bg-red-600/20', iconColor:'text-red-400' },
      { href: '/teams', icon: Shield, title: 'Teams', desc: 'Join a team, roster', tile: 'bg-blue-600/20', iconColor:'text-blue-400' },
      { href: '/coach', icon: ClipboardCheck, title: 'Coach dashboard', desc: 'All your teams', tile: 'bg-indigo-600/20', iconColor:'text-indigo-400', badge: 'PRO' },
      { href: '/pro', icon: Crown, title: 'Deadeye Pro', desc: 'Unlimited AI coaching', tile: 'bg-amber-600/20', iconColor:'text-amber-300' },
    ],
  },
];

export default async function TrainPage() {
  await requireUser();
  const profile = await getCurrentProfile();
  // A player who switched AI coaching off should not be offered it again from
  // the hub. Everything else on this page is unaffected - the toggle turns off
  // the commentary, not the app.
  const aiOff = profile?.ai_coaching_enabled === false;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto">
        <PageHeader tone="train" icon={CalendarCheck} title="Train" subtitle="Plan, learn and improve" />

        {GROUPS.map((group) => {
          const items = aiOff ? group.items.filter((s) => !s.href.startsWith('/ai-coach')) : group.items;
          return (
          <section key={group.label} className="mb-6">
            <h2 className={`mb-2 text-xs font-bold uppercase tracking-wider ${group.labelColor}`}>{group.label}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {items.map((s) => {
                const Icon = s.icon;
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3.5 hover:bg-zinc-900 hover:border-zinc-700 transition-colors"
                  >
                    <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${s.tile}`}>
                      <Icon className={`h-5 w-5 ${s.iconColor}`} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-white">{s.title}</span>
                        {s.badge && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                            {s.badge}
                          </span>
                        )}
                      </span>
                      <span className="block text-xs text-zinc-500">{s.desc}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-600" />
                  </Link>
                );
              })}
            </div>
          </section>
          );
        })}
      </div>
    </div>
  );
}
