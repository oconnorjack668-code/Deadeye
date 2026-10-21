// src/lib/starter.ts
// The four starting steps on the dashboard, and the one-off XP bonus for
// finishing them.
//
// On 19 Oct 2026, 12 of the 17 players who had finished setup did nothing at
// all afterwards. Most arrive from TikTok or Instagram, often nowhere near a
// court, so three of the four steps can be done from the sofa: putting Deadeye
// on the home screen, watching the tracker call a sample session, and the daily
// IQ question. Logging real shots is the fourth.
//
// Two of the steps only happen on the phone (installing and the sample), so
// they are remembered in localStorage. The other two are in the database and
// /api/starter-bonus checks them there before paying out.
//
// The bonus is stored as a reward_events row: only the server can insert
// there (00018), 'milestone_reached' is an allowed event type (00005), and the
// unique (user_id, badge_id) index means it can only ever be paid once.

export const STARTER_BONUS_ID = 'starter-steps';
export const STARTER_BONUS_XP = 150;

export type StarterStepId = 'install' | 'sample' | 'iq' | 'shots';

export const STARTER_STEPS: Array<{ id: StarterStepId; title: string; detail: string; href: string }> = [
  {
    id: 'install',
    title: 'Add Deadeye to your home screen',
    detail: 'It opens full screen, like any other app, and reminders work on iPhone.',
    href: '/install',
  },
  {
    id: 'sample',
    title: 'Watch the tracker call a session',
    detail: 'A 30-second sample clip. No court or ball needed.',
    href: '/welcome/sample',
  },
  {
    id: 'iq',
    title: "Answer today's IQ question",
    detail: 'One question a day about reads, rules and decisions.',
    href: '/study',
  },
  {
    id: 'shots',
    title: 'Log your first shots',
    detail: 'Tap where you shot from, then how many went in.',
    href: '/basketball/new',
  },
];

/** Set once the sample clip has played to the end on this device. */
export const SAMPLE_TRIED_KEY = 'deadeye-sample-tried';
/** Set the first time Deadeye is seen running from the home screen on this device. */
export const INSTALLED_KEY = 'deadeye-installed-seen';
/** The player hid the starting steps before finishing them. */
export const STARTER_HIDDEN_KEY = 'deadeye-starter-hidden';
/** The player hid the first-time tips in the shot logger (FirstLogGuide). */
export const LOG_GUIDE_HIDDEN_KEY = 'deadeye-log-guide-hidden';

/** localStorage read that never throws: private windows and blocked storage both do. */
export function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function writeFlag(key: string): void {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // Storage blocked: the step just shows as not done on this device
  }
}

/** True when this page is running as the installed app rather than in a browser tab. */
export function runningInstalled(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return iosStandalone || window.matchMedia?.('(display-mode: standalone)').matches === true;
}
