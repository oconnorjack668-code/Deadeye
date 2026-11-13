// src/components/plays/PlayCourt.tsx
// One moment of a play on the half court: players, the ball, and the moves
// of the step being played. Pure drawing, no state, so it renders on the
// server for the library list and inside PlayPlayer for the animation.
//
// The look follows docs/plans/film-and-plays.md section 3: offence orange
// tokens with white numbers, defence zinc rings marked X1-X5 (never red, which
// means a miss in Deadeye), an amber ball, dashed passes, zigzag dribbles,
// solid cuts with an arrow, and screens ending in a bar.
import React from 'react';
import { CourtMarkings, S } from '@/components/basketball/CourtMarkings';
import { movePath, sceneAt } from '@/lib/plays/animation';
import { MOVEMENT_TYPES, type Diagram, type DiagramAction } from '@/lib/plays/diagram';
import type { Point } from '@/lib/plays/spots';

const TOKEN_R = 1.9 * S;
const BALL_R = 0.8 * S;

/** The part of the court a play uses: always the top 34 ft, more if a play runs further. */
export function viewBoxFor(d: Diagram): string {
  let maxY = 34;
  for (const f of d.frames) {
    for (const p of Object.values(f.positions)) maxY = Math.max(maxY, p.y);
    for (const a of f.actions) for (const p of a.path) maxY = Math.max(maxY, p.y);
  }
  const bottom = Math.min(Math.ceil(maxY + 4), 51);
  return `${-4 * S} ${-4 * S} ${58 * S} ${(bottom + 4) * S}`;
}

const toSvg = (p: Point) => ({ x: p.x * S, y: p.y * S });

/** Cuts a polyline short by `by` units at its end, so an arrow stops at the edge of a token. */
function trimEnd(points: Point[], by: number): Point[] {
  const out = points.map((p) => ({ ...p }));
  let left = by;
  while (out.length > 1 && left > 0) {
    const a = out[out.length - 2];
    const b = out[out.length - 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len > left) {
      out[out.length - 1] = { x: b.x - ((b.x - a.x) / len) * left, y: b.y - ((b.y - a.y) / len) * left };
      return out;
    }
    left -= len;
    out.pop();
  }
  return out;
}

function lastDirection(points: Point[]): { ux: number; uy: number } {
  const a = points[points.length - 2] ?? points[0];
  const b = points[points.length - 1];
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { ux: (b.x - a.x) / len, uy: (b.y - a.y) / len };
}

function arrowHead(points: Point[]): string {
  const tip = points[points.length - 1];
  const { ux, uy } = lastDirection(points);
  const back = { x: tip.x - ux * 11, y: tip.y - uy * 11 };
  return `${tip.x},${tip.y} ${back.x - uy * 7},${back.y + ux * 7} ${back.x + uy * 7},${back.y - ux * 7}`;
}

/** A zigzag along a polyline, straight for its last stretch so the arrow reads. */
function zigzag(points: Point[]): Point[] {
  const out: Point[] = [points[0]];
  const total = points.slice(1).reduce((n, p, i) => n + Math.hypot(p.x - points[i].x, p.y - points[i].y), 0);
  const straight = Math.min(16, total / 3);
  let travelled = 0;
  let flip = 1;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len === 0) continue;
    const ux = (b.x - a.x) / len;
    const uy = (b.y - a.y) / len;
    for (let d = 7; d < len; d += 7) {
      if (travelled + d > total - straight) break;
      out.push({ x: a.x + ux * d - uy * 5 * flip, y: a.y + uy * d + ux * 5 * flip });
      flip = -flip;
    }
    travelled += len;
  }
  out.push(points[points.length - 1]);
  return out;
}

const pointsAttr = (pts: Point[]) => pts.map((p) => `${p.x},${p.y}`).join(' ');

