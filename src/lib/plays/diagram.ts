// src/lib/plays/diagram.ts
// The shape of a play diagram (plays.diagram, a jsonb column) and the one
// validator everything shares: the library seed test now, the editor and its
// server route in F2. A diagram that passes here can be drawn and animated
// without further checks.
//
// The shape is versioned (v: 1) so a later change can be told apart from old
// rows. Coordinates are feet on the src/lib/court.ts half court.
//
// frames[0] is the set-up: where everyone stands and who has the ball. Each
// later frame is one step: where everyone ends up, who has the ball at the
// end, and the moves (actions) that get them there. A move is drawn from the
// player's spot at the start of the step, through its waypoints (path), to
// their spot at the end; a pass is drawn from passer to receiver.
import { z } from 'zod';
import type { Point } from './spots';

export const DIAGRAM_VERSION = 1;

/** Room around the half court: an inbounder stands behind the baseline, and a press break crosses half court. */
export const BOUNDS = { minX: -4, maxX: 54, minY: -4, maxY: 50 } as const;

export const ACTION_TYPES = ['pass', 'dribble', 'cut', 'screen', 'handoff'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

/** Moves that carry a player somewhere (a pass or handoff moves the ball, not the player). */
export const MOVEMENT_TYPES: readonly ActionType[] = ['dribble', 'cut', 'screen'];

export const MAX_STEPS = 20;
export const MIN_STEP_MS = 300;
export const MAX_STEP_MS = 5000;
export const DEFAULT_STEP_MS = 1000;

/** A player counts as having moved when they end a step this far from where they began. */
export const MOVE_EPSILON_FT = 0.25;

const PointSchema = z.object({
  x: z.number().finite().min(BOUNDS.minX).max(BOUNDS.maxX),
  y: z.number().finite().min(BOUNDS.minY).max(BOUNDS.maxY),
});

const PlayerSchema = z.object({
  id: z.string().regex(/^[ox][1-5]$/, 'Player ids are o1-o5 (offence) and x1-x5 (defence)'),
  side: z.enum(['offence', 'defence']),
  // Numbers only, never names (safety rule 8 in docs/plans/film-and-plays.md)
  label: z.string().regex(/^X?[1-5]$/, 'Labels are 1-5 for offence and X1-X5 for defence'),
});

const ActionSchema = z.object({
  type: z.enum(ACTION_TYPES),
  from: z.string(),
  to: z.string().optional(),
  path: z.array(PointSchema).max(8).default([]),
});

const FrameSchema = z.object({
  ms: z.number().int().min(0).max(MAX_STEP_MS),
  positions: z.record(z.string(), PointSchema),
  ball: z.string().nullable(),
  actions: z.array(ActionSchema).max(8).default([]),
  note: z.string().max(140).optional(),
});

const BaseDiagramSchema = z.object({
  v: z.literal(DIAGRAM_VERSION),
  court: z.literal('half'),
  players: z.array(PlayerSchema).min(1).max(10),
  frames: z.array(FrameSchema).min(2).max(MAX_STEPS + 1),
});

export type DiagramPlayer = z.infer<typeof PlayerSchema>;
export type DiagramAction = z.infer<typeof ActionSchema>;
export type DiagramFrame = z.infer<typeof FrameSchema>;
export type Diagram = z.infer<typeof BaseDiagramSchema>;
export type { Point };

function moved(a: Point, b: Point): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) > MOVE_EPSILON_FT;
}

/**
 * The rules a diagram must follow to make basketball sense, beyond its shape.
 * Returns one plain sentence per problem; an empty list means it is good.
 */
