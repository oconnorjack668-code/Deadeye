// __tests__/plays-editor.test.ts
// The play editor's rules (src/lib/plays/editor.ts), as a coach meets them:
// each gesture records the right kind of move, moves that belong after
// something already drawn go into a new step, step tools keep the play
// valid, and undo, redo and mirror do what they say. Every result is checked
// with parseDiagram, the validator the server uses.
import { describe, it, expect } from 'vitest';
import { LIBRARY_PLAYS } from '@/data/plays/library';
import { MAX_STEPS, parseDiagram, stepCount, type Diagram } from '@/lib/plays/diagram';
import {
  addStep,
  BASKET_SPOT,
  clientToCourt,
  commit,
  deleteStep,
  duplicateStep,
  lineTypesFor,
  LONG_PRESS_MS,
  mirror,
  moveStep,
  nextPress,
  normalize,
  recordMove,
  redo,
  removeLine,
  screenSpot,
  setLineType,
  setStepMs,
  simplifyPath,
  snapPoint,
  startHistory,
  undo,
  type EditResult,
} from '@/lib/plays/editor';
import { SETUPS, setupDiagram } from '@/lib/plays/setups';
import { spot } from '@/lib/plays/spots';

/** Five out: 1 at the top with the ball, 2 and 3 on the wings, 4 and 5 in the corners. */
const fiveOut = () => setupDiagram('five-out');

function ok(r: EditResult): { diagram: Diagram; step: number } {
  if (!r.ok) throw new Error(`Expected the edit to work, got: ${r.error}`);
  expect(parseDiagram(r.diagram).ok).toBe(true);
  return r;
}

function err(r: EditResult): string {
  if (r.ok) throw new Error('Expected the edit to be refused');
  return r.error;
}

describe('starting set-ups', () => {
  it('offers the six set-ups from the plan, each a valid play with 1 holding the ball and one step to draw on', () => {
    expect(SETUPS.map((s) => s.label)).toEqual(['4-out 1-in', '5-out', 'Horns', 'Box', 'Stack', '1-4 high']);
    for (const s of SETUPS) {
      const d = setupDiagram(s.id);
      expect(parseDiagram(d).ok).toBe(true);
      expect(stepCount(d)).toBe(1);
      expect(d.frames[0].ball).toBe('o1');
      expect(d.players.map((p) => p.label)).toEqual(['1', '2', '3', '4', '5']);
    }
  });
});

