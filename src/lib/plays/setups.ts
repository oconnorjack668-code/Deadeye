// src/lib/plays/setups.ts
// The starting set-ups a coach can draw a play from (plan section 3, point 3):
// where the five players stand before step 1. 1 always starts with the ball.
import { buildDiagram } from './build';
import type { Diagram } from './diagram';
import { spot, type Point } from './spots';

export interface Setup {
  id: string;
  label: string;
  positions: Record<string, Point>;
}

export const SETUPS: readonly Setup[] = [
  {
    id: 'four-out-one-in',
    label: '4-out 1-in',
    positions: { o1: spot('left-slot'), o2: spot('right-slot'), o3: spot('left-wing'), o4: spot('right-wing'), o5: spot('right-block') },
  },
  {
    id: 'five-out',
    label: '5-out',
    positions: { o1: spot('top'), o2: spot('right-wing'), o3: spot('left-wing'), o4: spot('right-corner'), o5: spot('left-corner') },
  },
  {
    id: 'horns',
    label: 'Horns',
    positions: { o1: spot('top'), o2: spot('right-corner'), o3: spot('left-corner'), o4: spot('left-elbow'), o5: spot('right-elbow') },
  },
  {
    id: 'box',
    label: 'Box',
    positions: { o1: spot('top'), o2: spot('left-elbow'), o3: spot('right-elbow'), o4: spot('left-block'), o5: spot('right-block') },
  },
  {
    id: 'stack',
    label: 'Stack',
    // Two players lined up on each block: the shooters on top
    positions: { o1: spot('top'), o2: { x: 14.5, y: 13 }, o3: { x: 35.5, y: 13 }, o4: spot('left-block'), o5: spot('right-block') },
  },
  {
    id: 'one-four-high',
    label: '1-4 high',
    positions: { o1: { x: 25, y: 33 }, o2: { x: 44, y: 23 }, o3: { x: 6, y: 23 }, o4: spot('left-elbow'), o5: spot('right-elbow') },
  },
];

export const DEFAULT_SETUP = SETUPS[0].id;

/** A new play from a set-up: everyone in place, 1 with the ball, and one empty step to draw on. */
export function setupDiagram(id: string): Diagram {
  const setup = SETUPS.find((s) => s.id === id) ?? SETUPS[0];
  return buildDiagram({ positions: setup.positions, ball: 'o1' }, [{ moves: [] }]);
}
