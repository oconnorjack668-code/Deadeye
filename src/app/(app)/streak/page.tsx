// src/app/(app)/streak/page.tsx
// Every streak in one place, Duolingo style: the training streak with its
// calendar, freezes and milestones, then the daily IQ question and weekly goal
// streaks.
import React from 'react';
import Link from 'next/link';
import { Brain, CalendarCheck, Check, ChevronLeft, ChevronRight, Flame, Lock, Moon, Snowflake } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { userCalendarNow } from '@/lib/userTime';
import { addDays } from '@/lib/dates';
import { getStreaksFromDb, getTrainingDates } from '@/lib/player-activity';
import {
  FREEZE_EVERY,
  MAX_FREEZES,
  STREAK_MILESTONES,
  STREAK_REST_DAYS,
  streakDayBonus,
  streakState,
  streaks,
} from '@/lib/achievements';
import { monthCalendar, shiftMonth, weeklyGoalStreak, type CalendarDay } from '@/lib/streakHub';

export const metadata = { title: 'Streaks - Deadeye' };
export const dynamic = 'force-dynamic';

const DAY_STYLE: Record<CalendarDay['status'], string> = {
  trained: 'bg-orange-500 text-white font-bold',
  rest: 'bg-zinc-800 text-zinc-300',
  frozen: 'bg-sky-500/25 text-sky-100',
  missed: 'text-zinc-600',
  open: 'text-white ring-2 ring-inset ring-orange-400',
  future: 'text-zinc-700',
};