describe('gestures', () => {
  it('dragging the ball holder records a dribble, snapped to the nearest spot', () => {
    const { diagram, step } = ok(recordMove(fiveOut(), 1, { kind: 'player', playerId: 'o1', to: { x: 33.6, y: 27.9 } }));
    expect(step).toBe(1);
    expect(diagram.frames[1].actions).toEqual([{ type: 'dribble', from: 'o1', path: [] }]);
    expect(diagram.frames[1].positions.o1).toEqual(spot('right-slot'));
    expect(diagram.frames[1].ball).toBe('o1');
  });

  it('dragging the ball onto a teammate records a pass, and the ball ends with them', () => {
    const { diagram } = ok(recordMove(fiveOut(), 1, { kind: 'ball', to: 'o2' }));
    expect(diagram.frames[1].actions).toEqual([{ type: 'pass', from: 'o1', to: 'o2', path: [] }]);
    expect(diagram.frames[1].ball).toBe('o2');
  });

  it('dragging anyone else records a cut, with the finger path as waypoints', () => {
    const { diagram } = ok(
      recordMove(fiveOut(), 1, { kind: 'player', playerId: 'o3', to: { x: 24, y: 8 }, path: [{ x: 12, y: 12 }] })
    );
    expect(diagram.frames[1].actions).toEqual([{ type: 'cut', from: 'o3', path: [{ x: 12, y: 12 }] }]);
    expect(diagram.frames[1].positions.o3).toEqual(BASKET_SPOT);
  });

  it('a long press, then a drag beside a teammate, records a screen for that teammate', () => {
    const { diagram } = ok(recordMove(fiveOut(), 1, { kind: 'player', playerId: 'o4', to: { x: 42, y: 19.5 }, longPress: true }));
    expect(diagram.frames[1].actions).toEqual([{ type: 'screen', from: 'o4', to: 'o2', path: [] }]);
  });

  it('a long press dropped away from everyone is just a cut', () => {
    const { diagram } = ok(recordMove(fiveOut(), 1, { kind: 'player', playerId: 'o4', to: { x: 34.5, y: 8 }, longPress: true }));
    expect(diagram.frames[1].actions[0].type).toBe('cut');
  });

  it('the ball holder dribbles even after a long press: screening comes after passing', () => {
    const { diagram } = ok(recordMove(fiveOut(), 1, { kind: 'player', playerId: 'o1', to: spot('left-slot'), longPress: true }));
    expect(diagram.frames[1].actions[0].type).toBe('dribble');
  });

  it('after passing, the passer cuts in the same step (give-and-go)', () => {
    const passed = ok(recordMove(fiveOut(), 1, { kind: 'ball', to: 'o2' })).diagram;
    const { diagram, step } = ok(recordMove(passed, 1, { kind: 'player', playerId: 'o1', to: { x: 25, y: 8 } }));
    expect(step).toBe(1);
    expect(diagram.frames[1].actions.map((a) => `${a.type}:${a.from}`)).toEqual(['pass:o1', 'cut:o1']);
  });

  it('the player who just caught the ball sets off in a new step, dribbling', () => {
    const passed = ok(recordMove(fiveOut(), 1, { kind: 'ball', to: 'o2' })).diagram;
    const { diagram, step } = ok(recordMove(passed, 1, { kind: 'player', playerId: 'o2', to: spot('right-elbow') }));
    expect(step).toBe(2);
    expect(stepCount(diagram)).toBe(2);
    expect(diagram.frames[2].actions).toEqual([{ type: 'dribble', from: 'o2', path: [] }]);
  });

  it('a second pass goes into a new step, from whoever has the ball', () => {
    const passed = ok(recordMove(fiveOut(), 1, { kind: 'ball', to: 'o2' })).diagram;
    const { diagram, step } = ok(recordMove(passed, 1, { kind: 'ball', to: 'o4' }));
    expect(step).toBe(2);
    expect(diagram.frames[2].actions).toEqual([{ type: 'pass', from: 'o2', to: 'o4', path: [] }]);
  });

  it('a pass after a dribble goes into a new step too', () => {
    const dribbled = ok(recordMove(fiveOut(), 1, { kind: 'player', playerId: 'o1', to: spot('right-slot') })).diagram;
    const { diagram, step } = ok(recordMove(dribbled, 1, { kind: 'ball', to: 'o2' }));
    expect(step).toBe(2);
    expect(diagram.frames[1].actions[0].type).toBe('dribble');
  });

  it('dragging a player again in the same step redraws their move', () => {
    const once = ok(recordMove(fiveOut(), 1, { kind: 'player', playerId: 'o3', to: spot('left-block') })).diagram;
    const { diagram } = ok(recordMove(once, 1, { kind: 'player', playerId: 'o3', to: spot('left-elbow') }));
    expect(diagram.frames[1].actions).toHaveLength(1);
    expect(diagram.frames[1].positions.o3).toEqual(spot('left-elbow'));
  });

  it('dropping a player back where they started takes their move away', () => {
    const once = ok(recordMove(fiveOut(), 1, { kind: 'player', playerId: 'o3', to: spot('left-block') })).diagram;
    const { diagram } = ok(recordMove(once, 1, { kind: 'player', playerId: 'o3', to: spot('left-wing') }));
    expect(diagram.frames[1].actions).toEqual([]);
  });

  it('refuses moves that make no basketball sense, in plain words', () => {
    expect(err(recordMove(fiveOut(), 1, { kind: 'player', playerId: 'o3', to: spot('left-block'), type: 'dribble' }))).toMatch(
      /Only the player with the ball can dribble/
    );
    expect(err(recordMove(fiveOut(), 1, { kind: 'player', playerId: 'o1', to: spot('left-slot'), type: 'cut' }))).toMatch(/Pass first/);
    expect(err(recordMove(fiveOut(), 1, { kind: 'ball', to: 'o1' }))).toMatch(/teammate/);
    expect(err(recordMove(fiveOut(), 1, { kind: 'player', playerId: 'x1', to: spot('top') }))).toMatch(/1 to 5/);
    expect(err(recordMove(fiveOut(), 1, { kind: 'player', playerId: 'o4', to: spot('right-block'), type: 'screen' }))).toMatch(/next to/);
  });
});

describe('the set-up', () => {
  it('moves a starting spot, and players who have not moved yet stay with it', () => {
    const { diagram, step } = ok(recordMove(fiveOut(), 0, { kind: 'player', playerId: 'o2', to: { x: 44, y: 22 } }));
    expect(step).toBe(0);
    expect(diagram.frames[0].positions.o2).toEqual(spot('right-wing'));
    const moved = ok(recordMove(fiveOut(), 0, { kind: 'player', playerId: 'o2', to: spot('right-elbow') })).diagram;
    expect(moved.frames[1].positions.o2).toEqual(spot('right-elbow'));
  });

  it('gives the ball to someone else, and a dribble by the old holder becomes a cut', () => {
    const dribbled = ok(recordMove(fiveOut(), 1, { kind: 'player', playerId: 'o1', to: spot('left-slot') })).diagram;
    const { diagram } = ok(recordMove(dribbled, 0, { kind: 'ball', to: 'o3' }));
    expect(diagram.frames[0].ball).toBe('o3');
    expect(diagram.frames[1].actions).toEqual([{ type: 'cut', from: 'o1', path: [] }]);
  });
});

