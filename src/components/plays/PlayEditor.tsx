// src/components/plays/PlayEditor.tsx
// The play editor (plan section 3), phone first and one-handed: the court
// on top, the steps under it, then the details. A coach draws by moving
// players:
//   - drag the player with the ball: dribble
//   - drag the ball onto a teammate: pass
//   - hold a player, then drag: screen for the nearest teammate
//   - drag anyone else: cut
// The same moves work by tapping (tap a player, then where they go, or a
// teammate to pass to or screen for), and from the "Add a move" form for
// keyboards and screen readers (WCAG 2.2, 2.5.7 Dragging Movements).
// Every rule lives in src/lib/plays/editor.ts; this file turns pointers into
// calls to it.
'use client';

import React, { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowLeft, ArrowRight, Copy, FlipHorizontal2, Plus, Redo2, Trash2, Undo2 } from 'lucide-react';
import { CourtMarkings, S } from '@/components/basketball/CourtMarkings';
import { BALL_R, MoveLine, TOKEN_R } from './PlayCourt';
import { Button } from '@/components/ui/Button';
import { movePath } from '@/lib/plays/animation';
import { ageRuleWarnings } from '@/lib/plays/ageRules';
import { AGE_GRADES, PLAY_CATEGORIES } from '@/lib/plays/catalog';
import { BOUNDS, MOVEMENT_TYPES, stepCount, type ActionType, type Diagram } from '@/lib/plays/diagram';
import {
  addStep,
  clientToCourt,
  commit,
  deleteStep,
  duplicateStep,
  lineTypesFor,
  mirror,
  moveStep,
  nextPress,
  recordMove,
  redo,
  removeLine,
  screenSpot,
  setLineType,
  setStepMs,
  simplifyPath,
  startHistory,
  STEP_TIMINGS,
  undo,
  LONG_PRESS_MS,
  type EditResult,
  type MoveRequest,
  type Press,
} from '@/lib/plays/editor';
import { firstInputProblem, MAX_DESCRIPTION, MAX_TITLE, toInput, type PlayDraft } from '@/lib/plays/input';
import { QUIZ_TARGETS } from '@/lib/plays/quiz';
import { stepName } from '@/lib/plays/roles';
import { SETUPS, setupDiagram } from '@/lib/plays/setups';
import { distance, type Point } from '@/lib/plays/spots';
import { savePlay, deletePlay } from '@/app/(app)/plays/actions';
import { track } from '@/lib/events';
import { cn } from '@/lib/utils';

/** The editor shows the whole drawing area, so a drag never changes its size. */
const BOX = { x: BOUNDS.minX * S, y: BOUNDS.minY * S, width: (BOUNDS.maxX - BOUNDS.minX) * S, height: (BOUNDS.maxY - BOUNDS.minY) * S };

/** A drop this close to a teammate (feet) lands on them: a pass, or a screen when tapped. */
const DROP_ON_FT = 3;

const LINE_NAMES: Record<ActionType, string> = { pass: 'Pass', handoff: 'Handoff', dribble: 'Dribble', cut: 'Cut', screen: 'Screen' };

const chip =
  'inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-40';
const chipOn = 'border-orange-500/60 bg-orange-500/15 text-orange-200';
const field = 'w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-base text-white';
const label = 'text-xs font-semibold uppercase tracking-wider text-zinc-400';

interface Drag {
  pointerId: number;
  target: { kind: 'player'; id: string } | { kind: 'ball' } | { kind: 'line'; index: number } | { kind: 'court' };
  startX: number;
  startY: number;
  startedAt: number;
  press: Press;
  path: Point[];
}

export interface PlayEditorProps {
  /** Set when editing one of the coach's own plays. */
  playId?: string;
  initialDiagram?: Diagram;
  initialDraft?: PlayDraft;
  copiedFrom?: string | null;
}

const NEW_DRAFT: PlayDraft = { title: '', category: 'half_court', minAge: 'U12', description: '', coachingPoints: '' };

