// @vitest-environment node
// __tests__/plays-words.test.ts
// A play in words: court spots, step names, "Show my role" jobs, and the
// underage rule warnings, all worked out from the drawing.
import { describe, it, expect } from 'vitest';
import { buildDiagram } from '@/lib/plays/build';
import { describePoint, nearestSpot, snapToSpot, spot } from '@/lib/plays/spots';
import { isInvolved, roleJob, roleJobs, roleStart, stepName, stepNames } from '@/lib/plays/roles';
import { ageRuleWarnings, hasBallScreen } from '@/lib/plays/ageRules';
import { ageLabel, suitsGrade } from '@/lib/plays/catalog';

const pnr = buildDiagram(
  { positions: { o1: spot('top'), o2: spot('right-corner'), o3: spot('left-corner'), o5: spot('high-post') }, ball: 'o1' },
  [
    { moves: [{ type: 'screen', from: 'o5', to: 'o1', at: { x: 28, y: 28.5 } }] },
    { moves: [{ type: 'dribble', from: 'o1', at: { x: 37, y: 22 } }] },
    {
      moves: [
        { type: 'cut', from: 'o5', at: { x: 26, y: 7 } },
        { type: 'pass', from: 'o1', to: 'o5' },
      ],
    },
  ]
);

describe('court spots', () => {
  it('finds the nearest named spot, and none when far from all of them', () => {
    expect(nearestSpot({ x: 6, y: 22 })?.id).toBe('left-wing');
    expect(nearestSpot({ x: 25, y: 40 })).toBeNull();
  });

  it('snaps onto a spot only when close', () => {
    expect(snapToSpot({ x: 33.8, y: 18 })).toEqual(spot('right-elbow'));
    expect(snapToSpot({ x: 25, y: 40 })).toEqual({ x: 25, y: 40 });
  });

  it('describes the basket, out of bounds and open floor in words', () => {
    expect(describePoint({ x: 26, y: 7 })).toBe('the basket');
    expect(describePoint({ x: 30, y: -2 })).toBe('out of bounds');
    expect(describePoint({ x: 1.5, y: 3 })).toBe('the left corner');
    expect(describePoint({ x: 8, y: 47 })).toBe('the left side near half court');
    expect(describePoint({ x: 40, y: 36 })).toBe('the right side');
  });

  it('throws on a misspelt spot, so seed data cannot hide a typo', () => {
    expect(() => spot('left-wnig')).toThrow(/Unknown court spot/);
  });
});

describe('step names', () => {
  it('names each step from its moves, passes first', () => {
    expect(stepNames(pnr)).toEqual(['5 screens for 1', '1 dribbles to the right side', '1 passes to 5, 5 cuts to the basket']);
  });

  it('says when nobody moves', () => {
    const still = buildDiagram({ positions: { o1: spot('top') }, ball: 'o1' }, [{ moves: [] }]);
    expect(stepName(still, 1)).toBe('Everyone holds');
  });
});

describe('Show my role', () => {
  it('gives the ball handler their start and their job at each step', () => {
    expect(roleStart(pnr, 'o1')).toBe('Start at the top with the ball');
    expect(roleJobs(pnr, 'o1')).toEqual(['Hold the ball and wait for the screen from 5', 'Dribble to the right side off the screen from 5', 'Pass to 5']);
  });

  it('tells the screener to screen, then roll and catch', () => {
    expect(roleJobs(pnr, 'o5')).toEqual(['Screen for 1', 'Stay at the top', 'Cut to the basket, then catch the pass from 1']);
  });

  it('tells a player with nothing to do where to stay', () => {
    expect(roleJob(pnr, 2, 'o3')).toBe('Stay at the left corner');
  });

  it('knows who takes part in a step', () => {
    expect(isInvolved(pnr, 3, 'o5')).toBe(true);
    expect(isInvolved(pnr, 3, 'o1')).toBe(true);
    expect(isInvolved(pnr, 3, 'o2')).toBe(false);
  });

  it('names more than one screener', () => {
    const floppy = buildDiagram(
      { positions: { o1: spot('top'), o2: { x: 25, y: 6 }, o4: spot('right-block'), o5: { x: 34.5, y: 12 } }, ball: 'o1' },
      [
        {
          moves: [
            { type: 'screen', from: 'o4', to: 'o2', at: { x: 32.5, y: 9 } },
            { type: 'screen', from: 'o5', to: 'o2', at: { x: 32.5, y: 13 } },
            { type: 'cut', from: 'o2', at: spot('right-wing') },
          ],
        },
      ]
    );
    expect(roleJob(floppy, 1, 'o2')).toBe('Cut to the right wing off the screens from 4 and 5');
  });
});

describe('underage rules (Basketball Ireland, August 2024)', () => {
  const base = { category: 'pick_and_roll', tags: ['ball screen'], diagram: pnr };

  it('spots a screen for the ball handler, not an off-ball one', () => {
    expect(hasBallScreen(pnr)).toBe(true);
    const offBall = buildDiagram({ positions: { o1: spot('top'), o2: spot('left-block'), o3: spot('right-block') }, ball: 'o1' }, [
      { moves: [{ type: 'screen', from: 'o3', to: 'o2', at: { x: 21, y: 8 } }] },
    ]);
    expect(hasBallScreen(offBall)).toBe(false);
  });

  it('warns about a ball screen at U11 and under, not at U12', () => {
    expect(ageRuleWarnings({ ...base, min_age: 'U11' })).toEqual([
      'Ball screens are not allowed at U11 and under, so this play is for U12 and up.',
    ]);
    expect(ageRuleWarnings({ ...base, min_age: 'U12' })).toEqual([]);
  });

  it('warns about a zone offence at U14 and under', () => {
    const zone = { category: 'zone_offence', tags: [], diagram: pnr, min_age: 'U14' as const };
    expect(ageRuleWarnings({ ...zone, category: 'half_court', tags: ['vs zone'] })).toEqual([
      'Teams at U14 and under play man-to-man only, so a zone offence is for U15 and up.',
    ]);
    expect(ageRuleWarnings(zone)).toHaveLength(1);
    expect(ageRuleWarnings({ ...zone, min_age: 'U15' }).filter((w) => /zone/.test(w))).toEqual([]);
  });

  it('warns about a press break at U11, when pressing is not allowed', () => {
    const quiet = buildDiagram({ positions: { o1: spot('top'), o2: spot('left-wing') }, ball: 'o1' }, [
      { moves: [{ type: 'pass', from: 'o1', to: 'o2' }] },
    ]);
    expect(ageRuleWarnings({ category: 'press_break', tags: [], diagram: quiet, min_age: 'U11' })).toEqual([
      'Pressing is not allowed at U11 and under, so a press break is for U12 and up.',
    ]);
  });
});

describe('age grades', () => {
  it('compares grades youngest first', () => {
    expect(suitsGrade('U12', 'U14')).toBe(true);
    expect(suitsGrade('U14', 'U12')).toBe(false);
    expect(ageLabel('U12')).toBe('From U12');
    expect(ageLabel('U9')).toBe('All ages');
  });
});
