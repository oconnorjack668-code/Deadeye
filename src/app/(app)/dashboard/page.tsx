// src/app/(app)/dashboard/page.tsx
import React from 'react';
import { requireUser, getCurrentProfile, getCurrentSubscription } from '@/lib/auth';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { calculateDashboardMetrics, getShootingByZone } from '@/lib/dashboard';
import { Zap, TrendingUp, Target, Award, Star, Users, MessageCircle, Activity } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/server';
import { getActiveProgram } from '@/lib/programs';
import { loadAchievements } from '@/lib/achievements-server';
import { ShotHeatMap } from '@/components/basketball/ShotHeatMap';
import { recommendedProgramGoal, programGoalLabel } from '@/lib/recommend';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Dashboard - Deadeye',
};

/**
 * One stat tile. Extracted because the four were hand-written copies that had
 * already drifted apart - the consistency tile ended up with the plain grey
 * badge while the other three were tinted to match their number.
 *
 * The row wraps and the number steps down on small screens: in the two-column
 * phone grid a value like "37.5%" at text-3xl plus its badge is wider than the
 * card, and neither flex child could shrink, so the badge hung out of the side.
 */
function StatCard({
  label,
  value,
  badge,
  badgeVariant,
  valueClass,
  hint,
  children,
}: {
  label: string;
  value: React.ReactNode;
  badge: string;
  badgeVariant: React.ComponentProps<typeof Badge>['variant'];
  valueClass: string;
  hint: string;
  children?: React.ReactNode;
}) {
  return (
    <Card className="border-zinc-800 bg-zinc-900/70">
      <CardContent className="p-4 md:p-5">
        <div className="text-xs text-zinc-400 font-semibold uppercase tracking-wider mb-2">{label}</div>
        <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-1">
          <span className={`text-2xl sm:text-3xl font-black leading-none ${valueClass}`}>{value}</span>
          <Badge variant={badgeVariant} className="flex-shrink-0 text-[10px] sm:text-xs">
            {badge}
          </Badge>
        </div>
        <div className="text-xs text-zinc-500 mt-2">{hint}</div>
        {children}
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  // Players who never finished setup (e.g. the confirmation link didn't land them
  // on /onboarding) are sent there from their landing page
  if (!profile?.onboarding_completed) {
    redirect('/onboarding');
  }

  const supabase = await createClient();
  const [subscription, metrics, shootingByZone, activeProgram, achievements] = await Promise.all([
    getCurrentSubscription(),
    calculateDashboardMetrics(user.id),
    getShootingByZone(user.id),
    getActiveProgram(supabase, user.id),
    // Also awards any weekly challenges / badges earned since the last visit
    loadAchievements(user.id),
  ]);

  const weeklyGoalPercentage = Math.round((metrics.weeklyGoalProgress / metrics.weeklyGoalTarget) * 100);
  const recommendedGoal = recommendedProgramGoal(profile?.goals, profile?.focus_areas);
  const recommendedLabel = programGoalLabel(recommendedGoal);

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* Header. Deliberately compact: on a phone the old version spent the
            whole first screenful on a decorative icon, the player's own name at
            text-3xl and a slogan, pushing today's session below the fold. */}
        <h1 className="mb-4 text-xl md:text-3xl font-black tracking-tight text-white">
          {profile?.display_name || 'Player'}
          <span className="ml-2 align-middle text-sm font-semibold text-zinc-500">
            {metrics.currentStreak > 0 ? `${metrics.currentStreak}-day streak` : 'Start a streak today'}
          </span>
        </h1>

        {/* Today. Deliberately the first thing under the greeting: you open the
            app to decide what to train, not to look at a reward meter. */}
        <div className="mb-4 rounded-2xl border border-orange-600/40 bg-gradient-to-br from-orange-600/15 to-transparent p-5">
          <div className="text-xs font-bold uppercase tracking-wider text-orange-300">Today</div>
          {activeProgram?.next ? (
            <>
              <div className="mt-1 text-xl font-black text-white">{activeProgram.next.title}</div>
              <div className="text-sm text-zinc-300">
                {activeProgram.program.name} · Week {activeProgram.next.week}, session {activeProgram.next.day} ·{' '}
                {activeProgram.next.estimated_minutes} min
              </div>
              <Link href={`/programs/${activeProgram.program.slug}/day/${activeProgram.next.id}`} className="mt-3 inline-block">
                <Button variant="primary" size="sm">Start today&apos;s session</Button>
              </Link>
            </>
          ) : (
            <>
              <div className="mt-1 text-lg font-bold text-white">
                {activeProgram ? `${activeProgram.program.name} complete!` : 'What are you working on today?'}
              </div>
              {/* Point at what the player said they wanted. Onboarding collects
                  goals and focus areas and, until now, only the AI coach ever
                  read them - so anyone without an AI key answered three screens
                  of questions and saw nothing come of it. */}
              {recommendedLabel && (
                <div className="mt-1 text-sm text-zinc-300">
                  You said you want to work on{' '}
                  <span className="font-semibold text-orange-300">{recommendedLabel.toLowerCase()}</span>.
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href={recommendedGoal ? `/programs?goal=${recommendedGoal}` : '/programs'}>
                  <Button variant="primary" size="sm">
                    {recommendedLabel
                      ? `See ${recommendedLabel.toLowerCase()} programs`
                      : activeProgram
                        ? 'Pick your next program'
                        : 'Follow a program'}
                  </Button>
                </Link>
                <Link href="/train/generate">
                  <Button variant="outline" size="sm">Build a quick workout</Button>
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Workload. Every other number here only moves when you train, so there
            is nothing to come back for on a rest day. This one still says
            something useful - including "take a rest day". */}
        <div
          className={`mb-4 flex items-start gap-2.5 rounded-2xl border p-3.5 text-sm ${
            metrics.load.status === 'heavy'
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-100'
              : 'border-zinc-800 bg-zinc-900/70 text-zinc-300'
          }`}
        >
          <Activity
            className={`mt-0.5 h-4 w-4 flex-shrink-0 ${metrics.load.status === 'heavy' ? 'text-amber-400' : 'text-cyan-400'}`}
          />
          <span>{metrics.load.message}</span>
        </div>

        {/* Rank. rankFor() already returns the next rank and the fraction of the
            way there, so the bar shows real progress to a real next tier rather
            than a bare XP total with nothing to aim at. */}
        <Link
          href="/achievements"
          className="mb-8 block rounded-2xl border border-red-500/30 bg-red-500/10 p-4 hover:bg-red-500/15"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-red-500/20">
                <Star className="h-5 w-5 text-red-300" />
              </span>
              <div className="min-w-0">
                <div className="font-black text-red-300">{achievements.rank.name}</div>
                {achievements.rank.next && (
                  <div className="text-xs text-zinc-400">
                    {(achievements.rank.next.min - achievements.xp).toLocaleString()} XP to{' '}
                    {achievements.rank.next.name}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-xl font-black text-white">{achievements.xp.toLocaleString()}</span>
              <span className="text-xs text-zinc-500">
                {achievements.rank.next ? ` / ${achievements.rank.next.min.toLocaleString()}` : ''} XP
              </span>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-red-400 transition-all"
              style={{ width: `${Math.round(Math.min(1, Math.max(0, achievements.rank.progress)) * 100)}%` }}
            />
          </div>
          <div className="mt-2.5 flex items-center justify-between text-xs">
            <span className="font-semibold text-red-300">
              Weekly challenges · {achievements.challenges.filter((c) => c.done).length} of{' '}
              {achievements.challenges.length} done
            </span>
            {achievements.newlyEarned.length > 0 && (
              <span className="font-semibold text-emerald-400">New badge: {achievements.newlyEarned[0]}!</span>
            )}
          </div>
        </Link>

        {/* Quick stats. 2x2 on a phone rather than four full-width cards
            stacked, which was ~400px of scrolling for four small numbers. */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8">
          <StatCard
            label="This week"
            value={metrics.thisWeekSessions}
            badge="sessions"
            badgeVariant="orange"
            valueClass="text-orange-400"
            hint={`Goal: ${metrics.weeklyGoalTarget} days`}
          >
            <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all"
                style={{ width: `${Math.min(weeklyGoalPercentage, 100)}%` }}
              />
            </div>
          </StatCard>

          <StatCard
            label="Shooting %"
            value={`${metrics.shootingPercentage.toFixed(1)}%`}
            badge="career"
            badgeVariant="brand"
            valueClass="text-red-400"
            hint={`${shootingByZone.length} zones tracked`}
          />

          {/* A streak that only tells you after it broke is the version of this
              mechanic that makes people quit. Warn while it can still be saved -
              but only when it is genuinely at risk, which with a rest day
              allowed is not every day the player has yet to train. */}
          <StatCard
            label="Streak"
            value={metrics.currentStreak}
            badge="days"
            badgeVariant={metrics.streakAtRisk ? 'warning' : 'success'}
            valueClass={metrics.streakAtRisk ? 'text-amber-400' : 'text-emerald-400'}
            hint={
              metrics.streakAtRisk
                ? 'Rest day used - train today to keep it'
                : metrics.currentStreak > 0
                  ? 'Safe - a rest day will not break it'
                  : 'Train today to start one'
            }
          />

          {/* Consistency, not AI credits. A billing counter was previously
              given the same visual weight as the player's training streak;
              credits now sit in the slim row below instead. */}
          <StatCard
            label="Consistency"
            value={`${metrics.consistency}%`}
            badge="30 days"
            badgeVariant="cyan"
            valueClass="text-cyan-400"
            hint="Days with any training logged"
          />
        </div>

        {/* AI credits: useful to know, but it is billing, not training */}
        <Link
          href={subscription?.plan_type === 'free' ? '/pro' : '/ai-coach'}
          className="mb-8 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm hover:bg-zinc-900"
        >
          <span className="text-zinc-400">
            AI credits:{' '}
            <span className="font-bold text-zinc-200">
              {subscription?.plan_type === 'pro' || subscription?.plan_type === 'owner'
                ? 'unlimited'
                : subscription?.ai_credits_remaining || 0}
            </span>
            <span className="ml-2 text-xs text-zinc-500">{subscription?.plan_type || 'free'} plan</span>
          </span>
          <span className="text-xs text-zinc-500">{subscription?.plan_type === 'free' ? 'See Pro →' : 'AI Coach →'}</span>
        </Link>

        {/* Quick actions, carrying the same colours the Hoops and Gym tabs use.
            These were Buttons recoloured by poking Tailwind's internal
            --tw-gradient-from through an inline style, which broke as soon as
            the Button variant changed. */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link
            href="/basketball/new"
            className="flex items-center gap-3 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 p-4 shadow-lg shadow-orange-900/20 hover:brightness-110"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-black/20">
              <Target className="h-5 w-5 text-white" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-white">Hoops session</span>
              <span className="block text-xs text-white/80">Drills and shooting</span>
            </span>
          </Link>

          <Link
            href="/workouts/new"
            className="flex items-center gap-3 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-4 shadow-lg shadow-emerald-900/20 hover:brightness-110"
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-black/20">
              <Zap className="h-5 w-5 text-white" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-white">Gym workout</span>
              <span className="block text-xs text-white/80">Strength and tests</span>
            </span>
          </Link>
        </div>

        {/* Social + coach shortcuts */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <Link href="/friends" className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 hover:bg-zinc-900">
            <div className="h-9 w-9 rounded-lg bg-cyan-600/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Friends</div>
              <div className="text-xs text-zinc-400">Weekly leaderboard</div>
            </div>
          </Link>
          <Link href="/ai-coach/chat" className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 hover:bg-zinc-900">
            <div className="h-9 w-9 rounded-lg bg-red-600/20 flex items-center justify-center">
              <MessageCircle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Ask Coach</div>
              <div className="text-xs text-zinc-400">Chat about your game</div>
            </div>
          </Link>
        </div>

        {/* Shot chart. The ranked list this replaced gave five zone names and
            percentages with no sense of where on the floor they were. */}
        {shootingByZone.length > 0 && (
          <Card className="border-zinc-800 bg-zinc-900/70 mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-400" />
                Your shot chart
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ShotHeatMap zones={shootingByZone} />
            </CardContent>
          </Card>
        )}

        {/* All-time totals. Consistency is deliberately not repeated here - it
            already has a card in the grid above. */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-8">
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Total sessions</div>
                  <div className="text-2xl font-black text-white">{metrics.totalSessions}</div>
                </div>
                <TrendingUp className="h-8 w-8 text-zinc-700" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-zinc-400 font-semibold uppercase mb-1">Personal records</div>
                  <div className="text-2xl font-black text-amber-400">{metrics.personalRecords}</div>
                </div>
                <Award className="h-8 w-8 text-zinc-700" />
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
