// src/lib/plays/editor.ts
// The play editor's rules, as pure functions of a diagram, so every gesture
// is tested without a pointer or a screen.
//
// A coach records a play by moving players, one step at a time:
//   - drag the ball holder: a dribble;
//   - drag the ball onto a teammate: a pass;
//   - long-press a player, then drag: a screen for the nearest teammate;
//   - drag anyone else: a cut.
// Each function returns a new diagram that passes parseDiagram, or a plain
// sentence saying why the move cannot be made. When a move belongs after
// something already drawn in this step (passing again, or the player who just
// caught the ball setting off), it goes into a new step of its own, so the
// coach never has to think about steps to draw a play.
//
// normalize() is what keeps any edit valid: it works out, step by step from
// the set-up, where everyone starts, who has the ball, and which moves still
// make sense (a dribble by someone who no longer has the ball becomes a cut).
import {
  BOUNDS,
  DEFAULT_STEP_MS,
  MAX_STEP_MS,
  MAX_STEPS,
  MIN_STEP_MS,
  MOVE_EPSILON_FT,
  MOVEMENT_TYPES,
  parseDiagram,
  stepCount,
  type ActionType,
  type Diagram,
  type DiagramAction,
  type DiagramFrame,
} from './diagram';
import { distance, snapToSpot, type Point } from './spots';

export type EditResult = { ok: true; diagram: Diagram; step: number } | { ok: false; error: string };

export type MoveType = 'cut' | 'dribble' | 'screen';
export type PassType = 'pass' | 'handoff';

export type MoveRequest =
  | {
      kind: 'player';
      playerId: string;
      /** Where the player ends up (snapped to a named spot when close). */
      to: Point;
      /** Points the finger passed through, for a curl. */
      path?: Point[];
      longPress?: boolean;
      /** Chosen in the move panel; worked out from the gesture when left out. */
      type?: MoveType;
      screenFor?: string;
    }
  | { kind: 'ball'; to: string; type?: PassType };

/** Where "the basket" snaps to: in front of the rim, as the library plays draw it. */
export const BASKET_SPOT: Point = { x: 25, y: 7 };

/** A screener this far from a teammate is screening for them. */
const SCREEN_REACH_FT = 7;

/** A screen is set this far from the teammate it is for. */
const SCREEN_GAP_FT = 3;

const isBallMove = (t: ActionType) => t === 'pass' || t === 'handoff';
const isMovement = (t: ActionType) => MOVEMENT_TYPES.includes(t);

const round = (n: number) => Math.round(n * 2) / 2;

export function clampToCourt(p: Point): Point {
  return {
    x: Math.min(Math.max(p.x, BOUNDS.minX), BOUNDS.maxX),
    y: Math.min(Math.max(p.y, BOUNDS.minY), BOUNDS.maxY),
  };
}

/** Onto the court, onto a named spot or the basket when close, and to the half foot. */
export function snapPoint(p: Point): Point {
  const c = clampToCourt(p);
  if (distance(c, BASKET_SPOT) <= 3) return { ...BASKET_SPOT };
  const s = snapToSpot(c, 3);
  return { x: round(s.x), y: round(s.y) };
}

/**
 * The finger's path cut down to the few points that give its shape
 * (Ramer-Douglas-Peucker), without its ends: at most `max` waypoints.
 */
export function simplifyPath(points: Point[], tolerance = 1.5, max = 3): Point[] {
  if (points.length < 3) return [];
  let tol = tolerance;
  for (let tries = 0; tries < 12; tries++) {
    const keep = rdp(points, tol);
    const inner = keep.slice(1, -1);
    if (inner.length <= max) return inner.map((i) => clampToCourt({ x: round(points[i].x), y: round(points[i].y) }));
    tol *= 1.5;
  }
  return [];
}