function MoveLine({ d, step, action, tone }: { d: Diagram; step: number; action: DiagramAction; tone: 'normal' | 'mine' | 'faded' }) {
  const before = d.frames[step - 1].positions;
  const after = d.frames[step].positions;
  const raw =
    action.type === 'pass' || action.type === 'handoff'
      ? [before[action.from], after[action.to ?? action.from]]
      : movePath(d, step, action.from);
  const pts = trimEnd(raw.map(toSvg), action.type === 'screen' ? TOKEN_R * 0.2 : TOKEN_R + 2);
  if (pts.length < 2) return null;
  const stroke = tone === 'mine' ? 'stroke-orange-400' : 'stroke-zinc-300';
  const fill = tone === 'mine' ? 'fill-orange-400' : 'fill-zinc-300';
  const opacity = tone === 'faded' ? 0.25 : 1;
  const width = tone === 'mine' ? 5 : 3.5;
  const common = { className: stroke, fill: 'none', strokeWidth: width, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  if (action.type === 'screen') {
    const end = pts[pts.length - 1];
    const { ux, uy } = lastDirection(pts);
    return (
      <g opacity={opacity} data-move="screen">
        <polyline points={pointsAttr(pts)} {...common} />
        <line x1={end.x - uy * 12} y1={end.y + ux * 12} x2={end.x + uy * 12} y2={end.y - ux * 12} {...common} strokeWidth={width + 2} />
      </g>
    );
  }
  return (
    <g opacity={opacity} data-move={action.type}>
      <polyline
        points={pointsAttr(action.type === 'dribble' ? zigzag(pts) : pts)}
        {...common}
        strokeDasharray={action.type === 'pass' ? '9 7' : undefined}
      />
      <polygon points={arrowHead(pts)} className={fill} />
    </g>
  );
}

export interface PlayCourtProps {
  diagram: Diagram;
  /** Time into the play, in ms. */
  t?: number;
  /** The player whose role is shown; everyone else fades. */
  role?: string | null;
  /** Steady speed instead of the eased curve (reduced motion holds still anyway). */
  ease?: boolean;
  /** Read out by screen readers in place of the drawing; leave empty for a thumbnail beside its title. */
  label: string;
  className?: string;
}

export function PlayCourt({ diagram, t = 0, role = null, ease = true, label, className }: PlayCourtProps) {
  const scene = sceneAt(diagram, t, { ease });
  const frame = diagram.frames[scene.step];
  const toneFor = (id: string) => (!role ? 'normal' : id === role ? 'mine' : 'faded');
  const holderAt = scene.ballHolder ? scene.positions[scene.ballHolder] : null;
  const ball = scene.ball && (holderAt ? { x: holderAt.x + 1.4, y: holderAt.y + 1.4 } : scene.ball);
  // The chosen player's lines go on top, so a faded line never crosses them
  const actions = [...frame.actions].sort((a, b) => Number(a.from === role) - Number(b.from === role));

  return (
    <svg
      viewBox={viewBoxFor(diagram)}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true, focusable: false })}
      className={className}
    >
      <rect x={0} y={0} width={50 * S} height={47 * S} className="fill-zinc-900" />
      <rect x={0} y={0} width={50 * S} height={47 * S} fill="none" className="stroke-zinc-600" strokeWidth={3} />
      <CourtMarkings />
      <g>
        {actions.map((a, i) => (
          <MoveLine
            key={`${scene.step}-${i}`}
            d={diagram}
            step={scene.step}
            action={a}
            tone={MOVEMENT_TYPES.includes(a.type) || !role ? toneFor(a.from) : a.from === role || a.to === role ? 'mine' : 'faded'}
          />
        ))}
      </g>
      {diagram.players.map((p) => {
        const at = toSvg(scene.positions[p.id]);
        const opacity = toneFor(p.id) === 'faded' ? 0.3 : 1;
        return p.side === 'offence' ? (
          <g key={p.id} opacity={opacity} data-player={p.label}>
            <circle cx={at.x} cy={at.y} r={TOKEN_R} className="fill-orange-500" />
            {role === p.id && <circle cx={at.x} cy={at.y} r={TOKEN_R + 5} fill="none" className="stroke-orange-300" strokeWidth={3} />}
            <text x={at.x} y={at.y} dy="0.35em" textAnchor="middle" fontSize={21} fontWeight={800} fill="#fff">
              {p.label}
            </text>
          </g>
        ) : (
          <g key={p.id} opacity={opacity} data-player={p.label}>
            <circle cx={at.x} cy={at.y} r={TOKEN_R} className="fill-zinc-900 stroke-zinc-300" strokeWidth={3} />
            <text x={at.x} y={at.y} dy="0.35em" textAnchor="middle" fontSize={16} fontWeight={700} className="fill-zinc-300">
              {p.label}
            </text>
          </g>
        );
      })}
      {ball && (
        <circle
          cx={ball.x * S}
          cy={ball.y * S}
          r={BALL_R}
          className="fill-amber-400 stroke-zinc-950"
          strokeWidth={2}
          data-ball={scene.ballHolder ?? 'in-flight'}
        />
      )}
    </svg>
  );
}
