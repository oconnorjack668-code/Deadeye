// src/lib/plays/build.ts
// Writes a diagram from a list of moves, so a play reads like a coach's
// notes ("1 passes to 2; 1 cuts to the basket") instead of five full sets of
// coordinates per step. Used by the library seed (src/data/plays) and, in F2,
// by the editor, which records one move at a time.
import { DEFAULT_STEP_MS, DIAGRAM_VERSION, MOVEMENT_TYPES, type ActionType, type Diagram, type DiagramFrame, type DiagramPlayer } from './diagram';
import type { Point } from './spots';

export interface StepMove {
  type: ActionType;
  /** Player id, e.g. 'o1'. */
  from: string;
  /** The receiver of a pass or handoff, or the teammate a screen is for. */
  to?: string;
  /** Where a dribble, cut or screen ends. */
  at?: Point;
  /** Waypoints on the way, for a curl or a V-cut. */
  via?: Point[];
}

export interface StepSpec {
  moves: StepMove[];
  note?: string;
  ms?: number;
  /** New spots for defenders, who move without drawn lines. */
  defence?: Record<string, Point>;
}

/** Offence o1-o5 are labelled 1-5, defence x1-x5 are X1-X5. */
export function playerFor(id: string): DiagramPlayer {
  const n = id.slice(1);
  return id.startsWith('x') ? { id, side: 'defence', label: `X${n}` } : { id, side: 'offence', label: n };
}

export function buildDiagram(setup: { positions: Record<string, Point>; ball: string }, steps: StepSpec[]): Diagram {
  const players = Object.keys(setup.positions).sort().map(playerFor);
  const frames: DiagramFrame[] = [{ ms: 0, positions: clone(setup.positions), ball: setup.ball, actions: [] }];

  for (const step of steps) {
    const before = frames[frames.length - 1];
    const positions = clone(before.positions);
    let ball = before.ball;
    for (const move of step.moves) {
      if (MOVEMENT_TYPES.includes(move.type)) {
        if (!move.at) throw new Error(`A ${move.type} by ${move.from} needs an end spot`);
        positions[move.from] = { ...move.at };
      } else if (move.to) {
        ball = move.to;
      }
    }
    for (const [id, p] of Object.entries(step.defence ?? {})) positions[id] = { ...p };
    frames.push({
      ms: step.ms ?? DEFAULT_STEP_MS,
      positions,
      ball,
      actions: step.moves.map((m) => ({
        type: m.type,
        from: m.from,
        ...(m.to ? { to: m.to } : {}),
        path: (m.via ?? []).map((p) => ({ ...p })),
      })),
      ...(step.note ? { note: step.note } : {}),
    });
  }
  return { v: DIAGRAM_VERSION, court: 'half', players, frames };
}

function clone(positions: Record<string, Point>): Record<string, Point> {
  return Object.fromEntries(Object.entries(positions).map(([id, p]) => [id, { x: p.x, y: p.y }]));
}
