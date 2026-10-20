// src/app/(app)/achievements/page.tsx
import React from 'react';
import Link from 'next/link';
import {
  Target,
  Flame,
  Crown,
  CircleDot,
  Gem,
  Zap,
  Trophy,
  Dumbbell,
  BookOpen,
  GraduationCap,
  CalendarCheck,
  Video,
  Award,
  Crosshair,
  Lock,
  Check,
  Snowflake,
} from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { loadAchievements } from '@/lib/achievements-server';
import { BADGE_XP, FREEZE_EVERY, STREAK_MILESTONES, STREAK_XP_CAP, STREAK_XP_PER_DAY, TIERS, XP_VALUES, type BadgeGroup } from '@/lib/achievements';
import { TIER_THEME } from '@/lib/tierTheme';
import { ShareCardButton } from '@/components/ShareCardButton';
import { LevelUpCelebration } from '@/components/LevelUpCelebration';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Achievements - Deadeye' };

const BADGE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Target, Flame, Crown, CircleDot, Gem, Zap, Trophy, Dumbbell, BookOpen, GraduationCap, CalendarCheck, Video, Crosshair,
};

const TIER_STYLES: Record<string, string> = {
  bronze: 'from-amber-800 to-orange-700',
  silver: 'from-zinc-400 to-zinc-600',
  gold: 'from-amber-400 to-yellow-600',
  diamond: 'from-cyan-400 to-blue-600',
  legend: 'from-red-500 to-fuchsia-600',
};

const GROUP_ORDER: BadgeGroup[] = ['Streaks', 'Shooting', 'Sessions', 'Programs', 'Gym', 'IQ', 'Video'];

/** How XP is earned, shown so a player knows what moves the bar. */
const EARN = [
  { what: 'Basketball session', xp: `+${XP_VALUES.session}` },
  { what: 'Gym workout', xp: `+${XP_VALUES.workout}` },
  { what: `Every ${XP_VALUES.makesPer} makes`, xp: '+1' },
  { what: 'IQ lesson', xp: `+${XP_VALUES.lesson}` },
  { what: 'Personal record', xp: `+${XP_VALUES.pr}` },
  { what: 'Program day', xp: `+${XP_VALUES.programDay}` },
  { what: 'Finish a program', xp: `+${XP_VALUES.programComplete}` },
  { what: 'Video-tracked session', xp: `+${XP_VALUES.videoTracked}` },
  { what: 'Each day of a streak', xp: `+${STREAK_XP_PER_DAY} a day, up to +${STREAK_XP_CAP}` },
  { what: 'Streak milestones', xp: `+${STREAK_MILESTONES[0].xp} to +${STREAK_MILESTONES[STREAK_MILESTONES.length - 1].xp.toLocaleString()}` },
  { what: 'Badges', xp: `+${BADGE_XP.bronze} to +${BADGE_XP.legend.toLocaleString()}` },
  { what: 'Weekly challenges', xp: 'their points' },
];

