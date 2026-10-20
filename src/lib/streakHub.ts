// src/lib/streakHub.ts
// The month calendar and the weekly goal streak on the Streaks page. The
// training streak itself, with rest days and freezes, is streakState() in
// achievements.ts.
import { addDays, weekStart } from '@/lib/dates';
import type { KeptDay } from '@/lib/achievements';

export type DayStatus = 'trained' | KeptDay | 'missed' | 'open' | 'future';

export interface CalendarDay {
  date: string;
  /** Day of the month, for the label. */
  day: number;
  /** False for the days of the next or previous month that fill out a week. */
  inMonth: boolean;
  status: DayStatus;
  today: boolean;
}

/**
 * The weeks of a month, Monday first, each day marked: trained, a rest day or
 * a frozen day that kept a streak, missed, today still open, or not here yet.
 * `month` is "YYYY-MM".
 */
export function monthCalendar(month: string, trained: Set<string>, kept: Record<string, KeptDay>, today: string): CalendarDay[][] {
  const first = `${month}-01`;
  const [year, mon] = month.split('-').map(Number);
  const daysInMonth = new Date(Date.UTC(year, mon, 0)).getUTCDate();
  const last = `${month}-${String(daysInMonth).padStart(2, '0')}`;

  const weeks: CalendarDay[][] = [];
  for (let start = weekStart(first); start <= last; start = addDays(start, 7)) {
    weeks.push(
      Array.from({ length: 7 }, (_, i) => {
        const date = addDays(start, i);
        const status: DayStatus = trained.has(date)
          ? 'trained'
          : kept[date]
            ? kept[date]
            : date > today
              ? 'future'
              : date === today
                ? 'open'
                : 'missed';
        return { date, day: Number(date.slice(8)), inMonth: date.startsWith(month), status, today: date === today };
      })
    );
  }
  return weeks;
}

/** "YYYY-MM" a number of months from another. */
export function shiftMonth(month: string, by: number): string {
  const [year, mon] = month.split('-').map(Number);
  const d = new Date(Date.UTC(year, mon - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

export interface WeeklyGoalStreak {
  /** Weeks in a row the goal was hit, up to and including this one if it is done. */
  current: number;
  best: number;
  /** Training days so far this week. */
  thisWeek: number;
  target: number;
}

/**
 * Weeks in a row with at least `target` training days, Monday to Sunday.
 *
 * This week only counts once the goal is hit, and it never breaks the streak
 * while it is still going: on a Tuesday nobody has missed this week yet.
 */
export function weeklyGoalStreak(days: string[], today: string, target: number): WeeklyGoalStreak {
  const perWeek = new Map<string, Set<string>>();
  for (const d of days) {
    if (d > today) continue;
    const w = weekStart(d);
    if (!perWeek.has(w)) perWeek.set(w, new Set());
    perWeek.get(w)!.add(d);
  }
  const hit = (w: string) => (perWeek.get(w)?.size ?? 0) >= target;
  const thisMonday = weekStart(today);

  let current = hit(thisMonday) ? 1 : 0;
  for (let w = addDays(thisMonday, -7); hit(w); w = addDays(w, -7)) current++;

  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const w of [...perWeek.keys()].sort()) {
    if (!hit(w)) continue;
    run = prev !== null && addDays(prev, 7) === w ? run + 1 : 1;
    best = Math.max(best, run);
    prev = w;
  }

  return { current, best: Math.max(best, current), thisWeek: perWeek.get(thisMonday)?.size ?? 0, target };
}
