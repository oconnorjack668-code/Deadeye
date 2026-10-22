// src/app/(app)/dashboard/page.tsx
import React from 'react';
import { requireUser, getCurrentProfile, getCurrentSubscription, checkIsOwner } from '@/lib/auth';
import { foundingState, FOUNDING_REMINDER_DAYS } from '@/lib/founding';
import { proPriceLabels } from '@/lib/stripe';
import { getFoundingOffer } from '@/lib/foundingServer';
import { FoundingCard } from '@/components/FoundingCard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { calculateDashboardMetrics, getShootingByZone, rankZones } from '@/lib/dashboard';
import { getRecentZoneTotals } from '@/lib/player-activity';
import { aiReportsLeft, FREE_MONTHLY_AI_REPORTS, hasPro } from '@/lib/entitlements';
import { ProNote } from '@/components/ProGate';
import { Zap, TrendingUp, Target, Award, Star, Users, MessageCircle, Activity, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/server';
import { getActiveProgram } from '@/lib/programs';
import { loadAchievements } from '@/lib/achievements-server';
import { ShotHeatMap } from '@/components/basketball/ShotHeatMap';
import { recommendedProgramGoal, programGoalLabel } from '@/lib/recommend';
import { squadActivityLine, type FriendRow } from '@/lib/friends';
import { InstallNudge } from '@/components/InstallNudge';
import { StarterSteps } from '@/components/StarterSteps';
import { FounderPostCard } from '@/components/FounderPostCard';
import { DashboardClubCard } from '@/components/clubs/DashboardClubCard';
import type { FounderPost } from '@/lib/founderPosts';
import { LevelUpCelebration } from '@/components/LevelUpCelebration';
import { TIER_THEME } from '@/lib/tierTheme';
import { appModeFor } from '@/lib/coachSide';

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
  href,
  children,
}: {
  label: string;
  value: React.ReactNode;
  badge: string;
  badgeVariant: React.ComponentProps<typeof Badge>['variant'];
  valueClass: string;
  hint: string;
  /** Makes the whole card a link. */
  href?: string;
  children?: React.ReactNode;
}) {
  const card = (
    <Card className={`border-zinc-800 bg-zinc-900/70 ${href ? 'h-full transition-colors hover:border-zinc-700' : ''}`}>
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
  return href ? (
    <Link href={href} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const profile = await getCurrentProfile();

  // The app opens here after logging in. Coach-only accounts have no player
  // side, and a player-coach opens in the mode they used last.
  if (appModeFor(profile) === 'coaching') redirect('/coach');

  // Players who never finished setup (e.g. the confirmation link didn't land them
  // on /onboarding) are sent there from their landing page
  if (!profile?.onboarding_completed) {
    redirect('/onboarding');
  }

  const supabase = await createClient();
  const [subscription, metrics, shootingByZone, activeProgram, achievements, squad, iqAnswers, follows, homeClub] = await Promise.all([
    getCurrentSubscription(),
    calculateDashboardMetrics(user.id),
    getShootingByZone(user.id),
    getActiveProgram(supabase, user.id),
    // Also awards any weekly challenges / badges earned since the last visit
    loadAchievements(user.id),
    // The same overview the Friends page loads. Players with friends on a
    // platform churn at about half the rate of solo ones, and for an
    // individual-skill sport a name you know beats a national rank.
    supabase.rpc('friends_overview'),
    // One of the starting steps: has the daily IQ question ever been answered
    supabase.from('daily_iq_answers').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    // Who this player follows, for the founder post card (00050; an error before it runs)
    supabase.from('follows').select('followed_id').eq('follower_id', user.id),
    // The player's home club (00051); an error before it runs, which hides the card
    supabase.from('player_clubs').select('club_id').eq('user_id', user.id).maybeSingle(),
  ]);
  const followed = (follows.data ?? []).map((f) => f.followed_id);
  const { data: latestPost } = followed.length
    ? await supabase
        .from('founder_posts')
        .select('id, author_id, kind, body, created_at')
        .in('author_id', followed)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null };
  // Shown until the bonus for finishing them is paid; it is in the XP once paid
  const showStarterSteps = achievements.xpParts.bonus === 0;
  // Nothing logged yet, hoops or gym, and no program on the go
  const firstRun = metrics.totalSessions === 0 && achievements.stats.totalWorkouts === 0 && !activeProgram;
  const squadLine = squadActivityLine((squad.data || []) as unknown as FriendRow[]);
  const isPro = hasPro(subscription);
  const [offer, isOwner] = await Promise.all([getFoundingOffer(), checkIsOwner()]);
  const founding = foundingState(subscription, { claimed: offer.claimed, closed: !offer.open, isOwner });
  // Stripe is only asked for the founder price when the card is going to name it
  const foundingCardShown =
    founding.kind === 'can-claim' || (founding.kind === 'active' && founding.daysLeft <= FOUNDING_REMINDER_DAYS);
  const founderPrice = foundingCardShown ? (await proPriceLabels()).founder : null;
  // The all-time chart is Pro; Free shows the last 30 days, which is the
  // part that says what to work on this week anyway
  const chartZones = isPro
    ? shootingByZone
    : rankZones(await getRecentZoneTotals(user.id, 30));

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

        {/* Sits above Today, as one quiet line rather than a card: it is a
            nudge, not a metric, and it earns its place only when someone the
            player actually knows has trained. Silent otherwise - an empty week
            reported back is worse than nothing. */}
        {squadLine && (
          <Link
            href="/friends"
            className="mb-4 flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-200"
          >
            <Users className="h-4 w-4 flex-shrink-0 text-cyan-400" />
            <span className="min-w-0 truncate">{squadLine}</span>
          </Link>
        )}

        {/* The starting steps include the home screen, so one nudge at a time */}
        {!showStarterSteps && <InstallNudge />}

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
          ) : !activeProgram && metrics.totalSessions === 0 ? (
            // A player who has never logged anything is sent to log shots, the
            // thing the landing page promised, rather than to sign up for a
            // weeks-long program. On 19 Oct 2026, 12 of the 17 players who had
            // finished setup had done nothing at all, and 1 had started a program.
            <>
              <div className="mt-1 text-xl font-black text-white">Log your first shots</div>
              <div className="text-sm text-zinc-300">
                Tap where you shoot from, then how many went in. Your shot chart starts with the first spot.
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/basketball/new">
                  <Button variant="primary" size="sm">Log shots</Button>
                </Link>
                <Link href="/video">
                  <Button variant="outline" size="sm">Track with the camera</Button>
                </Link>
              </div>
              <Link
                href={recommendedGoal ? `/programs?goal=${recommendedGoal}` : '/programs'}
                className="mt-3 inline-block text-xs font-semibold text-orange-300 hover:text-orange-200"
              >
                {recommendedLabel ? `Or see ${recommendedLabel.toLowerCase()} programs →` : 'Or follow a program →'}
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

        {/* Straight under Today: three of the four can be done away from a
            court, which is where most new players are (src/lib/starter.ts) */}
        {showStarterSteps && <StarterSteps iqDone={(iqAnswers.count || 0) > 0} shotsDone={metrics.totalSessions > 0} />}

        {/* The founding member offer while it can still be claimed, or the
            heads-up in the last week of a founding member's free months. Under
            Today, because it is an offer rather than training. */}
        <FoundingCard state={founding} where="dashboard" founderPrice={founderPrice} />

        {/* Only for a player who follows the founder, once there is a post */}
        {latestPost && <FounderPostCard post={latestPost as FounderPost} founderId={latestPost.author_id} />}

        {/* Until a home club is picked, and only after the first log so a new
            player's first screen still asks for one thing */}
        {!firstRun && !homeClub.error && !homeClub.data && <DashboardClubCard />}

        {/* Until the first log, everything below is numbers that are all still
            zero, under a Today card asking for one thing. Folded away so a new
            player sees that one thing (Phase 3 of the plan). Still a tap away. */}
        <FoldedUntilFirstLog folded={firstRun}>
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

        {/* Level. Shows the next level and how far there is to go, so the bar
            is real progress towards something rather than a bare XP total, and
            what the streak is worth today, which is the reason to come back. */}
        <LevelUpCelebration level={achievements.level.level} tier={achievements.level.tier} />
        <Link
          href="/achievements"
          className={`mb-8 block rounded-2xl border p-4 transition-colors hover:brightness-110 ${TIER_THEME[achievements.level.tier].card}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${TIER_THEME[achievements.level.tier].chip}`}>
                <Star className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <div className="font-black text-white">
                  Level {achievements.level.level}{' '}
                  <span className={`text-sm font-bold ${TIER_THEME[achievements.level.tier].text}`}>{achievements.level.tier}</span>
                </div>
                {achievements.level.toNext > 0 && (
                  <div className="text-xs text-zinc-400">
                    {achievements.level.toNext.toLocaleString()} XP to Level {achievements.level.level + 1}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-xl font-black text-white">{achievements.xp.toLocaleString()}</span>
              <span className="text-xs text-zinc-500"> XP</span>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${TIER_THEME[achievements.level.tier].bar}`}
              style={{ width: `${Math.round(Math.min(1, Math.max(0, achievements.level.progress)) * 100)}%` }}
            />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs">
            <span className="font-semibold text-orange-300">
              {achievements.stats.currentStreak > 0
                ? `Next training day +${achievements.streak.nextDayBonus} streak XP`
                : 'Train today to start a streak'}
              {achievements.streak.next &&
                ` · ${achievements.streak.next.remaining} to the ${achievements.streak.next.days}-day bonus (+${achievements.streak.next.xp.toLocaleString()})`}
            </span>
            {achievements.newlyEarned.length > 0 ? (
              <span className="font-semibold text-emerald-400">New badge: {achievements.newlyEarned[0]}!</span>
            ) : (
              <span className="text-zinc-400">
                Weekly challenges {achievements.challenges.filter((c) => c.done).length}/{achievements.challenges.length}
              </span>
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
            href="/streak"
            value={metrics.currentStreak}
            badge="days"
            badgeVariant={metrics.streakAtRisk ? 'warning' : 'success'}
            valueClass={metrics.streakAtRisk ? 'text-amber-400' : 'text-emerald-400'}
            hint={
              metrics.streakAtRisk
                ? 'Rest day used - train today to keep it'
                : metrics.currentStreak > 0
                  ? metrics.streakFreezes > 0
                    ? `Safe - ${metrics.streakFreezes} streak freeze${metrics.streakFreezes === 1 ? '' : 's'} ready`
                    : 'Safe - a rest day will not break it'
                  : 'Train today to start one'
            }
          />

          {/* Consistency, not AI credits. A billing counter was previously
              given the same visual weight as the player's training streak;
              credits now sit in the slim row below instead. */}
          <StatCard
            label="Consistency"
            value={metrics.consistencyReady ? `${metrics.consistency}%` : metrics.consistencyDays}
            badge={metrics.consistencyReady ? '30 days' : 'days'}
            badgeVariant="cyan"
            valueClass="text-cyan-400"
            hint={metrics.consistencyReady ? 'Days with any training logged' : 'Your % shows after your first week'}
          />
        </div>

        {/* AI credits: useful to know, but it is billing, not training */}
        <Link
          href={isPro ? '/ai-coach' : '/pro'}
          className="mb-8 flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-2.5 text-sm hover:bg-zinc-900"
        >
          <span className="text-zinc-400">
            AI reports:{' '}
            <span className="font-bold text-zinc-200">
              {isPro ? 'unlimited' : `${aiReportsLeft(subscription)} of ${FREE_MONTHLY_AI_REPORTS} left this month`}
            </span>
            <span className="ml-2 text-xs text-zinc-500">{isPro ? 'Pro' : 'Free'}</span>
          </span>
          <span className="text-xs text-zinc-500">{isPro ? 'AI Coach →' : 'See Pro →'}</span>
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
              <CardTitle className="flex flex-wrap items-center gap-2">
                <Target className="h-5 w-5 text-orange-400" />
                Your shot chart
                <span className="text-xs font-semibold text-zinc-500">{isPro ? 'all time' : 'last 30 days'}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartZones.length > 0 ? (
                <ShotHeatMap zones={chartZones} />
              ) : (
                <p className="text-sm text-zinc-400">No shots logged in the last 30 days.</p>
              )}
              {!isPro && (
                <ProNote className="mt-3">Your all-time shot chart, across every shot you have logged, is part of Pro.</ProNote>
              )}
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
        </FoldedUntilFirstLog>

      </div>
    </div>
  );
}

function FoldedUntilFirstLog({ folded, children }: { folded: boolean; children: React.ReactNode }) {
  if (!folded) return <>{children}</>;
  return (
    <details className="group mb-8 rounded-2xl border border-zinc-800 bg-zinc-900/40">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-semibold text-zinc-300 hover:text-white">
        <span>
          Everything else in Deadeye
          <span className="block text-xs font-normal text-zinc-500">Your stats, level, shot chart and shortcuts fill in once you log</span>
        </span>
        <ChevronDown className="h-4 w-4 flex-shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-1">{children}</div>
    </details>
  );
}