export default async function AchievementsPage() {
  const user = await requireUser();
  const a = await loadAchievements(user.id);
  const theme = TIER_THEME[a.level.tier];
  const current = a.stats.currentStreak;
  const longestStreak = a.stats.longestStreak;
  const earnedCount = a.badges.filter((b) => b.earned).length;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8">
        <div>
          <LevelUpCelebration level={a.level.level} tier={a.level.tier} />

          {/* Level */}
          <div className={`rounded-2xl border p-5 ${theme.card}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={`text-xs font-bold uppercase tracking-wider ${theme.text}`}>{a.level.tier}</div>
                <div className="text-4xl font-black text-white">Level {a.level.level}</div>
                <div className="text-sm text-zinc-300">{a.xp.toLocaleString()} XP</div>
              </div>
              <ShareCardButton
                path="/api/share/rank"
                text={`I'm Level ${a.level.level} (${a.level.tier}) on Deadeye 🏀`}
                label="Share"
              />
            </div>
            {a.level.toNext > 0 && (
              <>
                <div className="mt-4 h-3 rounded-full bg-zinc-800 overflow-hidden">
                  <div className={`h-full rounded-full ${theme.bar}`} style={{ width: `${Math.round(a.level.progress * 100)}%` }} />
                </div>
                <div className="mt-1.5 flex justify-between text-xs text-zinc-400">
                  <span>
                    {a.level.toNext.toLocaleString()} XP to Level {a.level.level + 1}
                  </span>
                  {a.level.nextTier && (
                    <span className={theme.text}>
                      {a.level.nextTier.name} at Level {a.level.nextTier.level}
                    </span>
                  )}
                </div>
              </>
            )}
            {a.newlyEarned.length > 0 && (
              <p className="mt-3 text-sm font-semibold text-emerald-400">
                New badge{a.newlyEarned.length > 1 ? 's' : ''}: {a.newlyEarned.join(', ')}!
              </p>
            )}
          </div>
        </div>

        {/* Streak rewards: what keeping it going is worth, right now */}
        <section className="rounded-2xl border border-orange-500/40 bg-gradient-to-br from-orange-500/15 to-transparent p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/20">
                <Flame className={`h-7 w-7 ${current > 0 ? 'text-orange-400' : 'text-zinc-500'}`} />
              </span>
              <div>
                <div className="text-3xl font-black text-white tabular-nums">
                  {current} <span className="text-base font-semibold text-zinc-400">day streak</span>
                </div>
                <div className="text-xs text-zinc-400">Longest {longestStreak} days</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-black text-orange-300">+{a.streak.nextDayBonus}</div>
              <div className="text-[11px] text-zinc-400">bonus XP next training day</div>
            </div>
          </div>

          {a.streak.next && (
            <div className="mt-4 rounded-xl bg-zinc-950/50 p-3 text-sm text-zinc-200">
              <span className="font-semibold text-white">Next reward: </span>
              reach a {a.streak.next.days}-day streak for <span className="font-bold text-orange-300">+{a.streak.next.xp.toLocaleString()} XP</span>
              {' '}- {a.streak.next.remaining} more training day{a.streak.next.remaining === 1 ? '' : 's'}.
            </div>
          )}

          <div className="mt-4 grid grid-cols-6 gap-1.5">
            {STREAK_MILESTONES.map((m) => {
              const live = current >= m.days;
              const ever = longestStreak >= m.days;
              return (
                <div
                  key={m.days}
                  className={`rounded-xl px-1 py-2 text-center ${
                    live ? 'bg-orange-500 text-white' : ever ? 'bg-orange-500/20 text-orange-200' : 'bg-zinc-900 text-zinc-500'
                  }`}
                >
                  <div className="text-sm font-black tabular-nums">{m.days}</div>
                  <div className="text-[10px] font-semibold">+{m.xp >= 1000 ? `${m.xp / 1000}k` : m.xp}</div>
                </div>
              );
            })}
          </div>
          {/* Streak freezes: earned by training, used by themselves */}
          <div className="mt-4 flex items-center gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 p-3">
            <div className="flex gap-1" aria-hidden>
              {Array.from({ length: a.freeze.max }, (_, i) => (
                <span
                  key={i}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl ${i < a.freeze.held ? 'bg-sky-500/25 text-sky-200' : 'bg-zinc-900 text-zinc-600'}`}
                >
                  <Snowflake className="h-5 w-5" />
                </span>
              ))}
            </div>
            <div className="min-w-0 text-sm">
              <div className="font-semibold text-white">
                {a.freeze.held} of {a.freeze.max} streak freezes
              </div>
              <div className="text-xs text-zinc-400">
                {a.freeze.nextIn === null
                  ? 'Holding the most you can. Keep training to keep them.'
                  : `Next one in ${a.freeze.nextIn} training day${a.freeze.nextIn === 1 ? '' : 's'}.`}
              </div>
            </div>
          </div>
          {a.freeze.saved.length > 0 && (
            <p className="mt-2 text-xs font-semibold text-sky-300">
              A freeze saved this streak on{' '}
              {a.freeze.saved
                .map((d) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }))
                .join(' and ')}
              .
            </p>
          )}

          <p className="mt-3 text-xs text-zinc-400">
            Every training day in a streak is worth more than the last, and each milestone pays out every time you reach it. A
            rest day does not break your streak. Every {FREEZE_EVERY} training days in a streak earns a freeze, and if you miss
            more than your rest day, a freeze covers the extra day by itself.
          </p>
          <Link href="/streak" className="mt-3 inline-block text-sm font-semibold text-orange-300 hover:text-orange-200">
            See your streak calendar and all your streaks →
          </Link>
        </section>

        {/* Tier road */}
        <section>
          <h2 className="text-lg font-bold text-white mb-3">Tiers</h2>
          <div className="space-y-1.5">
            {TIERS.map((t) => {
              const reached = a.level.level >= t.level;
              const here = a.level.tier === t.name;
              const tTheme = TIER_THEME[t.name];
              return (
                <div
                  key={t.name}
                  className={`flex items-center justify-between rounded-xl border px-3 py-2 ${here ? tTheme.card : 'border-zinc-800 bg-zinc-900/50'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${reached ? tTheme.chip : 'bg-zinc-800 text-zinc-600'}`}>
                      {reached ? <Check className="h-4 w-4" /> : <Lock className="h-3.5 w-3.5" />}
                    </span>
                    <span className={`font-semibold ${reached ? 'text-white' : 'text-zinc-500'}`}>{t.name}</span>
                    {here && <span className={`text-xs font-semibold ${tTheme.text}`}>You are here</span>}
                  </div>
                  <span className="text-xs text-zinc-500">Level {t.level}</span>
                </div>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-zinc-500">Each tier gives your level card a new colour.</p>
        </section>

        {/* Weekly challenges */}
        <section>
          <h2 className="text-lg font-bold text-white mb-1">This week&apos;s challenges</h2>
          <p className="text-xs text-zinc-500 mb-3">Reset every Monday. Points count toward your XP and the leaderboard.</p>
          <div className="space-y-2">
            {a.challenges.map((c) => (
              <div key={c.id} className={`rounded-2xl border p-4 ${c.done ? 'border-emerald-600/40 bg-emerald-600/10' : 'border-zinc-800 bg-zinc-900/70'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-white">{c.title}</div>
                    <div className="text-xs text-zinc-400">{c.description}</div>
                  </div>
                  <div className={`text-sm font-black ${c.done ? 'text-emerald-400' : 'text-amber-400'}`}>{c.done ? '✓' : `+${c.points}`}</div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                  <div className={`h-full ${c.done ? 'bg-emerald-500' : 'bg-amber-400'}`} style={{ width: `${Math.round((c.current / c.target) * 100)}%` }} />
                </div>
                <div className="mt-1 text-[11px] text-zinc-500">
                  {c.current}/{c.target}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Badges, grouped, with progress to the ones still to earn */}
        <section>
          <h2 className="text-lg font-bold text-white mb-3">
            Badges <span className="text-sm text-zinc-500">{earnedCount}/{a.badges.length}</span>
          </h2>
          <div className="space-y-5">
            {GROUP_ORDER.map((group) => {
              const list = a.badges.filter((b) => b.group === group);
              if (list.length === 0) return null;
              return (
                <div key={group}>
                  <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-zinc-400">{group}</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {list.map((b) => {
                      const Icon = BADGE_ICONS[b.icon] || Award;
                      return (
                        <div key={b.id} className={`rounded-2xl border border-zinc-800 p-3 text-center ${b.earned ? 'bg-zinc-900/70' : 'bg-zinc-950'}`}>
                          <div
                            className={`mx-auto h-12 w-12 rounded-full bg-gradient-to-br ${
                              b.earned ? TIER_STYLES[b.tier] : 'from-zinc-800 to-zinc-800'
                            } flex items-center justify-center`}
                          >
                            <Icon className={`h-6 w-6 ${b.earned ? 'text-white' : 'text-zinc-600'}`} />
                          </div>
                          <div className={`mt-2 text-sm font-semibold ${b.earned ? 'text-white' : 'text-zinc-400'}`}>{b.title}</div>
                          <div className="text-[11px] text-zinc-500">{b.description}</div>
                          {b.earned ? (
                            <div className="mt-1 text-[11px] font-semibold text-emerald-400">+{BADGE_XP[b.tier].toLocaleString()} XP</div>
                          ) : (
                            <>
                              <div className="mt-2 h-1 rounded-full bg-zinc-800 overflow-hidden">
                                <div className="h-full bg-zinc-500" style={{ width: `${Math.round((b.current / b.target) * 100)}%` }} />
                              </div>
                              <div className="mt-1 text-[11px] text-zinc-500 tabular-nums">
                                {b.current.toLocaleString()}/{b.target.toLocaleString()} · +{BADGE_XP[b.tier].toLocaleString()} XP
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* How to earn, and where this player's XP came from */}
        <section className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h2 className="mb-2 font-bold text-white">How to earn XP</h2>
            <ul className="space-y-1 text-sm">
              {EARN.map((e) => (
                <li key={e.what} className="flex justify-between gap-3">
                  <span className="text-zinc-300">{e.what}</span>
                  <span className="flex-shrink-0 font-semibold text-amber-300">{e.xp}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <h2 className="mb-2 font-bold text-white">Your XP</h2>
            <ul className="space-y-1 text-sm">
              {(
                [
                  ['Training', a.xpParts.training],
                  ['Streaks', a.xpParts.streaks],
                  ['Badges', a.xpParts.badges],
                  ['Weekly challenges', a.xpParts.challenges],
                  ['Programs', a.xpParts.programs],
                  ['Makes', a.xpParts.makes],
                  ['Lessons', a.xpParts.lessons],
                  ['Personal records', a.xpParts.prs],
                  ['Video', a.xpParts.video],
                ] as const
              ).map(([label, xp]) => (
                <li key={label} className="flex justify-between gap-3">
                  <span className="text-zinc-300">{label}</span>
                  <span className="font-semibold tabular-nums text-white">{xp.toLocaleString()}</span>
                </li>
              ))}
              <li className="flex justify-between gap-3 border-t border-zinc-800 pt-1">
                <span className="font-semibold text-zinc-200">Total</span>
                <span className="font-black tabular-nums text-white">{a.xp.toLocaleString()}</span>
              </li>
            </ul>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 text-sm">
          <Link href="/goals" className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 hover:bg-zinc-900">
            <div className="font-semibold text-white">My goals</div>
            <div className="text-xs text-zinc-500">Set weekly targets</div>
          </Link>
          <Link href="/leaderboard" className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 hover:bg-zinc-900">
            <div className="font-semibold text-white">Leaderboard</div>
            <div className="text-xs text-zinc-500">Season points</div>
          </Link>
        </section>
      </div>
    </div>
  );
}
