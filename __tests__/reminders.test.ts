// __tests__/reminders.test.ts
import { describe, it, expect } from 'vitest';
import { localParts, reminderDue, reminderPush, reminderWindowOpen, type ReminderPrefs } from '@/lib/reminders';

const prefs: ReminderPrefs = {
  reminder_enabled: true,
  push_enabled: true,
  reminder_days: [1, 3, 5], // Mon, Wed, Fri
  reminder_time: '18:00',
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

  it('is due on a chosen day at or after the chosen time, once', () => {
    const fridayEvening = new Date('2026-09-25T17:30:00Z');
    expect(reminderDue(prefs, fridayEvening)).toEqual({ due: true, localDate: '2026-09-25' });
    expect(reminderDue({ ...prefs, last_reminded_on: '2026-09-25' }, fridayEvening).due).toBe(false);
    expect(reminderDue(prefs, new Date('2026-09-25T15:00:00Z')).due).toBe(false); // 16:00 local, too early
    expect(reminderDue(prefs, new Date('2026-09-24T17:30:00Z')).due).toBe(false); // Thursday
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
  it('opens at the chosen hour on any day, once a day', () => {
    // Tuesday 18:30 in Dublin: not a chosen day, but the window is open
    const tuesdayEvening = new Date('2026-10-20T17:30:00Z');
    expect(reminderWindowOpen(prefs, tuesdayEvening)).toBe(true);
    expect(reminderWindowOpen({ ...prefs, last_reminded_on: '2026-10-20' }, tuesdayEvening)).toBe(false);
    expect(reminderWindowOpen({ ...prefs, reminder_time: '20:00' }, tuesdayEvening)).toBe(false);
  });
});
