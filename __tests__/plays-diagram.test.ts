// @vitest-environment node
// __tests__/plays-diagram.test.ts
// parseDiagram is the one gate every play diagram passes (library seed now,
// the editor and its server route in F2), so it must reject anything that
// cannot be drawn or makes no basketball sense, with a plain reason.
import { describe, it, expect } from 'vitest';
import { buildDiagram, playerFor } from '@/lib/plays/build';
import { DiagramSchema, parseDiagram, stepCount, type Diagram } from '@/lib/plays/diagram';

const setup = { positions: { o1: { x: 25, y: 31 }, o2: { x: 45, y: 21 }, o3: { x: 5, y: 21 } }, ball: 'o1' };

function giveAndGo(): Diagram {
  return buildDiagram(setup, [
    { moves: [{ type: 'pass', from: 'o1', to: 'o2' }] },
    { moves: [{ type: 'cut', from: 'o1', at: { x: 27, y: 8 } }] },
    { moves: [{ type: 'pass', from: 'o2', to: 'o1' }] },
  ]);
}

function problems(d: unknown): string[] {
  const r = parseDiagram(d);
  return r.ok ? [] : r.problems;
}

describe('buildDiagram', () => {
  it('carries positions forward and moves the ball on a pass', () => {
    const d = giveAndGo();
    expect(stepCount(d)).toBe(3);
    expect(d.frames[1].ball).toBe('o2');
    expect(d.frames[2].positions.o1).toEqual({ x: 27, y: 8 });
    expect(d.frames[2].positions.o2).toEqual({ x: 45, y: 21 });
    expect(d.frames[3].ball).toBe('o1');
    expect(d.frames[1].ms).toBe(1000);
  });

  it('labels offence 1-5 and defence X1-X5', () => {
    expect(playerFor('o3')).toEqual({ id: 'o3', side: 'offence', label: '3' });
    expect(playerFor('x2')).toEqual({ id: 'x2', side: 'defence', label: 'X2' });
  });

  it('refuses a cut with nowhere to go', () => {
    expect(() => buildDiagram(setup, [{ moves: [{ type: 'cut', from: 'o2' }] }])).toThrow(/needs an end spot/);
  });
});

describe('parseDiagram', () => {
  it('accepts a sound play', () => {
    expect(problems(giveAndGo())).toEqual([]);
    expect(DiagramSchema.safeParse(giveAndGo()).success).toBe(true);
  });

  it('accepts defenders who drift without drawn moves', () => {
    const d = buildDiagram({ ...setup, positions: { ...setup.positions, x1: { x: 25, y: 27 } } }, [
      { moves: [{ type: 'pass', from: 'o1', to: 'o2' }], defence: { x1: { x: 30, y: 25 } } },
    ]);
    expect(problems(d)).toEqual([]);
  });

  it('rejects the wrong shape, with the place it went wrong', () => {
    expect(problems(null)[0]).toMatch(/^diagram:/);
    expect(problems({ ...giveAndGo(), v: 2 })[0]).toMatch(/^v:/);
    const offCourt = giveAndGo();
    offCourt.frames[0].positions.o1 = { x: 80, y: 31 };
    expect(problems(offCourt)[0]).toMatch(/frames\.0\.positions\.o1\.x/);
  });

  it('rejects names in place of numbers', () => {
    const d = giveAndGo();
    d.players[0] = { id: 'o1', side: 'offence', label: 'Sam' };
    expect(problems(d).length).toBeGreaterThan(0);
  });

  it('rejects a label that does not match the id', () => {
    const d = giveAndGo();
    d.players[0] = { id: 'o1', side: 'offence', label: '4' };
    expect(problems(d)).toContain('Player o1 should be labelled 1.');
  });

  it('rejects a frame that leaves a player out', () => {
    const d = giveAndGo();
    delete d.frames[2].positions.o3;
    expect(problems(d)).toContain('Step 2 has no spot for player o3.');
  });

  it('rejects a pass from someone without the ball', () => {
    const d = giveAndGo();
    d.frames[1].actions = [{ type: 'pass', from: 'o3', to: 'o2', path: [] }];
    expect(problems(d)).toContain('Step 1: 3 passes but does not have the ball.');
  });

  it('rejects the ball changing hands with no pass', () => {
    const d = giveAndGo();
    d.frames[1].actions = [];
    expect(problems(d)).toContain('Step 1: the ball changes hands without a pass.');
  });

  it('rejects a player who moves with no move drawn', () => {
    const d = giveAndGo();
    d.frames[2].actions = [];
    expect(problems(d)).toContain('Step 2: 1 moves without a cut, dribble or screen.');
  });

  it('rejects walking with the ball', () => {
    const d = buildDiagram(setup, [{ moves: [{ type: 'cut', from: 'o1', at: { x: 30, y: 20 } }] }]);
    expect(problems(d)).toContain('Step 1: 1 moves with the ball without dribbling.');
  });

  it('allows pass and cut in one step', () => {
    const d = buildDiagram(setup, [
      {
        moves: [
          { type: 'pass', from: 'o1', to: 'o2' },
          { type: 'cut', from: 'o1', at: { x: 27, y: 8 } },
        ],
      },
    ]);
    expect(problems(d)).toEqual([]);
  });

  it('rejects a dribble by someone without the ball, and a screen for nobody', () => {
    const d = buildDiagram(setup, [
      {
        moves: [
          { type: 'dribble', from: 'o2', at: { x: 40, y: 15 } },
          { type: 'screen', from: 'o3', at: { x: 10, y: 21 } },
        ],
      },
    ]);
    const found = problems(d);
    expect(found).toContain('Step 1: 2 dribbles without the ball.');
    expect(found).toContain('Step 1: 3 screens for nobody on their team.');
  });

  it('rejects two passes in one step', () => {
    const d = giveAndGo();
    d.frames[1].actions.push({ type: 'pass', from: 'o2', to: 'o3', path: [] });
    expect(problems(d)).toContain('Step 1: only one pass a step.');
  });

  it('rejects a set-up with no ball or with moves', () => {
    const d = giveAndGo();
    d.frames[0].ball = null;
    expect(problems(d)).toContain('Someone on offence must have the ball at the start.');
  });

  it('rejects a step that is too short to see', () => {
    const d = giveAndGo();
    d.frames[1].ms = 100;
    expect(problems(d)).toContain('Step 1 is shorter than 300 ms.');
  });
});