function formatDay(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export default async function StreakPage({ searchParams }: { searchParams: Promise<{ month?: string }> }) {
  const user = await requireUser();
  const supabase = await createClient();
  const { today } = await userCalendarNow();

  const [{ sessions, workouts }, dbStreaks, { data: answers }, { data: goal }] = await Promise.all([
    getTrainingDates(user.id),
    getStreaksFromDb(user.id, today),
    supabase.from('daily_iq_answers').select('answer_date').eq('user_id', user.id).gte('answer_date', addDays(today, -400)),
    supabase
      .from('goals')
      .select('target_value')
      .eq('user_id', user.id)
      .eq('goal_type', 'weekly_training_days')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const days = [...sessions, ...workouts];
  const state = streakState(days, today);
  // As on the dashboard: the walk here knows freezes before the database does
  const current = Math.max(dbStreaks?.current ?? 0, state.current);
  const longest = Math.max(dbStreaks?.longest ?? 0, state.longest);
  const trainedToday = days.includes(today);
  const trainedYesterday = days.includes(addDays(today, -1));
  const iq = streaks(
    (answers || []).map((a) => a.answer_date),
    today
  );
  const weekly = weeklyGoalStreak(days, today, Number(goal?.target_value) || 4);

  const thisMonth = today.slice(0, 7);
  const asked = (await searchParams).month;
  const month = asked && /^\d{4}-(0[1-9]|1[0-2])$/.test(asked) && asked <= thisMonth ? asked : thisMonth;
  const weeks = monthCalendar(month, new Set(days), state.kept, today);
  const monthDays = weeks.flat().filter((d) => d.inMonth);
  const monthLabel = new Date(`${month}-01T00:00:00Z`).toLocaleDateString('en-IE', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const trainedInMonth = monthDays.filter((d) => d.status === 'trained').length;
  const frozenInMonth = monthDays.filter((d) => d.status === 'frozen').length;

  const status = trainedToday
    ? { tone: 'text-emerald-300', text: 'You trained today. Your streak is safe.' }
    : current === 0
      ? { tone: 'text-zinc-300', text: 'Train today to start a streak.' }
      : state.atRisk
        ? { tone: 'text-amber-300', text: `Train today to keep your ${current}-day streak.` }
        : trainedYesterday
          ? { tone: 'text-zinc-300', text: 'Rest day available. Your streak is safe today.' }
          : { tone: 'text-sky-300', text: 'Safe today: a freeze will cover it if you cannot train.' };

  const nextMilestone = STREAK_MILESTONES.find((m) => m.days > current);
  const freezeProgress = state.nextFreezeIn === null ? 1 : (FREEZE_EVERY - state.nextFreezeIn) / FREEZE_EVERY;

  return (
    <div className="flex-1 overflow-auto">
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
        {/* The streak */}
        <section className="rounded-3xl border border-orange-500/40 bg-gradient-to-b from-orange-500/20 via-orange-500/5 to-transparent p-6 text-center">
          <Flame className={`mx-auto h-16 w-16 ${current > 0 ? 'text-orange-400' : 'text-zinc-600'}`} />
          <div className="mt-2 text-6xl font-black tabular-nums text-white">{current}</div>
          <div className="text-sm font-semibold text-zinc-300">day streak</div>
          <p className={`mt-3 text-sm font-semibold ${status.tone}`}>{status.text}</p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-left">
            <div className="rounded-xl bg-zinc-950/50 p-3">
              <div className="text-lg font-black text-white tabular-nums">{longest}</div>
              <div className="text-[11px] text-zinc-400">longest</div>
            </div>
            <div className="rounded-xl bg-zinc-950/50 p-3">
              <div className="text-lg font-black text-orange-300 tabular-nums">+{streakDayBonus(current + 1)}</div>
              <div className="text-[11px] text-zinc-400">XP next day</div>
            </div>
            <div className="rounded-xl bg-zinc-950/50 p-3">
              <div className="text-lg font-black text-sky-300 tabular-nums">{state.freezes}</div>
              <div className="text-[11px] text-zinc-400">freezes</div>
            </div>
          </div>
        </section>

        {/* Calendar */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="mb-3 flex items-center justify-between">
            <Link
              href={`/streak?month=${shiftMonth(month, -1)}`}
              aria-label="Previous month"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </Link>
            <div className="text-center">
              <h2 className="font-bold text-white">{monthLabel}</h2>
              <p className="text-xs text-zinc-400">
                {trainedInMonth} training day{trainedInMonth === 1 ? '' : 's'}
                {frozenInMonth > 0 && ` · ${frozenInMonth} frozen`}
              </p>
            </div>
            {month < thisMonth ? (
              <Link
                href={`/streak?month=${shiftMonth(month, 1)}`}
                aria-label="Next month"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                <ChevronRight className="h-5 w-5" />
              </Link>
            ) : (
              <span className="h-9 w-9" />
            )}
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-zinc-500">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
              <div key={i}>{d}</div>
            ))}
          </div>
          <div className="mt-1 space-y-1">
            {weeks.map((week) => (
              <div key={week[0].date} className="grid grid-cols-7 gap-1">
                {week.map((d) => (
                  <div
                    key={d.date}
                    title={`${formatDay(d.date)}: ${d.status === 'open' ? 'today' : d.status}`}
                    className={`relative flex aspect-square items-center justify-center rounded-xl text-sm tabular-nums ${DAY_STYLE[d.status]} ${
                      d.inMonth ? '' : 'opacity-30'
                    } ${d.today && d.status !== 'open' ? 'ring-2 ring-inset ring-white/70' : ''}`}
                  >
                    {d.status === 'frozen' ? <Snowflake className="h-4 w-4" aria-label="Frozen" /> : d.day}
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-orange-500" /> Trained
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded bg-zinc-700" /> Rest day
            </span>
            <span className="flex items-center gap-1.5">
              <Snowflake className="h-3 w-3 text-sky-300" /> Freeze used
            </span>
          </div>
        </section>

        {/* Freezes */}
        <section className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
          <div className="flex items-center gap-3">
            <div className="flex gap-1" aria-hidden>
              {Array.from({ length: MAX_FREEZES }, (_, i) => (
                <span
                  key={i}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${i < state.freezes ? 'bg-sky-500/25 text-sky-200' : 'bg-zinc-900 text-zinc-600'}`}
                >
                  <Snowflake className="h-5 w-5" />
                </span>
              ))}
            </div>
            <div className="min-w-0">
              <h2 className="font-bold text-white">Streak freezes</h2>
              <p className="text-xs text-zinc-300">
                {state.nextFreezeIn === null
                  ? 'You hold the most you can.'
                  : `Next one in ${state.nextFreezeIn} training day${state.nextFreezeIn === 1 ? '' : 's'}.`}
              </p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-900">
            <div className="h-full rounded-full bg-sky-400" style={{ width: `${Math.round(freezeProgress * 100)}%` }} />
          </div>
          {state.frozen.length > 0 && current > 0 && (
            <p className="mt-3 text-xs font-semibold text-sky-200">
              A freeze saved this streak on {state.frozen.map(formatDay).join(' and ')}.
            </p>
          )}
          <p className="mt-3 text-xs text-zinc-400">
            Every {FREEZE_EVERY} training days in a streak earns a freeze, and you can hold {MAX_FREEZES}. Miss more than your rest day and
            a freeze covers the extra day by itself. Nothing to switch on.
          </p>
        </section>

        {/* Milestones */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-white">Milestones</h2>
          <div className="space-y-1.5">
            {STREAK_MILESTONES.map((m) => {
              const reached = current >= m.days;
              const next = nextMilestone?.days === m.days;
              return (
                <div
                  key={m.days}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    reached
                      ? 'border-orange-500/40 bg-orange-500/10'
                      : next
                        ? 'border-zinc-700 bg-zinc-900'
                        : 'border-zinc-800/60 bg-zinc-900/40'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${
                      reached ? 'bg-orange-500 text-white' : next ? 'bg-zinc-800 text-orange-300' : 'bg-zinc-900 text-zinc-600'
                    }`}
                  >
                    {reached ? <Check className="h-5 w-5" /> : next ? <Flame className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold ${reached || next ? 'text-white' : 'text-zinc-400'}`}>{m.days}-day streak</div>
                    {next && (
                      <div className="text-xs text-zinc-400">
                        {m.days - current} more training day{m.days - current === 1 ? '' : 's'}
                      </div>
                    )}
                    {longest >= m.days && !reached && <div className="text-xs text-zinc-500">Reached before. It pays again.</div>}
                  </div>
                  <span className={`text-sm font-black tabular-nums ${reached ? 'text-orange-300' : 'text-zinc-400'}`}>
                    +{m.xp.toLocaleString()} XP
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* The other streaks */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-white">Your other streaks</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Link href="/study" className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 hover:bg-violet-500/15">
              <div className="flex items-center gap-2 text-violet-200">
                <Brain className="h-5 w-5" />
                <span className="text-sm font-semibold">IQ question of the day</span>
              </div>
              <div className="mt-2 text-3xl font-black text-white tabular-nums">
                {iq.current} <span className="text-sm font-semibold text-zinc-400">day{iq.current === 1 ? '' : 's'}</span>
              </div>
              <div className="text-xs text-zinc-400">
                Longest {iq.longest} · {iq.atRisk ? 'answer today to keep it' : 'answer one a day'}
              </div>
            </Link>
            <Link href="/goals" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 hover:bg-emerald-500/15">
              <div className="flex items-center gap-2 text-emerald-200">
                <CalendarCheck className="h-5 w-5" />
                <span className="text-sm font-semibold">Weekly goal</span>
              </div>
              <div className="mt-2 text-3xl font-black text-white tabular-nums">
                {weekly.current} <span className="text-sm font-semibold text-zinc-400">week{weekly.current === 1 ? '' : 's'}</span>
              </div>
              <div className="text-xs text-zinc-400">
                This week {Math.min(weekly.thisWeek, weekly.target)} of {weekly.target} days · best {weekly.best}
              </div>
            </Link>
          </div>
        </section>

        {/* How it works */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-300">
          <h2 className="mb-2 font-bold text-white">How streaks work</h2>
          <ul className="space-y-2">
            <li className="flex gap-2">
              <Flame className="mt-0.5 h-4 w-4 flex-shrink-0 text-orange-400" />
              Any hoops session or gym workout counts. Your streak is the number of days you trained, not days gone by.
            </li>
            <li className="flex gap-2">
              <Moon className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-400" />
              {STREAK_REST_DAYS === 1 ? 'One rest day' : `${STREAK_REST_DAYS} rest days`} in a row will not break it. Rest is part of
              training.
            </li>
            <li className="flex gap-2">
              <Snowflake className="mt-0.5 h-4 w-4 flex-shrink-0 text-sky-300" />
              Miss more than that and a freeze covers each extra day, if you have one.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
