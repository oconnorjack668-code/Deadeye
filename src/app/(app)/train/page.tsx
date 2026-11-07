// src/app/(app)/train/page.tsx
import React from 'react';
import Link from 'next/link';
import { requireUser, getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getActiveProgram } from '@/lib/programs';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout/PageHeader';
import { CalendarCheck, Wand2, ListChecks, Sparkles, Video, Users, BookHeart, Trophy, ChevronRight, Medal, Crosshair, Crown, Shield, UserPlus, MessageCircle, ClipboardList, ClipboardCheck, Flame } from 'lucide-react';

export const metadata = { title: 'Train - Deadeye' };

interface Item {
  href: string;
  icon: typeof CalendarCheck;
  title: string;
  desc: string;
  /** The icon's colour, which says which group a row is in */
  iconColor: string;
  badge?: string;
}

/**
 * Sixteen equally-weighted cards in one flat grid made this page a wall. The
 * features are grouped by what the player is actually trying to do, so the page
 * can be scanned by intent rather than read end to end. Even grouped, sixteen
 * cards of equal weight still left nothing to start with, so the page now leads
 * with one thing - the next session of the player's program, or a quick
 * workout - and the groups below are plain rows, icons inline rather than in
 * coloured tiles (docs/design.md, "Avoid").
 *
 * Every icon takes its group's colour, so the colour says which group a row
 * is in before its title is read. Each colour was chosen for what the group is
 * for. Plan is the brand orange: action, and the first thing on the page. Learn
 * is blue, calm and focused, for reading. Compete is gold, the colour of
 * medals. Coaching is violet rather than red, because red already means MISS
 * in the shot tracker. The one exception is Deadeye Pro, which stays gold
 * wherever it appears, so that premium always looks the same.
 */
const PLAN = { iconColor: 'text-orange-400' };
const LEARN = { iconColor: 'text-blue-400' };
const COMPETE = { iconColor: 'text-amber-400' };
const COACHING = { iconColor: 'text-violet-400' };
const PREMIUM = { iconColor: 'text-amber-300' };

const GROUPS: Array<{ label: string; labelColor: string; items: Item[] }> = [
  {
    label: 'Plan',
    labelColor: 'text-orange-400',
    items: [
      { href: '/programs', icon: CalendarCheck, title: 'Programs', desc: 'Multi-week plans', ...PLAN },
      { href: '/train/generate', icon: Wand2, title: 'Workout builder', desc: 'Pick time and focus', ...PLAN },
      { href: '/goals', icon: Crosshair, title: 'Goals', desc: 'Set weekly targets', ...PLAN },
      { href: '/drills?skill=warm_up', icon: Flame, title: 'Warm-ups', desc: 'Before you play, with a timer', ...PLAN },
    ],
  },
  {
    label: 'Learn',
    labelColor: 'text-blue-400',
    items: [
      { href: '/drills', icon: ListChecks, title: 'Drill library', desc: 'Steps, cues and mistakes', ...LEARN },
      { href: '/style-match', icon: Users, title: 'Play style match', desc: 'NBA players you play like', ...LEARN },
      { href: '/guides', icon: BookHeart, title: 'Guides', desc: 'Mindset, recovery, nutrition', ...LEARN },
    ],
  },
  {
    label: 'Compete',
    labelColor: 'text-amber-400',
    items: [
      { href: '/games', icon: ClipboardList, title: 'Game stats', desc: 'Live tracking, averages', ...COMPETE },
      { href: '/achievements', icon: Medal, title: 'Achievements', desc: 'Challenges, badges, rank', ...COMPETE },
      { href: '/friends', icon: UserPlus, title: 'Friends', desc: 'Weekly leaderboard', ...COMPETE },
      { href: '/leaderboard', icon: Trophy, title: 'Leaderboard', desc: 'Season points and streaks', ...COMPETE },
    ],
  },
  {
    label: 'Coaching',
    labelColor: 'text-violet-400',
    items: [
      { href: '/ai-coach', icon: Sparkles, title: 'AI coach', desc: 'Feedback on your sessions', ...COACHING },
      { href: '/ai-coach/chat', icon: MessageCircle, title: 'Ask coach', desc: 'Chat, knows your numbers', ...COACHING },
      { href: '/video', icon: Video, title: 'Video AI', desc: 'Shot tracking, form check, jump test', ...COACHING },
      { href: '/teams', icon: Shield, title: 'Teams', desc: 'Join a team, roster', ...COACHING },
      { href: '/coach', icon: ClipboardCheck, title: 'Coach home', desc: 'Coach a team, free', ...COACHING },
      { href: '/pro', icon: Crown, title: 'Deadeye Pro', desc: 'Unlimited AI coaching', ...PREMIUM },
    ],
  },
];