describe('changing a line', () => {
  it('switches a pass to a handoff and back', () => {
    const passed = ok(recordMove(fiveOut(), 1, { kind: 'ball', to: 'o2' })).diagram;
    expect(lineTypesFor(passed, 1, 0)).toEqual(['pass', 'handoff']);
    const handoff = ok(setLineType(passed, 1, 0, 'handoff')).diagram;
    expect(handoff.frames[1].actions[0].type).toBe('handoff');
  });

  it('switches a cut to a screen when a teammate is close, and offers only a dribble to the ball holder', () => {
    const cut = ok(recordMove(fiveOut(), 1, { kind: 'player', playerId: 'o4', to: { x: 42, y: 19.5 } })).diagram;
    expect(lineTypesFor(cut, 1, 0)).toEqual(['cut', 'screen']);
    const screen = ok(setLineType(cut, 1, 0, 'screen')).diagram;
    expect(screen.frames[1].actions[0]).toMatchObject({ type: 'screen', to: 'o2' });
    const dribble = ok(recordMove(fiveOut(), 1, { kind: 'player', playerId: 'o1', to: spot('left-slot') })).diagram;
    expect(lineTypesFor(dribble, 1, 0)).toEqual(['dribble']);
    expect(err(setLineType(dribble, 1, 0, 'cut'))).toMatch(/cannot be a cut/);
  });

  it('removes a move, and a removed pass leaves the ball with its holder', () => {
    const passed = ok(recordMove(fiveOut(), 1, { kind: 'ball', to: 'o2' })).diagram;
    const { diagram } = ok(removeLine(passed, 1, 0));
    expect(diagram.frames[1].actions).toEqual([]);
    expect(diagram.frames[1].ball).toBe('o1');
  });
});

describe('steps', () => {
  const twoSteps = () => {
    const a = ok(recordMove(fiveOut(), 1, { kind: 'ball', to: 'o2' })).diagram;
    return ok(recordMove(ok(addStep(a, 1)).diagram, 2, { kind: 'player', playerId: 'o5', to: spot('left-block') })).diagram;
  };

  it('adds an empty step after the one picked', () => {
    const { diagram, step } = ok(addStep(fiveOut(), 1));
    expect(step).toBe(2);
    expect(stepCount(diagram)).toBe(2);
    expect(diagram.frames[2].actions).toEqual([]);
  });

  it('duplicates a step with its timing', () => {
    const slow = ok(setStepMs(fiveOut(), 1, 2000)).diagram;
    const { diagram, step } = ok(duplicateStep(slow, 1));
    expect(step).toBe(2);
    expect(diagram.frames[2].ms).toBe(2000);
  });

  it('deletes a step and its moves, but never the last one', () => {
    const { diagram } = ok(deleteStep(twoSteps(), 1));
    expect(stepCount(diagram)).toBe(1);
    expect(diagram.frames[1].actions.map((a) => a.from)).toEqual(['o5']);
    expect(diagram.frames[1].ball).toBe('o1');
    expect(err(deleteStep(fiveOut(), 1))).toMatch(/at least one step/);
  });

  it('reorders steps, keeping each move', () => {
    const { diagram, step } = ok(moveStep(twoSteps(), 2, -1));
    expect(step).toBe(1);
    expect(diagram.frames[1].actions[0].from).toBe('o5');
    expect(diagram.frames[2].actions[0].type).toBe('pass');
    expect(err(moveStep(twoSteps(), 1, -1))).toMatch(/cannot move/);
  });

  it('sets a step time, kept within the limits', () => {
    expect(ok(setStepMs(fiveOut(), 1, 1500)).diagram.frames[1].ms).toBe(1500);
    expect(ok(setStepMs(fiveOut(), 1, 50)).diagram.frames[1].ms).toBe(300);
  });

  it(`stops at ${MAX_STEPS} steps`, () => {
    let d = fiveOut();
    for (let i = 1; i < MAX_STEPS; i++) d = ok(addStep(d, i)).diagram;
    expect(stepCount(d)).toBe(MAX_STEPS);
    expect(err(addStep(d, MAX_STEPS))).toMatch(/up to 20 steps/);
  });
});