function rdp(points: Point[], tol: number): number[] {
  const keep = new Set<number>([0, points.length - 1]);
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop()!;
    let worst = -1;
    let worstD = tol;
    for (let i = a + 1; i < b; i++) {
      const d = distanceToSegment(points[i], points[a], points[b]);
      if (d > worstD) {
        worst = i;
        worstD = d;
      }
    }
    if (worst !== -1) {
      keep.add(worst);
      stack.push([a, worst], [worst, b]);
    }
  }
  return [...keep].sort((x, y) => x - y);
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return distance(p, a);
  const t = Math.min(Math.max(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0), 1);
  return distance(p, { x: a.x + t * dx, y: a.y + t * dy });
}

/** Where a screener stands to screen for a teammate: just beside them, on the screener's side. */
export function screenSpot(screener: Point, teammate: Point): Point {
  const d = distance(screener, teammate) || 1;
  return clampToCourt({
    x: round(teammate.x + ((screener.x - teammate.x) / d) * SCREEN_GAP_FT),
    y: round(teammate.y + ((screener.y - teammate.y) / d) * SCREEN_GAP_FT),
  });
}

function offenceIds(d: Diagram): string[] {
  return d.players.filter((p) => p.side === 'offence').map((p) => p.id);
}

/** The teammate nearest a point, within reach, or null. */
export function nearestTeammate(d: Diagram, positions: Record<string, Point>, at: Point, exclude: string, reach = SCREEN_REACH_FT): string | null {
  let best: string | null = null;
  let bestD = reach;
  for (const id of offenceIds(d)) {
    if (id === exclude || !positions[id]) continue;
    const dd = distance(positions[id], at);
    if (dd <= bestD) {
      best = id;
      bestD = dd;
    }
  }
  return best;
}

function cloneDiagram(d: Diagram): Diagram {
  return JSON.parse(JSON.stringify(d)) as Diagram;
}

function clonePositions(positions: Record<string, Point>): Record<string, Point> {
  return Object.fromEntries(Object.entries(positions).map(([id, p]) => [id, { x: p.x, y: p.y }]));
}

/**
 * Works each step out again from the one before: who starts where, who has
 * the ball, and which moves still make sense. Players without a move stay
 * where they were; a move that no longer goes anywhere is dropped; a
 * dribble by someone without the ball becomes a cut, and the ball holder can
 * only move by dribbling unless they passed first.
 */
export function normalize(input: Diagram): Diagram {
  const d = cloneDiagram(input);
  const offence = new Set(offenceIds(d));
  const ids = d.players.map((p) => p.id);
  const setup = d.frames[0];
  setup.actions = [];
  setup.ms = 0;
  if (!setup.ball || !offence.has(setup.ball)) setup.ball = [...offence][0] ?? null;

  for (let j = 1; j < d.frames.length; j++) {
    const before = d.frames[j - 1];
    const frame = d.frames[j];
    const holder = before.ball;
    const pass = frame.actions.find((a) => isBallMove(a.type) && a.from === holder && !!a.to && offence.has(a.to) && a.to !== a.from);

    // One move each: the last one drawn wins
    const moves = new Map<string, DiagramAction>();
    for (const a of frame.actions) if (isMovement(a.type) && offence.has(a.from)) moves.set(a.from, a);

    const actions: DiagramAction[] = pass ? [{ type: pass.type, from: pass.from, to: pass.to, path: [] }] : [];
    const positions: Record<string, Point> = {};
    for (const id of ids) {
      const start = before.positions[id];
      if (!offence.has(id)) {
        // Defenders follow without drawn lines
        positions[id] = { ...(frame.positions[id] ?? start) };
        continue;
      }
      const move = moves.get(id);
      const end = frame.positions[id];
      if (!move || !end || distance(start, end) <= MOVE_EPSILON_FT) {
        positions[id] = { ...start };
        continue;
      }
      positions[id] = { ...end };
      const passed = pass?.from === id;
      let type: ActionType = move.type;
      if (type === 'dribble' && (id !== holder || passed)) type = 'cut';
      if (id === holder && !passed) type = 'dribble';
      if (type === 'screen' && (!move.to || !offence.has(move.to) || move.to === id)) type = 'cut';
      actions.push({ type, from: id, ...(type === 'screen' ? { to: move.to } : {}), path: move.path.map((p) => ({ ...p })) });
    }
    frame.actions = actions;
    frame.positions = positions;
    frame.ball = pass?.to ?? holder;
    frame.ms = Math.min(Math.max(Math.round(frame.ms || DEFAULT_STEP_MS), MIN_STEP_MS), MAX_STEP_MS);
  }
  return d;
}

