// __tests__/reminders.test.ts
import { describe, it, expect } from 'vitest';
import { isAdultBracket, localParts, reminderDue, reminderPush, reminderWindowOpen, streakWarningAllowed, type ReminderPrefs } from '@/lib/reminders';

const prefs: ReminderPrefs = {
  reminder_enabled: true,
  push_enabled: true,
  reminder_days: [1, 3, 5], // Mon, Wed, Fri
  timezone: 'Europe/Dublin',
  last_reminded_on: null,
};

describe('reminders', () => {
  it('converts to the player local time', () => {
    // 2026-09-25 is a Friday; 17:30 UTC is 18:30 in Dublin (summer time)
    expect(localParts(new Date('2026-09-25T17:30:00Z'), 'Europe/Dublin')).toEqual({ date: '2026-09-25', weekday: 5, hour: 18 });
    // Same instant is still Friday morning in Los Angeles
    expect(localParts(new Date('2026-09-25T17:30:00Z'), 'America/Los_Angeles')).toEqual({ date: '2026-09-25', weekday: 5, hour: 10 });
    expect(localParts(new Date('2026-09-25T17:30:00Z'), 'Not/AZone').hour).toBe(17);
  });

  it('is due on a chosen day whenever the daily job runs, once', () => {
    // The job runs at 16:00 UTC: 17:00 in Dublin in summer, 16:00 in winter
    const fridayAfterSchool = new Date('2026-09-25T16:00:00Z');
    expect(reminderDue(prefs, fridayAfterSchool)).toEqual({ due: true, localDate: '2026-09-25' });
    expect(reminderDue(prefs, new Date('2026-11-27T16:00:00Z'))).toEqual({ due: true, localDate: '2026-11-27' });
    expect(reminderDue({ ...prefs, last_reminded_on: '2026-09-25' }, fridayAfterSchool).due).toBe(false);
    expect(reminderDue(prefs, new Date('2026-09-24T16:00:00Z')).due).toBe(false); // Thursday
  });

  it('respects the switches', () => {
    const t = new Date('2026-09-25T17:30:00Z');
    expect(reminderDue({ ...prefs, reminder_enabled: false }, t).due).toBe(false);
    expect(reminderDue({ ...prefs, push_enabled: false }, t).due).toBe(false);
  });
});

describe('reminderPush', () => {
  it('warns about a streak ending tonight on any day, chosen or not', () => {
    const push = reminderPush({ chosenDay: false, streak: { current: 12, atRisk: true } });
    expect(push?.title).toBe('Your 12-day streak ends tonight 🔥');
  });

  it('sends nothing on a day the player did not choose, unless a streak is ending', () => {
    expect(reminderPush({ chosenDay: false, streak: { current: 12, atRisk: false } })).toBeNull();
    // A 1-day streak is not worth a buzz on a day off
    expect(reminderPush({ chosenDay: false, streak: { current: 1, atRisk: true } })).toBeNull();
  });

  it('on a chosen day, names the programme, then the streak, then just says train', () => {
    expect(reminderPush({ chosenDay: true, streak: { current: 5, atRisk: false }, programName: 'Shot Creator' })?.body).toContain('Shot Creator');
    expect(reminderPush({ chosenDay: true, streak: { current: 5, atRisk: false } })?.body).toContain('5-day streak');
    expect(reminderPush({ chosenDay: true, streak: { current: 0, atRisk: false } })?.body).toBe('Get some reps in and build your streak.');
  });
});

describe('reminderWindowOpen', () => {
  it('opens on any day, once a day', () => {
    // Tuesday in Dublin: not a chosen day, but the window is open
    const tuesdayAfterSchool = new Date('2026-10-20T16:00:00Z');
    expect(reminderWindowOpen(prefs, tuesdayAfterSchool)).toBe(true);
    expect(reminderWindowOpen({ ...prefs, last_reminded_on: '2026-10-20' }, tuesdayAfterSchool)).toBe(false);
    expect(reminderWindowOpen({ ...prefs, reminder_enabled: false }, tuesdayAfterSchool)).toBe(false);
  });
});

describe('streak warning, opt-in for under-18s (00057)', () => {
  it('is on by default only for an 18+ age bracket', () => {
    for (const b of ['18-22', '23-30', '30+']) expect(streakWarningAllowed(null, b)).toBe(true);
    for (const b of ['13', '14-17', null, undefined, '']) expect(streakWarningAllowed(null, b)).toBe(false);
    expect(isAdultBracket('14-17')).toBe(false);
  });

  it('follows the choice the player made, at any age', () => {
    expect(streakWarningAllowed(true, '14-17')).toBe(true);
    expect(streakWarningAllowed(false, '23-30')).toBe(false);
  });

  it('switched off, a streak ending tonight sends nothing on a day off', () => {
    expect(reminderPush({ chosenDay: false, streak: { current: 12, atRisk: true }, streakWarning: false })).toBeNull();
  });

  it('switched off, a chosen day still gets the usual reminder, with no warning', () => {
    const push = reminderPush({ chosenDay: true, streak: { current: 12, atRisk: true }, streakWarning: false });
    expect(push?.title).toBe('Time to train 🏀');
    expect(push?.title).not.toContain('ends tonight');
  });
});