export default async function TrainPage() {
  const user = await requireUser();
  const [profile, activeProgram] = await Promise.all([getCurrentProfile(), getActiveProgram(await createClient(), user.id)]);
  const next = activeProgram?.next ?? null;
  // A player who switched AI coaching off should not be offered it again from
  // the hub. Everything else on this page is unaffected - the toggle turns off
  // the commentary, not the app.
  const aiOff = profile?.ai_coaching_enabled === false;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl lg:max-w-5xl mx-auto">
        <PageHeader tone="train" icon={CalendarCheck} title="Train" subtitle="Plan, learn and improve" />

        {/* The one thing to do here: the program's next session, or, with no
            program on the go, a workout built for the time the player has */}
        <section className="mb-6 rounded-2xl border border-orange-600/40 bg-gradient-to-br from-orange-600/15 to-transparent p-5">
          <p className="text-xs font-bold uppercase tracking-wider text-orange-300">Next for you</p>
          {next && activeProgram ? (
            <>
              <p className="mt-1 text-xl font-black text-white">{next.title}</p>
              <p className="text-sm text-zinc-300">
                {activeProgram.program.name} · Week {next.week}, session {next.day} · {next.estimated_minutes} min
              </p>
              <Link href={`/programs/${activeProgram.program.slug}/day/${next.id}`} className="mt-3 inline-block">
                <Button variant="primary" size="sm">Start the session</Button>
              </Link>
            </>
          ) : (
            <>
              <p className="mt-1 text-xl font-black text-white">A workout for the time you have</p>
              <p className="text-sm text-zinc-300">Pick how long and what to work on, and it builds the session.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/train/generate">
                  <Button variant="primary" size="sm">Build a workout</Button>
                </Link>
                <Link href="/programs">
                  <Button variant="outline" size="sm">Follow a program</Button>
                </Link>
              </div>
            </>
          )}
        </section>

        {/* Two groups side by side on a laptop, one under another on a phone */}
        <div className="lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-6">
        {GROUPS.map((group) => {
          const items = aiOff ? group.items.filter((s) => !s.href.startsWith('/ai-coach')) : group.items;
          return (
          <section key={group.label} className="mb-6">
            <h2 className={`mb-2 text-xs font-bold uppercase tracking-wider ${group.labelColor}`}>{group.label}</h2>
            {/* One card per group, its features as rows: a list reads as
                "pick one of these", a grid of cards as "all of these matter" */}
            <div className="divide-y divide-zinc-800 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70">
              {items.map((s) => {
                const Icon = s.icon;
                return (
                  <Link
                    key={s.href}
                    href={s.href}
                    className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-zinc-800/50"
                  >
                    <Icon className={`h-5 w-5 flex-shrink-0 ${s.iconColor}`} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-white">{s.title}</span>
                        {s.badge && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-xs font-bold text-amber-300">
                            {s.badge}
                          </span>
                        )}
                      </span>
                      <span className="block text-sm text-zinc-400">{s.desc}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                  </Link>
                );
              })}
            </div>
          </section>
          );
        })}
        </div>
      </div>
    </div>
  );
}