function done(d: Diagram, step: number): EditResult {
  const out = normalize(d);
  const parsed = parseDiagram(out);
  if (!parsed.ok) return { ok: false, error: parsed.problems[0] };
  return { ok: true, diagram: parsed.diagram, step: Math.min(Math.max(step, 0), stepCount(parsed.diagram)) };
}

function emptyStepAfter(d: Diagram, k: number, from?: DiagramFrame): DiagramFrame {
  const at = d.frames[k];
  return {
    ms: from?.ms ?? DEFAULT_STEP_MS,
    positions: clonePositions(at.positions),
    ball: at.ball,
    actions: [],
    ...(from?.note ? { note: from.note } : {}),
  };
}

function insertStepAfter(d: Diagram, k: number): Diagram | null {
  if (stepCount(d) >= MAX_STEPS) return null;
  const out = cloneDiagram(d);
  out.frames.splice(k + 1, 0, emptyStepAfter(out, k));
  return out;
}

const FULL = `A play can have up to ${MAX_STEPS} steps.`;

/**
 * Records one move in step `step` (0 is the set-up, where a drag moves a
 * starting spot and dropping the ball gives it to someone). Returns the step
 * the move landed in, which is the next one when it had to go after
 * something already drawn.
 */
export function recordMove(d: Diagram, step: number, req: MoveRequest): EditResult {
  const offence = new Set(offenceIds(d));
  if (step <= 0) {
    const out = cloneDiagram(d);
    if (req.kind === 'ball') {
      if (!offence.has(req.to)) return { ok: false, error: 'Give the ball to a player on offence.' };
      out.frames[0].ball = req.to;
    } else {
      if (!out.frames[0].positions[req.playerId]) return { ok: false, error: 'That player is not in the play.' };
      out.frames[0].positions[req.playerId] = snapPoint(req.to);
    }
    return done(out, 0);
  }
  if (step > stepCount(d)) return { ok: false, error: 'That step is not in the play.' };

  if (req.kind === 'ball') {
    const frame = d.frames[step];
    const startHolder = d.frames[step - 1].ball;
    const alreadyPassed = frame.actions.some((a) => isBallMove(a.type));
    const dribbled = frame.actions.some((a) => a.type === 'dribble' && a.from === startHolder);
    let work = d;
    let target = step;
    if (alreadyPassed || dribbled) {
      const next = insertStepAfter(d, step);
      if (!next) return { ok: false, error: FULL };
      work = next;
      target = step + 1;
    }
    const from = work.frames[target - 1].ball;
    if (!from) return { ok: false, error: 'Nobody has the ball.' };
    if (!offence.has(req.to)) return { ok: false, error: 'Pass to a player on offence.' };
    if (req.to === from) return { ok: false, error: 'Drag the ball onto a teammate to pass.' };
    const out = target === step ? cloneDiagram(work) : work;
    out.frames[target].actions.push({ type: req.type ?? 'pass', from, to: req.to, path: [] });
    return done(out, target);
  }

  if (!offence.has(req.playerId)) return { ok: false, error: 'Moves are drawn for players 1 to 5.' };
  const caught = d.frames[step].actions.some((a) => isBallMove(a.type) && a.to === req.playerId);
  if (caught) {
    // They catch first; what they do with it is the next step
    const next = insertStepAfter(d, step);
    if (!next) return { ok: false, error: FULL };
    return movePlayer(next, step + 1, req);
  }
  return movePlayer(cloneDiagram(d), step, req);
}

