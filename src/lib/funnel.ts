// src/lib/funnel.ts
// How far the players who joined in a window got: set up, the welcome steps,
// the tracker, and their first three hoops sessions. Read at /admin/funnel.
//
// Each step counts players who ever reached it, as a share of those who
// joined. The groups are not one straight line - a player can log shots by
// hand without touching the tracker - so only the main line (joined, set up,
// 1st, 2nd and 3rd session) is used to find where most players stop.
import type { EventName } from '@/lib/events';

export interface FunnelPlayer {
  id: string;
  setupDone: boolean;
}

export interface FunnelSession {
  user_id: string;
  verified_by_video: boolean;
}

export interface FunnelStep {
  key: string;
  label: string;
  count: number;
}

export interface FunnelGroup {
  title: string;
  steps: FunnelStep[];
}

export interface Funnel {
  joined: number;
  groups: FunnelGroup[];
  /** The step on the main line that loses the most players, if any are lost */
  biggestDrop: { from: string; to: string; lost: number } | null;
}

const EVENT_STEPS: Array<{ title: string; steps: Array<{ name: EventName; label: string }> }> = [
  {
    title: 'Welcome',
    steps: [
      { name: 'welcome_seen', label: 'Saw the welcome screen' },
      { name: 'sample_played', label: 'Played the sample clip' },
      { name: 'sample_finished', label: 'Watched the sample to the end' },
    ],
  },
  {
    title: 'Shot tracker',
    steps: [
      { name: 'tracker_opened', label: 'Opened the tracker' },
      { name: 'tracker_setup', label: 'Picked camera or video, set the rim' },
      { name: 'tracker_started', label: 'Started tracking' },
      { name: 'tracker_finished', label: 'Reached the results' },
    ],
  },
];

export function buildFunnel(players: FunnelPlayer[], events: Array<{ user_id: string; name: string }>, sessions: FunnelSession[]): Funnel {
  const ids = new Set(players.map((p) => p.id));
  const reached = new Map<string, Set<string>>();
  for (const e of events) {
    if (!ids.has(e.user_id)) continue;
    if (!reached.has(e.name)) reached.set(e.name, new Set());
    reached.get(e.name)!.add(e.user_id);
  }

  const sessionCount = new Map<string, number>();
  const trackedSaved = new Set<string>(reached.get('tracker_saved') ?? []);
  for (const s of sessions) {
    if (!ids.has(s.user_id)) continue;
    sessionCount.set(s.user_id, (sessionCount.get(s.user_id) ?? 0) + 1);
    if (s.verified_by_video) trackedSaved.add(s.user_id);
  }
  const withSessions = (n: number) => [...sessionCount.values()].filter((c) => c >= n).length;

  const main: FunnelStep[] = [
    { key: 'joined', label: 'Joined', count: players.length },
    { key: 'setup', label: 'Finished setup', count: players.filter((p) => p.setupDone).length },
    { key: 'session_1', label: 'Logged a 1st hoops session', count: withSessions(1) },
    { key: 'session_2', label: 'Logged a 2nd', count: withSessions(2) },
    { key: 'session_3', label: 'Logged a 3rd', count: withSessions(3) },
  ];

  let biggestDrop: Funnel['biggestDrop'] = null;
  for (let i = 1; i < main.length; i++) {
    const lost = main[i - 1].count - main[i].count;
    if (lost > 0 && (!biggestDrop || lost > biggestDrop.lost)) {
      biggestDrop = { from: main[i - 1].label, to: main[i].label, lost };
    }
  }

  const eventGroups = EVENT_STEPS.map((g) => ({
    title: g.title,
    steps: g.steps.map((s) => ({ key: s.name, label: s.label, count: reached.get(s.name)?.size ?? 0 })),
  }));
  eventGroups[1].steps.push({ key: 'tracker_saved', label: 'Saved a tracked session', count: trackedSaved.size });

  return {
    joined: players.length,
    groups: [
      { title: 'Joining and logging', steps: main },
      ...eventGroups,
    ],
    biggestDrop,
  };
}
