// src/lib/reminders.ts
// Decides whether a player should get a training reminder right now, in their timezone.

export interface ReminderPrefs {
  reminder_enabled: boolean;
  push_enabled: boolean;
  reminder_days: number[]; // 0 = Sunday ... 6 = Saturday
  timezone: string;
  last_reminded_on: string | null; // YYYY-MM-DD (local)
}

/** Local date (YYYY-MM-DD), weekday (0-6) and hour in a timezone. Falls back to UTC for unknown zones. */
export function localParts(now: Date, timeZone: string): { date: string; weekday: number; hour: number } {
  let zone = timeZone;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone });
  } catch {
    zone = 'UTC';
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      weekday: 'short',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value])
  );
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday);
  return { date: `${parts.year}-${parts.month}-${parts.day}`, weekday, hour: Number(parts.hour) };
}

/**
 * When reminders go out, as players are told it. The time itself is the cron
 * schedule in vercel.json (16:00 UTC): Vercel's free plan runs a job at most
 * once a day, so there is no per-player time. 16:00 UTC is 4pm in Ireland in
 * winter and 5pm in summer, after school either way. The old reminder_time
 * column stays in the database but is no longer read.
 */
export const REMINDER_TIME_LABEL = 'around 4pm';

/** A reminder is due on a chosen day, at most once a day. */
export function reminderDue(prefs: ReminderPrefs, now: Date): { due: boolean; localDate: string } {
  const { date, weekday } = localParts(now, prefs.timezone);
  const due =
    prefs.reminder_enabled &&
    prefs.push_enabled &&
    prefs.reminder_days.includes(weekday) &&
    prefs.last_reminded_on !== date;
  return { due, localDate: date };
}

/**
 * Whether today's reminder can go out at all: nothing was sent today. Unlike
 * reminderDue, any day of the week, because a streak about to end is worth one
 * message even on a day off.
 */
export function reminderWindowOpen(prefs: ReminderPrefs, now: Date): boolean {
  const { date } = localParts(now, prefs.timezone);
  return prefs.reminder_enabled && prefs.push_enabled && prefs.last_reminded_on !== date;
}

export interface ReminderPush {
  title: string;
  body: string;
  url: string;
}

/**
 * What tonight's push says, if anything, for a player who has not trained today.
 *
 * A streak that ends tonight is the one message sent on any day: warning while
 * it can still be saved is what a streak is for, and finding out the next
 * morning is the version of this that makes people quit. Only from two days,
 * because "your 1-day streak" is not worth a buzz. Otherwise, only on the days
 * the player chose.
 */
export function reminderPush(input: {
  chosenDay: boolean;
  streak: { current: number; atRisk: boolean };
  programName?: string | null;
}): ReminderPush | null {
  const { current, atRisk } = input.streak;
  if (atRisk && current >= 2) {
    return { title: `Your ${current}-day streak ends tonight 🔥`, body: 'Any session or workout today keeps it alive.', url: '/basketball/new' };
  }
  if (!input.chosenDay) return null;
  if (input.programName) return { title: 'Time to train 🏀', body: `Your next ${input.programName} session is ready.`, url: '/dashboard' };
  if (current >= 2) {
    return { title: 'Time to train 🏀', body: `You are on a ${current}-day streak. Get some reps in to keep it going.`, url: '/basketball/new' };
  }
  return { title: 'Time to train 🏀', body: 'Get some reps in and build your streak.', url: '/basketball/new' };
}