export function diagramProblems(d: Diagram): string[] {
  const problems: string[] = [];
  const ids = d.players.map((p) => p.id);
  const byId = new Map(d.players.map((p) => [p.id, p]));

  if (new Set(ids).size !== ids.length) problems.push('Two players share an id.');
  for (const p of d.players) {
    const isOffence = p.side === 'offence';
    if (isOffence !== p.id.startsWith('o')) problems.push(`Player ${p.id} is on the wrong side for its id.`);
    if (isOffence !== /^[1-5]$/.test(p.label)) problems.push(`Player ${p.id} has the label ${p.label}, which is for the other side.`);
    if (p.label.replace('X', '') !== p.id.slice(1)) problems.push(`Player ${p.id} should be labelled ${isOffence ? '' : 'X'}${p.id.slice(1)}.`);
  }
  const isOffence = (id: string | null | undefined) => !!id && byId.get(id)?.side === 'offence';

  d.frames.forEach((frame, i) => {
    const where = i === 0 ? 'The set-up' : `Step ${i}`;
    for (const id of ids) if (!frame.positions[id]) problems.push(`${where} has no spot for player ${id}.`);
    for (const id of Object.keys(frame.positions)) if (!byId.has(id)) problems.push(`${where} places ${id}, who is not in the play.`);
    if (frame.ball !== null && !isOffence(frame.ball)) problems.push(`${where} gives the ball to ${frame.ball}, who is not on offence.`);
    if (i > 0 && frame.ms < MIN_STEP_MS) problems.push(`${where} is shorter than ${MIN_STEP_MS} ms.`);
  });
  if (d.frames[0].ball === null) problems.push('Someone on offence must have the ball at the start.');
  if (d.frames[0].actions.length > 0) problems.push('The set-up has no moves; moves start at step 1.');
  // Stop here if the frames do not line up; the step checks below assume they do
  if (problems.length > 0) return problems;

  for (let i = 1; i < d.frames.length; i++) {
    const before = d.frames[i - 1];
    const frame = d.frames[i];
    const where = `Step ${i}`;
    const holder = before.ball;
    const moversSeen = new Set<string>();
    let ballMoves = 0;

    for (const a of frame.actions) {
      const name = byId.get(a.from)?.label ?? a.from;
      if (!isOffence(a.from)) {
        problems.push(`${where}: moves are drawn for offence only (${a.from}).`);
        continue;
      }
      if (a.type === 'pass' || a.type === 'handoff') {
        ballMoves++;
        if (a.from !== holder) problems.push(`${where}: ${name} passes but does not have the ball.`);
        if (!a.to || !isOffence(a.to) || a.to === a.from) problems.push(`${where}: ${name} passes to nobody on their team.`);
        else if (frame.ball !== a.to) problems.push(`${where}: the ball should end with ${byId.get(a.to)?.label}.`);
        continue;
      }
      // dribble, cut, screen: the player goes somewhere
      if (moversSeen.has(a.from)) problems.push(`${where}: ${name} has two moves.`);
      moversSeen.add(a.from);
      if (!moved(before.positions[a.from], frame.positions[a.from])) problems.push(`${where}: ${name} has a ${a.type} but stays put.`);
      if (a.type === 'dribble' && (a.from !== holder || frame.ball !== a.from)) {
        problems.push(`${where}: ${name} dribbles without the ball.`);
      }
      if (a.type === 'screen') {
        if (!a.to || !isOffence(a.to) || a.to === a.from) problems.push(`${where}: ${name} screens for nobody on their team.`);
      } else if (a.to) {
        problems.push(`${where}: a ${a.type} does not go to another player.`);
      }
    }

    if (ballMoves > 1) problems.push(`${where}: only one pass a step.`);
    if (ballMoves === 0 && frame.ball !== holder) problems.push(`${where}: the ball changes hands without a pass.`);

    for (const p of d.players) {
      if (p.side !== 'offence') continue; // defenders follow without drawn moves
      if (moved(before.positions[p.id], frame.positions[p.id]) && !moversSeen.has(p.id)) {
        problems.push(`${where}: ${p.label} moves without a cut, dribble or screen.`);
      }
      // The ball holder can only move by dribbling, or by passing first and then cutting
      if (p.id === holder && moversSeen.has(p.id)) {
        const passed = frame.actions.some((a) => (a.type === 'pass' || a.type === 'handoff') && a.from === p.id);
        const dribbled = frame.actions.some((a) => a.type === 'dribble' && a.from === p.id);
        if (!passed && !dribbled) problems.push(`${where}: ${p.label} moves with the ball without dribbling.`);
      }
    }
  }
  return problems;
}

export type ParseResult = { ok: true; diagram: Diagram } | { ok: false; problems: string[] };

/** Checks anything (a jsonb value, a request body) is a diagram that makes sense. */
export function parseDiagram(input: unknown): ParseResult {
  const shape = BaseDiagramSchema.safeParse(input);
  if (!shape.success) {
    return { ok: false, problems: shape.error.issues.map((i) => `${i.path.join('.') || 'diagram'}: ${i.message}`) };
  }
  const problems = diagramProblems(shape.data);
  return problems.length > 0 ? { ok: false, problems } : { ok: true, diagram: shape.data };
}

/** The zod schema, with the basketball rules folded in, for a server route body. */
export const DiagramSchema = BaseDiagramSchema.superRefine((d, ctx) => {
  for (const message of diagramProblems(d)) ctx.addIssue({ code: 'custom', message });
});

/** Number of steps (frames after the set-up). */
export function stepCount(d: Diagram): number {
  return d.frames.length - 1;
}