/** Records a player move in step k of a diagram the caller owns. */
function movePlayer(d: Diagram, k: number, req: Extract<MoveRequest, { kind: 'player' }>): EditResult {
  const id = req.playerId;
  const before = d.frames[k - 1];
  const frame = d.frames[k];
  const holder = before.ball;
  const passed = frame.actions.some((a) => isBallMove(a.type) && a.from === id);
  const hasBall = id === holder && !passed;
  const end = snapPoint(req.to);

  let type: MoveType = req.type ?? (hasBall ? 'dribble' : req.longPress ? 'screen' : 'cut');
  if (type === 'dribble' && !hasBall) return { ok: false, error: 'Only the player with the ball can dribble.' };
  if (type !== 'dribble' && hasBall) return { ok: false, error: 'The player with the ball dribbles. Pass first, then cut or screen.' };

  let screenFor: string | null = null;
  if (type === 'screen') {
    screenFor = req.screenFor && req.screenFor !== id ? req.screenFor : nearestTeammate(d, before.positions, end, id);
    if (!screenFor) {
      if (req.type === 'screen') return { ok: false, error: 'Drop the screener next to the teammate they screen for.' };
      type = 'cut';
    }
  }

  frame.actions = frame.actions.filter((a) => !(a.from === id && isMovement(a.type)));
  if (distance(before.positions[id], end) <= MOVE_EPSILON_FT) {
    // Dropped back where they started: no move this step
    frame.positions[id] = { ...before.positions[id] };
  } else {
    frame.actions.push({
      type,
      from: id,
      ...(type === 'screen' && screenFor ? { to: screenFor } : {}),
      path: (req.path ?? []).slice(0, 3).map((p) => clampToCourt({ x: round(p.x), y: round(p.y) })),
    });
    frame.positions[id] = end;
  }
  return done(d, k);
}

/** The line types a move can be switched to (tap a line, pick a type). */
export function lineTypesFor(d: Diagram, k: number, index: number): ActionType[] {
  const a = d.frames[k]?.actions[index];
  if (!a) return [];
  if (isBallMove(a.type)) return ['pass', 'handoff'];
  const holder = d.frames[k - 1].ball;
  const passed = d.frames[k].actions.some((b) => isBallMove(b.type) && b.from === a.from);
  if (a.from === holder && !passed) return ['dribble'];
  const types: ActionType[] = ['cut'];
  if (nearestTeammate(d, d.frames[k - 1].positions, d.frames[k].positions[a.from], a.from) || a.type === 'screen') types.push('screen');
  return types;
}

/** Changes the type of move `index` in step k. */
export function setLineType(d: Diagram, k: number, index: number, type: ActionType): EditResult {
  const a = d.frames[k]?.actions[index];
  if (!a) return { ok: false, error: 'That move is not in this step.' };
  if (!lineTypesFor(d, k, index).includes(type)) return { ok: false, error: `That move cannot be a ${type}.` };
  if (isBallMove(a.type)) {
    const out = cloneDiagram(d);
    out.frames[k].actions[index].type = type;
    return done(out, k);
  }
  return movePlayer(cloneDiagram(d), k, {
    kind: 'player',
    playerId: a.from,
    to: d.frames[k].positions[a.from],
    path: a.path,
    type: type as MoveType,
    screenFor: type === 'screen' ? a.to : undefined,
  });
}

/** Takes move `index` out of step k: the player stays put, or the ball stays with its holder. */
export function removeLine(d: Diagram, k: number, index: number): EditResult {
  if (!d.frames[k]?.actions[index]) return { ok: false, error: 'That move is not in this step.' };
  const out = cloneDiagram(d);
  out.frames[k].actions.splice(index, 1);
  return done(out, k);
}

/** A new empty step after step k (or after the set-up). */
export function addStep(d: Diagram, k: number): EditResult {
  const out = insertStepAfter(d, Math.min(Math.max(k, 0), stepCount(d)));
  if (!out) return { ok: false, error: FULL };
  return done(out, k + 1);
}

/** A new step after step k with the same timing and note, starting where step k ends. */
export function duplicateStep(d: Diagram, k: number): EditResult {
  if (k < 1 || k > stepCount(d)) return { ok: false, error: 'Pick a step to duplicate.' };
  if (stepCount(d) >= MAX_STEPS) return { ok: false, error: FULL };
  const out = cloneDiagram(d);
  out.frames.splice(k + 1, 0, emptyStepAfter(out, k, out.frames[k]));
  return done(out, k + 1);
}