export function PlayEditor({ playId, initialDiagram, initialDraft, copiedFrom = null }: PlayEditorProps) {
  const router = useRouter();
  const [history, setHistory] = useState(() => startHistory(initialDiagram ?? setupDiagram(SETUPS[0].id)));
  const diagram = history.present;
  const [step, setStep] = useState(() => (initialDiagram ? 1 : 0));
  const [draft, setDraft] = useState<PlayDraft>(initialDraft ?? NEW_DRAFT);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const [ghost, setGhost] = useState<{ id: string; at: Point; long: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const drag = useRef<Drag | null>(null);
  const timer = useRef<number | null>(null);
  const svg = useRef<SVGSVGElement | null>(null);

  const steps = stepCount(diagram);
  const frame = diagram.frames[Math.min(step, steps)];
  const offence = diagram.players.filter((p) => p.side === 'offence');
  const labelOf = (id: string) => diagram.players.find((p) => p.id === id)?.label ?? id;
  const warnings = useMemo(
    () => ageRuleWarnings({ min_age: draft.minAge, category: draft.category, tags: [], diagram }),
    [draft.minAge, draft.category, diagram]
  );
  const described = step === 0 ? 'The set-up' : `Step ${step} of ${steps}: ${stepName(diagram, step)}`;

  function apply(result: EditResult, what?: string) {
    if (!result.ok) {
      setMessage(result.error);
      return;
    }
    setMessage(null);
    setHistory((h) => commit(h, result.diagram));
    setStep(result.step);
    setSelectedLine(null);
    setAnnounce(what ?? (result.step === 0 ? 'Set-up changed' : `Step ${result.step}: ${stepName(result.diagram, result.step)}`));
  }

  function record(req: MoveRequest) {
    apply(recordMove(diagram, step, req));
    setSelectedPlayer(null);
  }

  // ---------------------------------------------------------------------------
  // Pointer handling: pointerdown decides what was grabbed, pointerup what it means
  // ---------------------------------------------------------------------------

  function toCourt(clientX: number, clientY: number): Point {
    const rect = svg.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return clientToCourt(rect, BOX, S, clientX, clientY);
  }

  /** The offence player at a point, or null. */
  function playerAt(p: Point, exclude?: string): string | null {
    let best: string | null = null;
    let bestD = DROP_ON_FT;
    for (const o of offence) {
      if (o.id === exclude) continue;
      const d = distance(frame.positions[o.id], p);
      if (d <= bestD) {
        best = o.id;
        bestD = d;
      }
    }
    return best;
  }

  function clearTimer() {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return;
    const el = (e.target as Element).closest('[data-token],[data-ball-handle],[data-line]');
    const target: Drag['target'] = el?.hasAttribute('data-ball-handle')
      ? { kind: 'ball' }
      : el?.getAttribute('data-token')
        ? { kind: 'player', id: el.getAttribute('data-token')! }
        : el?.getAttribute('data-line')
          ? { kind: 'line', index: Number(el.getAttribute('data-line')) }
          : { kind: 'court' };
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { pointerId: e.pointerId, target, startX: e.clientX, startY: e.clientY, startedAt: e.timeStamp, press: 'pending', path: [] };
    if (target.kind === 'player') {
      clearTimer();
      timer.current = window.setTimeout(() => {
        const d = drag.current;
        if (!d || d.press !== 'pending') return;
        d.press = 'long';
        navigator.vibrate?.(15);
        setGhost({ id: target.id, at: frame.positions[target.id], long: true });
      }, LONG_PRESS_MS);
    }
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    if (d.target.kind !== 'player' && d.target.kind !== 'ball') return;
    const moved = Math.hypot(e.clientX - d.startX, e.clientY - d.startY);
    d.press = nextPress(d.press, e.timeStamp - d.startedAt, moved);
    if (d.press === 'pending') return;
    clearTimer();
    const at = toCourt(e.clientX, e.clientY);
    d.path.push(at);
    const id = d.target.kind === 'player' ? d.target.id : 'ball';
    setGhost({ id, at, long: d.press === 'long' });
  }

  function onPointerUp(e: React.PointerEvent<SVGSVGElement>) {
    const d = drag.current;
    if (!d || d.pointerId !== e.pointerId) return;
    drag.current = null;
    clearTimer();
    setGhost(null);
    const at = toCourt(e.clientX, e.clientY);
    const dragged = d.path.length > 0;

    if (dragged && d.target.kind === 'player') {
      record({ kind: 'player', playerId: d.target.id, to: at, path: simplifyPath(d.path), longPress: d.press === 'long' });
      return;
    }
    if (dragged && d.target.kind === 'ball') {
      const onto = playerAt(at, frame.ball ?? undefined);
      if (onto) record({ kind: 'ball', to: onto });
      else setMessage('Drop the ball on a teammate to pass.');
      return;
    }
    onTap(d.target, at);
  }

  function onTap(target: Drag['target'], at: Point) {
    if (target.kind === 'line') {
      setSelectedLine((cur) => (cur === target.index ? null : target.index));
      setSelectedPlayer(null);
      return;
    }
    const tapped = target.kind === 'player' ? target.id : target.kind === 'ball' ? frame.ball : null;
    if (!selectedPlayer) {
      if (tapped) {
        setSelectedPlayer(tapped);
        setSelectedLine(null);
        setAnnounce(`${labelOf(tapped)} picked. Tap where they go, or a teammate.`);
      }
      return;
    }
    if (tapped === selectedPlayer) {
      setSelectedPlayer(null);
      return;
    }
    if (tapped && step === 0) {
      // In the set-up a second player tapped is just picked instead
      setSelectedPlayer(tapped);
      return;
    }
    if (tapped) {
      // A teammate: the ball holder passes to them, anyone else screens for them
      if (selectedPlayer === frame.ball) {
        record({ kind: 'ball', to: tapped });
      } else {
        record({
          kind: 'player',
          playerId: selectedPlayer,
          to: screenSpot(frame.positions[selectedPlayer], frame.positions[tapped]),
          type: 'screen',
          screenFor: tapped,
        });
      }
      return;
    }
    record({ kind: 'player', playerId: selectedPlayer, to: at });
  }

  function onLostCapture() {
    drag.current = null;
    clearTimer();
    setGhost(null);
  }

  // ---------------------------------------------------------------------------
  // Saving
  // ---------------------------------------------------------------------------

  async function save() {
    const input = toInput(draft, diagram, { id: playId, copiedFrom });
    const problem = firstInputProblem(input);
    if (problem) {
      setSaveError(problem);
      return;
    }
    setSaving(true);
    setSaveError(null);
    const result = await savePlay(input);
    setSaving(false);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    if (!playId) track('play_drawn');
    router.push(`/plays/${result.id}`);
  }

  async function remove() {
    if (!playId || !window.confirm('Delete this play? Players lose it from team playbooks too. This cannot be undone.')) return;
    const result = await deletePlay(playId);
    if (!result.ok) {
      setSaveError(result.error);
      return;
    }
    router.push('/coach/playbook');
  }

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  const before = step > 0 ? diagram.frames[step - 1].positions : frame.positions;
  const selected = selectedLine !== null ? frame.actions[selectedLine] : undefined;
  const ballHolder = frame.ball;
  const ballAt = ghost?.id === 'ball' ? ghost.at : ballHolder ? frame.positions[ballHolder] : null;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-2">
        <svg
          ref={svg}
          viewBox={`${BOX.x} ${BOX.y} ${BOX.width} ${BOX.height}`}
          role="img"
          aria-label={`Play editor court. ${described}`}
          className="mx-auto block h-auto w-full max-w-xl select-none [-webkit-user-select:none] [touch-action:none]"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onLostCapture}
          onLostPointerCapture={onLostCapture}
        >
          <rect x={0} y={0} width={50 * S} height={47 * S} className="fill-zinc-900" />
          <rect x={0} y={0} width={50 * S} height={47 * S} fill="none" className="stroke-zinc-600" strokeWidth={3} />
          <CourtMarkings />
          {step > 0 &&
            frame.actions.map((a, i) => {
              const raw =
                a.type === 'pass' || a.type === 'handoff' ? [before[a.from], frame.positions[a.to ?? a.from]] : movePath(diagram, step, a.from);
              return (
                <g key={`${step}-${i}`} data-line={i} className="cursor-pointer">
                  <polyline
                    points={raw.map((p) => `${p.x * S},${p.y * S}`).join(' ')}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={26}
                    strokeLinecap="round"
                  />
                  <MoveLine d={diagram} step={step} action={a} tone={selectedLine === i ? 'mine' : 'normal'} />
                </g>
              );
            })}
          {diagram.players.map((p) => {
            const at = ghost?.id === p.id ? ghost.at : frame.positions[p.id];
            const isSelected = selectedPlayer === p.id;
            return p.side === 'offence' ? (
              <g key={p.id} data-token={p.id} className="cursor-grab">
                {/* A bigger invisible circle, so a finger finds the token */}
                <circle cx={at.x * S} cy={at.y * S} r={TOKEN_R + 10} fill="transparent" />
                <circle cx={at.x * S} cy={at.y * S} r={TOKEN_R} className="fill-orange-500" />
                {(isSelected || (ghost?.id === p.id && ghost.long)) && (
                  <circle cx={at.x * S} cy={at.y * S} r={TOKEN_R + 6} fill="none" className="stroke-orange-200" strokeWidth={3} strokeDasharray={ghost?.long ? '6 5' : undefined} />
                )}
                <text x={at.x * S} y={at.y * S} dy="0.35em" textAnchor="middle" fontSize={21} fontWeight={800} fill="#fff" pointerEvents="none">
                  {p.label}
                </text>
              </g>
            ) : (
              <g key={p.id} pointerEvents="none">
                <circle cx={at.x * S} cy={at.y * S} r={TOKEN_R} className="fill-zinc-900 stroke-zinc-300" strokeWidth={3} />
                <text x={at.x * S} y={at.y * S} dy="0.35em" textAnchor="middle" fontSize={16} fontWeight={700} className="fill-zinc-300">
                  {p.label}
                </text>
              </g>
            );
          })}
          {ballAt && (
            <g data-ball-handle="" className="cursor-grab">
              <circle cx={(ballAt.x + 1.4) * S} cy={(ballAt.y + 1.4) * S} r={BALL_R + 9} fill="transparent" />
              <circle cx={(ballAt.x + 1.4) * S} cy={(ballAt.y + 1.4) * S} r={BALL_R + 2} className="fill-amber-400 stroke-zinc-950" strokeWidth={2} />
            </g>
          )}
        </svg>

        <p className="mt-2 px-1 text-sm text-zinc-300">
          <span className="font-semibold text-white">{step === 0 ? 'Set-up:' : `Step ${step} of ${steps}:`}</span>{' '}
          {step === 0 ? 'drag players to their starting spots, and the ball to who starts with it.' : stepName(diagram, step)}
        </p>
        {message && (
          <p role="alert" className="mt-1 px-1 text-sm text-amber-300">
            {message}
          </p>
        )}
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>

        {selected && step > 0 && selectedLine !== null && (
          <div className="mt-2 flex flex-wrap items-center gap-2 px-1" role="group" aria-label="Change this move">
            {lineTypesFor(diagram, step, selectedLine).map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={selected.type === t}
                onClick={() => apply(setLineType(diagram, step, selectedLine, t))}
                className={cn(chip, selected.type === t && chipOn)}
              >
                {LINE_NAMES[t]}
              </button>
            ))}
            <button type="button" onClick={() => apply(removeLine(diagram, step, selectedLine))} className={chip}>
              <Trash2 className="h-4 w-4" /> Remove move
            </button>
          </div>
        )}
      </div>

      <details className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 text-sm text-zinc-300">
        <summary className="min-h-11 cursor-pointer py-2 font-semibold text-white">How to draw</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Drag the player with the ball to dribble.</li>
          <li>Drag the ball onto a teammate to pass.</li>
          <li>Hold a player for a moment, then drag, to set a screen for the nearest teammate.</li>
          <li>Drag anyone else to cut. Players snap to the named spots.</li>
          <li>Or tap a player, then tap where they go, or tap a teammate to pass to or screen for.</li>
          <li>Tap a line to change it to a cut, screen, dribble or handoff, or remove it.</li>
        </ul>
      </details>

      <section aria-label="Steps" className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
          {[0, ...Array.from({ length: steps }, (_, i) => i + 1)].map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => {
                setStep(k);
                setSelectedLine(null);
                setSelectedPlayer(null);
                setMessage(null);
              }}
              aria-pressed={step === k}
              aria-label={k === 0 ? 'Set-up' : `Step ${k}: ${stepName(diagram, k)}`}
              className={cn(chip, 'flex-shrink-0', step === k && chipOn)}
            >
              {k === 0 ? 'Set-up' : k}
            </button>
          ))}
          <button type="button" onClick={() => apply(addStep(diagram, steps))} className={cn(chip, 'flex-shrink-0')} aria-label="Add a step at the end">
            <Plus className="h-4 w-4" /> Step
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setHistory(undo)} disabled={!history.past.length} className={chip} aria-label="Undo">
            <Undo2 className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => setHistory(redo)} disabled={!history.future.length} className={chip} aria-label="Redo">
            <Redo2 className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => apply({ ok: true, diagram: mirror(diagram), step }, 'Play flipped left to right')} className={chip}>
            <FlipHorizontal2 className="h-5 w-5" /> Mirror
          </button>
        </div>

        {step === 0 ? (
          <div>
            <p className={label}>Start from</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {SETUPS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => apply({ ok: true, diagram: setupDiagram(s.id), step: 0 }, `Started from ${s.label}`)}
                  className={chip}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-sm text-zinc-400">Starting again from a set-up clears the steps. Undo brings them back.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className={label} id="step-timing">
                Step {step} takes
              </p>
              <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby="step-timing">
                {STEP_TIMINGS.map((ms) => (
                  <button
                    key={ms}
                    type="button"
                    aria-pressed={frame.ms === ms}
                    onClick={() => apply(setStepMs(diagram, step, ms))}
                    className={cn(chip, frame.ms === ms && chipOn)}
                  >
                    {ms / 1000}s
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => apply(moveStep(diagram, step, -1))} disabled={step <= 1} className={chip} aria-label="Move this step earlier">
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => apply(moveStep(diagram, step, 1))} disabled={step >= steps} className={chip} aria-label="Move this step later">
                <ArrowRight className="h-5 w-5" />
              </button>
              <button type="button" onClick={() => apply(duplicateStep(diagram, step))} className={chip}>
                <Copy className="h-4 w-4" /> Duplicate
              </button>
              <button type="button" onClick={() => apply(deleteStep(diagram, step))} disabled={steps <= 1} className={chip}>
                <Trash2 className="h-4 w-4" /> Delete step
              </button>
            </div>
          </div>
        )}
      </section>

      <MoveForm
        diagram={diagram}
        step={step}
        onRecord={(req) => record(req)}
        onSelectLine={(i) => {
          setSelectedLine(i);
          setSelectedPlayer(null);
        }}
      />

      <section aria-labelledby="play-details" className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <h2 id="play-details" className={label}>
          Details
        </h2>
        <label className="block">
          <span className="text-sm text-zinc-300">Name</span>
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            maxLength={MAX_TITLE}
            placeholder="e.g. Horns flare"
            className={cn(field, 'mt-1')}
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="text-sm text-zinc-300">Type</span>
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as PlayDraft['category'] })}
              className={cn(field, 'mt-1 h-11')}
            >
              {PLAY_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm text-zinc-300">Youngest age group</span>
            <select
              value={draft.minAge}
              onChange={(e) => setDraft({ ...draft, minAge: e.target.value as PlayDraft['minAge'] })}
              className={cn(field, 'mt-1 h-11')}
            >
              {AGE_GRADES.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        </div>
        {warnings.map((w) => (
          <p key={w} className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" /> {w}
          </p>
        ))}
        <label className="block">
          <span className="text-sm text-zinc-300">Description (optional)</span>
          <textarea
            value={draft.description}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            maxLength={MAX_DESCRIPTION}
            rows={2}
            className={cn(field, 'mt-1')}
          />
        </label>
        <label className="block">
          <span className="text-sm text-zinc-300">Coaching points, one per line (optional)</span>
          <textarea
            value={draft.coachingPoints}
            onChange={(e) => setDraft({ ...draft, coachingPoints: e.target.value })}
            rows={4}
            className={cn(field, 'mt-1')}
          />
        </label>
        <p className="text-sm text-zinc-400">Players are shown by number only, never by name.</p>
        {saveError && (
          <p role="alert" className="text-sm text-red-400">
            {saveError}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => void save()} isLoading={saving}>
            Save play
          </Button>
          {playId && (
            <Button type="button" variant="outline" onClick={() => void remove()}>
              <Trash2 className="h-4 w-4" /> Delete play
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * The same moves as the court, from lists: for keyboards, screen readers and
 * anyone who would rather not drag. Lists this step's moves too, so a move
 * can be picked and changed without finding its line.
 */
function MoveForm({
  diagram,
  step,
  onRecord,
  onSelectLine,
}: {
  diagram: Diagram;
  step: number;
  onRecord: (req: MoveRequest) => void;
  onSelectLine: (index: number) => void;
}) {
  const offence = diagram.players.filter((p) => p.side === 'offence');
  const [player, setPlayer] = useState(offence[0]?.id ?? 'o1');
  const [kind, setKind] = useState<'cut' | 'dribble' | 'screen' | 'pass' | 'start' | 'ball'>('cut');
  const [where, setWhere] = useState<string>(QUIZ_TARGETS[0].id);
  const [teammate, setTeammate] = useState<string>(offence[1]?.id ?? 'o2');
  const frame = diagram.frames[step];
  const kinds = step === 0 ? (['start', 'ball'] as const) : (['cut', 'dribble', 'screen', 'pass'] as const);
  const shownKind = (kinds as readonly string[]).includes(kind) ? kind : kinds[0];
  const needsTeammate = shownKind === 'screen' || shownKind === 'pass';
  const kindLabels = { start: 'Starts at', ball: 'Starts with the ball', cut: 'Cut to', dribble: 'Dribble to', screen: 'Screen for', pass: 'Pass to' };

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const spot = QUIZ_TARGETS.find((t) => t.id === where)?.at ?? QUIZ_TARGETS[0].at;
    if (shownKind === 'ball') return onRecord({ kind: 'ball', to: player });
    if (shownKind === 'start') return onRecord({ kind: 'player', playerId: player, to: spot });
    if (shownKind === 'pass') {
      return onRecord({ kind: 'ball', to: teammate });
    }
    if (shownKind === 'screen') {
      return onRecord({
        kind: 'player',
        playerId: player,
        to: screenSpot(diagram.frames[step - 1].positions[player], diagram.frames[step - 1].positions[teammate]),
        type: 'screen',
        screenFor: teammate,
      });
    }
    onRecord({ kind: 'player', playerId: player, to: spot, type: shownKind });
  }

  return (
    <form onSubmit={submit} aria-labelledby="add-move" className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <h2 id="add-move" className={label}>
        {step === 0 ? 'Change the set-up' : `Add a move to step ${step}`}
      </h2>
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="text-sm text-zinc-300">{shownKind === 'pass' ? 'From' : 'Player'}</span>
          {shownKind === 'pass' ? (
            <input readOnly value={frame.ball ? diagram.players.find((p) => p.id === frame.ball)?.label ?? '' : ''} className={cn(field, 'mt-1 h-11')} />
          ) : (
            <select value={player} onChange={(e) => setPlayer(e.target.value)} className={cn(field, 'mt-1 h-11')}>
              {offence.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          )}
        </label>
        <label className="block">
          <span className="text-sm text-zinc-300">Move</span>
          <select value={shownKind} onChange={(e) => setKind(e.target.value as typeof kind)} className={cn(field, 'mt-1 h-11')}>
            {kinds.map((k) => (
              <option key={k} value={k}>
                {kindLabels[k]}
              </option>
            ))}
          </select>
        </label>
        {shownKind !== 'ball' && (
          <label className="block">
            <span className="text-sm text-zinc-300">{needsTeammate ? 'Teammate' : 'Spot'}</span>
            {needsTeammate ? (
              <select value={teammate} onChange={(e) => setTeammate(e.target.value)} className={cn(field, 'mt-1 h-11')}>
                {offence.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            ) : (
              <select value={where} onChange={(e) => setWhere(e.target.value)} className={cn(field, 'mt-1 h-11')}>
                {QUIZ_TARGETS.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            )}
          </label>
        )}
      </div>
      <Button type="submit" variant="secondary">
        {step === 0 ? 'Change set-up' : 'Add move'}
      </Button>

      {step > 0 && frame.actions.length > 0 && (
        <div>
          <p className="text-sm text-zinc-400">Moves in this step (pick one to change it):</p>
          <ul className="mt-1 flex flex-wrap gap-2">
            {frame.actions.map((a, i) => (
              <li key={i}>
                <button type="button" onClick={() => onSelectLine(i)} className={chip}>
                  {MOVEMENT_TYPES.includes(a.type) ? `${diagram.players.find((p) => p.id === a.from)?.label} ${a.type}` : `${diagram.players.find((p) => p.id === a.from)?.label} ${a.type} to ${diagram.players.find((p) => p.id === a.to)?.label}`}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </form>
  );
}
