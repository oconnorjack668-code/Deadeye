// __tests__/funnel.test.ts
import { describe, it, expect } from 'vitest';
import { buildFunnel } from '@/lib/funnel';

const players = [
  { id: 'a', setupDone: true },
  { id: 'b', setupDone: true },
  { id: 'c', setupDone: true },
  { id: 'd', setupDone: false },
];

const count = (f: ReturnType<typeof buildFunnel>, key: string) =>
  f.groups.flatMap((g) => g.steps).find((s) => s.key === key)?.count;

describe('buildFunnel', () => {
  it('counts players, not rows, and only players in the window', () => {
    const f = buildFunnel(
      players,
      [
        { user_id: 'a', name: 'tracker_opened' },
        { user_id: 'a', name: 'tracker_opened' }, // a second day
        { user_id: 'b', name: 'tracker_opened' },
        { user_id: 'zz', name: 'tracker_opened' }, // joined before the window
      ],
      []
    );
    expect(f.joined).toBe(4);
    expect(count(f, 'setup')).toBe(3);
    expect(count(f, 'tracker_opened')).toBe(2);
  });

  it('counts 1st, 2nd and 3rd sessions, and a tracked save from either source', () => {
    const f = buildFunnel(
      players,
      [{ user_id: 'c', name: 'tracker_saved' }],
      [
        { user_id: 'a', verified_by_video: false },
        { user_id: 'a', verified_by_video: true },
        { user_id: 'a', verified_by_video: false },
        { user_id: 'b', verified_by_video: false },
        { user_id: 'zz', verified_by_video: true },
      ]
    );
    expect(count(f, 'session_1')).toBe(2);
    expect(count(f, 'session_2')).toBe(1);
    expect(count(f, 'session_3')).toBe(1);
    expect(count(f, 'tracker_saved')).toBe(2); // a from the session, c from the event
  });

  it('names the step on the main line that loses the most players', () => {
    const f = buildFunnel(players, [], [{ user_id: 'a', verified_by_video: false }]);
    // 4 joined, 3 set up, 1 logged: setup to 1st session loses 2
    expect(f.biggestDrop).toEqual({ from: 'Finished setup', to: 'Logged a 1st hoops session', lost: 2 });
    expect(buildFunnel([], [], []).biggestDrop).toBeNull();
  });
});