/** Removes step k; its moves go with it. */
export function deleteStep(d: Diagram, k: number): EditResult {
  if (k < 1 || k > stepCount(d)) return { ok: false, error: 'Pick a step to delete.' };
  if (stepCount(d) <= 1) return { ok: false, error: 'A play needs at least one step.' };
  const out = cloneDiagram(d);
  out.frames.splice(k, 1);
  return done(out, Math.min(k, stepCount(out)));
}

/** Swaps step k with the one before (-1) or after (+1). */
export function moveStep(d: Diagram, k: number, by: -1 | 1): EditResult {
  const j = k + by;
  if (k < 1 || j < 1 || k > stepCount(d) || j > stepCount(d)) return { ok: false, error: 'That step cannot move further.' };
  const out = cloneDiagram(d);
  [out.frames[k], out.frames[j]] = [out.frames[j], out.frames[k]];
  return done(out, j);
}

export const STEP_TIMINGS = [500, 1000, 1500, 2000] as const;

export function setStepMs(d: Diagram, k: number, ms: number): EditResult {
  if (k < 1 || k > stepCount(d)) return { ok: false, error: 'Pick a step first.' };
  const out = cloneDiagram(d);
  out.frames[k].ms = ms;
  return done(out, k);
}

/** The play flipped left to right: what runs on the right now runs on the left. */
export function mirror(d: Diagram): Diagram {
  const flip = (p: Point): Point => ({ x: 50 - p.x, y: p.y });
  const out = cloneDiagram(d);
  for (const f of out.frames) {
    f.positions = Object.fromEntries(Object.entries(f.positions).map(([id, p]) => [id, flip(p)]));
    for (const a of f.actions) a.path = a.path.map(flip);
  }
  return out;
}

// -----------------------------------------------------------------------------
// Undo and redo
// -----------------------------------------------------------------------------

export interface History {
  past: Diagram[];
  present: Diagram;
  future: Diagram[];
}

const HISTORY_LIMIT = 50;

export function startHistory(d: Diagram): History {
  return { past: [], present: d, future: [] };
}

/** Moves to a new diagram; redo is forgotten, and only the last 50 are kept for undo. */
export function commit(h: History, d: Diagram): History {
  if (d === h.present) return h;
  return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: d, future: [] };
}

export function undo(h: History): History {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] };
}

export function redo(h: History): History {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) };
}

// -----------------------------------------------------------------------------
// Telling a press from a long press
// -----------------------------------------------------------------------------

/** Hold this long without moving and the drag draws a screen. */
export const LONG_PRESS_MS = 450;

/** Moving this far (CSS px) before the long press makes it an ordinary drag. */
export const DRAG_SLOP_PX = 8;

/**
 * A pointer position (client px) as a court point (feet), for an SVG of
 * `box` (its viewBox, in drawing units of `unitsPerFoot`) shown in `rect`
 * with the default preserveAspectRatio (centred, whole drawing visible).
 */
export function clientToCourt(
  rect: { left: number; top: number; width: number; height: number },
  box: { x: number; y: number; width: number; height: number },
  unitsPerFoot: number,
  clientX: number,
  clientY: number
): Point {
  const scale = Math.min(rect.width / box.width, rect.height / box.height) || 1;
  const offX = (rect.width - box.width * scale) / 2;
  const offY = (rect.height - box.height * scale) / 2;
  return {
    x: (box.x + (clientX - rect.left - offX) / scale) / unitsPerFoot,
    y: (box.y + (clientY - rect.top - offY) / scale) / unitsPerFoot,
  };
}

export type Press = 'pending' | 'drag' | 'long';

/**
 * What a press on a player is, given what it was: still deciding, an
 * ordinary drag (moved before the long press), or a long press (held still
 * long enough, and stays one however far it then moves).
 */
export function nextPress(current: Press, heldMs: number, movedPx: number): Press {
  if (current !== 'pending') return current;
  if (movedPx > DRAG_SLOP_PX) return 'drag';
  return heldMs >= LONG_PRESS_MS ? 'long' : 'pending';
}
