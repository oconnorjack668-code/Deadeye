// src/lib/plays/roles.ts
// A play in words, worked out from the drawing so nobody has to write it:
// each step names itself ("1 passes to 2, 1 cuts to the basket"), and "Show
// my role" gives one player their job at every step ("Pass to 2, then cut to
// the basket"). This is what a player actually needs to learn a play.
import type { Diagram, DiagramAction } from './diagram';
import { MOVEMENT_TYPES } from './diagram';
import { describePoint, type Point } from './spots';

function labelOf(d: Diagram, id: string | undefined): string {
  return d.players.find((p) => p.id === id)?.label ?? '?';
}

function toWhere(p: Point): string {
  return p.y < 0 ? 'out of bounds' : `to ${describePoint(p)}`;
}

function atWhere(p: Point): string {
  return p.y < 0 ? 'out of bounds' : `at ${describePoint(p)}`;
}

function listLabels(labels: string[]): string {
  return labels.length <= 1 ? labels.join('') : `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** One move as a phrase about player `who`, e.g. "1 passes to 2". */
function actionPhrase(d: Diagram, k: number, a: DiagramAction): string {
  const who = labelOf(d, a.from);
  const end = d.frames[k].positions[a.from];
  switch (a.type) {
    case 'pass':
      return `${who} passes to ${labelOf(d, a.to)}`;
    case 'handoff':
      return `${who} hands off to ${labelOf(d, a.to)}`;
    case 'dribble':
      return `${who} dribbles ${toWhere(end)}`;
    case 'cut':
      return `${who} cuts ${toWhere(end)}`;
    case 'screen':
      return `${who} screens for ${labelOf(d, a.to)}`;
  }
}

/** The name of step k (1..n), from its moves. */
export function stepName(d: Diagram, k: number): string {
  const actions = d.frames[k]?.actions ?? [];
  if (actions.length === 0) return 'Everyone holds';
  // Passes first: they are what everyone else is reacting to
  const ordered = [...actions].sort((a, b) => rank(a) - rank(b));
  return ordered.map((a) => actionPhrase(d, k, a)).join(', ');
}

function rank(a: DiagramAction): number {
  return a.type === 'pass' || a.type === 'handoff' ? 0 : a.type === 'screen' ? 1 : 2;
}

/** All step names, step 1 first. */
export function stepNames(d: Diagram): string[] {
  return d.frames.slice(1).map((_, i) => stepName(d, i + 1));
}

/** Where a player starts, e.g. "Start at the top with the ball". */
export function roleStart(d: Diagram, playerId: string): string {
  const first = d.frames[0];
  return `Start ${atWhere(first.positions[playerId])}${first.ball === playerId ? ' with the ball' : ''}`;
}

/** Player `playerId`'s job in step k, in the second person. */
export function roleJob(d: Diagram, k: number, playerId: string): string {
  const frame = d.frames[k];
  const before = d.frames[k - 1];
  const mine = frame.actions.filter((a) => a.from === playerId);
  const pass = mine.find((a) => a.type === 'pass' || a.type === 'handoff');
  const move = mine.find((a) => MOVEMENT_TYPES.includes(a.type));
  const caught = frame.actions.find((a) => (a.type === 'pass' || a.type === 'handoff') && a.to === playerId);
  const screeners = screenersFor(d, k, playerId).map((id) => labelOf(d, id));
  const end = frame.positions[playerId];
  const hasBall = before.ball === playerId && frame.ball === playerId;

  const bits: string[] = [];
  if (pass) bits.push(`${pass.type === 'handoff' ? 'hand off' : 'pass'} to ${labelOf(d, pass.to)}`);
  if (move) {
    let phrase =
      move.type === 'screen' ? `screen for ${labelOf(d, move.to)}` : `${move.type === 'dribble' ? 'dribble' : 'cut'} ${toWhere(end)}`;
    if (screeners.length && move.type !== 'screen') {
      phrase += ` off the screen${screeners.length > 1 ? 's' : ''} from ${listLabels(screeners)}`;
    }
    bits.push(phrase);
  }
  if (caught) bits.push(`catch the ${caught.type === 'handoff' ? 'handoff' : 'pass'} from ${labelOf(d, caught.from)}`);
  if (bits.length === 0 && screeners.length) {
    bits.push(`${hasBall ? 'hold the ball and ' : ''}wait for the screen${screeners.length > 1 ? 's' : ''} from ${listLabels(screeners)}`);
  } else if (bits.length === 0) {
    bits.push(hasBall ? `hold the ball ${atWhere(end)}` : `stay ${atWhere(end)}`);
  }
  return capitalise(bits.join(', then '));
}

/**
 * Who screens for a player in step k: screens drawn in this step, and screens
 * set in the step before by a screener who is still standing there (a ball
 * screen is set in one step and used in the next).
 */
function screenersFor(d: Diagram, k: number, playerId: string): string[] {
  const now = d.frames[k].actions.filter((a) => a.type === 'screen' && a.to === playerId).map((a) => a.from);
  if (k < 2) return now;
  const stillThere = d.frames[k - 1].actions
    .filter((a) => a.type === 'screen' && a.to === playerId && !d.frames[k].actions.some((b) => b.from === a.from && MOVEMENT_TYPES.includes(b.type)))
    .map((a) => a.from);
  return [...new Set([...now, ...stillThere])];
}

/** Every step's job for one player, step 1 first. */
export function roleJobs(d: Diagram, playerId: string): string[] {
  return d.frames.slice(1).map((_, i) => roleJob(d, i + 1, playerId));
}

/** True when the player does something (moves, passes or catches) in step k. */
export function isInvolved(d: Diagram, k: number, playerId: string): boolean {
  return d.frames[k].actions.some((a) => a.from === playerId || ((a.type === 'pass' || a.type === 'handoff') && a.to === playerId));
}