describe('mirror, undo and redo', () => {
  it('flips a play left to right and it still makes sense', () => {
    const d = ok(recordMove(fiveOut(), 1, { kind: 'player', playerId: 'o3', to: spot('left-block') })).diagram;
    const flipped = mirror(d);
    expect(parseDiagram(flipped).ok).toBe(true);
    expect(flipped.frames[1].positions.o3).toEqual(spot('right-block'));
    expect(mirror(flipped)).toEqual(d);
  });

  it('undoes and redoes, and a new edit forgets the redo', () => {
    const a = fiveOut();
    const b = ok(recordMove(a, 1, { kind: 'ball', to: 'o2' })).diagram;
    const c = ok(recordMove(b, 1, { kind: 'player', playerId: 'o1', to: BASKET_SPOT })).diagram;
    let h = commit(commit(startHistory(a), b), c);
    h = undo(h);
    expect(h.present).toBe(b);
    h = redo(h);
    expect(h.present).toBe(c);
    h = commit(undo(h), a);
    expect(h.future).toEqual([]);
    expect(undo(startHistory(a)).present).toBe(a);
  });

  it('keeps the last 50 changes for undo', () => {
    let h = startHistory(fiveOut());
    for (let i = 0; i < 60; i++) h = commit(h, mirror(h.present));
    expect(h.past).toHaveLength(50);
  });
});

describe('pointer helpers', () => {
  it('snaps to named spots and the basket, and keeps points on the court', () => {
    expect(snapPoint({ x: 2.4, y: 4 })).toEqual(spot('left-corner'));
    expect(snapPoint({ x: 25.5, y: 6 })).toEqual(BASKET_SPOT);
    expect(snapPoint({ x: 99, y: -20 })).toEqual({ x: 54, y: -4 });
    expect(snapPoint({ x: 20.3, y: 12.2 })).toEqual({ x: 20.5, y: 12 });
  });

  it('cuts a finger path down to the corners that give it its shape', () => {
    const straight = Array.from({ length: 10 }, (_, i) => ({ x: i, y: i }));
    expect(simplifyPath(straight)).toEqual([]);
    const corner = [...Array.from({ length: 6 }, (_, i) => ({ x: 10, y: 30 - i * 4 })), ...Array.from({ length: 6 }, (_, i) => ({ x: 10 + i * 4, y: 10 }))];
    expect(simplifyPath(corner)).toEqual([{ x: 10, y: 10 }]);
    const zigzag = Array.from({ length: 30 }, (_, i) => ({ x: i, y: i % 2 ? 6 : 0 }));
    expect(simplifyPath(zigzag).length).toBeLessThanOrEqual(3);
  });

  it('tells a drag from a long press', () => {
    expect(nextPress('pending', 100, 2)).toBe('pending');
    expect(nextPress('pending', 100, 20)).toBe('drag');
    expect(nextPress('pending', LONG_PRESS_MS, 2)).toBe('long');
    expect(nextPress('long', LONG_PRESS_MS + 500, 200)).toBe('long');
    expect(nextPress('drag', LONG_PRESS_MS + 500, 0)).toBe('drag');
  });

  it('turns a pointer position into feet on the court', () => {
    const box = { x: -40, y: -40, width: 580, height: 540 };
    // Shown at 290 x 270 px, half size: the top-left corner is (-4, -4) ft
    expect(clientToCourt({ left: 0, top: 0, width: 290, height: 270 }, box, 10, 0, 0)).toEqual({ x: -4, y: -4 });
    expect(clientToCourt({ left: 10, top: 20, width: 290, height: 270 }, box, 10, 10 + 145, 20 + 135)).toEqual({ x: 25, y: 23 });
  });

  it('stands a screener just beside the teammate, on their own side', () => {
    expect(screenSpot({ x: 25, y: 31 }, { x: 25, y: 20 })).toEqual({ x: 25, y: 23 });
  });
});

describe('normalize', () => {
  it('leaves every library play valid, with the same spots and moves', () => {
    for (const play of LIBRARY_PLAYS) {
      const out = normalize(play.diagram);
      expect(parseDiagram(out).ok).toBe(true);
      out.frames.forEach((f, k) => {
        expect(f.positions).toEqual(play.diagram.frames[k].positions);
        expect(f.ball).toBe(play.diagram.frames[k].ball);
        const key = (a: { type: string; from: string }) => `${a.type}:${a.from}`;
        expect(f.actions.map(key).sort()).toEqual(play.diagram.frames[k].actions.map(key).sort());
      });
    }
  });
});
