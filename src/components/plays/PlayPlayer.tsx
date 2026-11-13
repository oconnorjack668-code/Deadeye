// src/components/plays/PlayPlayer.tsx
// Plays a play: the animated court, play/pause, restart, step back and
// forward, a scrubber, 0.5x and 1x, the list of steps by name, and "Show my
// role", which fades everyone else and gives one player their job at each
// step.
//
// It never starts by itself (a still court until the player presses play),
// and with reduced motion turned on it moves step by step instead of
// sliding, holding each step on screen.
'use client';

import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import { PlayCourt } from './PlayCourt';
import { sceneAt, stepStart, stepTimes, totalMs } from '@/lib/plays/animation';
import { stepCount, type Diagram } from '@/lib/plays/diagram';
import { roleJobs, roleStart, stepNames } from '@/lib/plays/roles';
import { track } from '@/lib/events';
import { cn } from '@/lib/utils';

/** How long each step is held when moving step by step (reduced motion), at 1x. */
const STEP_HOLD_MS = 1400;

const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReduced(onChange: () => void): () => void {
  const mq = window.matchMedia?.(REDUCED_QUERY);
  mq?.addEventListener('change', onChange);
  return () => mq?.removeEventListener('change', onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => !!window.matchMedia?.(REDUCED_QUERY).matches,
    () => false
  );
}

const controlButton =
  'inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800 disabled:opacity-40';

export function PlayPlayer({ diagram, title }: { diagram: Diagram; title: string }) {
  const reduced = usePrefersReducedMotion();
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<0.5 | 1>(1);
  const [role, setRole] = useState<string | null>(null);

  const total = useMemo(() => totalMs(diagram), [diagram]);
  // Step edges: 0, the end of step 1, the end of step 2 ... the end of the play
  const edges = useMemo(() => [0, ...stepTimes(diagram).map((s) => s.end)], [diagram]);
  const names = useMemo(() => stepNames(diagram), [diagram]);
  const offence = diagram.players.filter((p) => p.side === 'offence');
  const jobs = useMemo(() => (role ? roleJobs(diagram, role) : null), [diagram, role]);
  const steps = stepCount(diagram);

  const atEnd = t >= total;
  const running = playing && !atEnd;
  const scene = sceneAt(diagram, t);
  const current = scene.step;

  useEffect(() => {
    track('play_opened');
  }, []);

  useEffect(() => {
    if (!running) return;
    if (reduced) {
      // Jump to the next step edge and hold it there
      const id = window.setInterval(() => {
        setT((cur) => edges.find((e) => e > cur + 1) ?? total);
      }, STEP_HOLD_MS / speed);
      return () => window.clearInterval(id);
    }
    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      if (last !== null) {
        const dt = now - last;
        setT((cur) => Math.min(cur + dt * speed, total));
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, reduced, speed, total, edges]);

  function togglePlay() {
    if (running) {
      setPlaying(false);
      return;
    }
    if (atEnd) setT(0);
    setPlaying(true);
  }

  function goTo(time: number) {
    setPlaying(false);
    setT(Math.min(Math.max(time, 0), total));
  }

  const nextEdge = edges.find((e) => e > t + 1) ?? total;
  const prevEdge = [...edges].reverse().find((e) => e < t - 1) ?? 0;
  const note = diagram.frames[current]?.note;
  const roleLabel = offence.find((p) => p.id === role)?.label;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-2 sm:p-3">
        <PlayCourt
          diagram={diagram}
          t={t}
          role={role}
          label={`${title}, step ${current} of ${steps}: ${names[current - 1]}`}
          className="mx-auto block h-auto w-full max-w-xl"
        />
        <p className="mt-2 px-1 text-sm text-zinc-300" aria-live={running ? 'off' : 'polite'}>
          <span className="font-semibold text-white">
            Step {current} of {steps}:
          </span>{' '}
          {names[current - 1]}
          {note && <span className="block text-zinc-400">{note}</span>}
        </p>

        <label className="mt-2 block px-1">
          <span className="sr-only">Position in the play</span>
          <input
            type="range"
            min={0}
            max={total}
            step={reduced ? 1 : 50}
            value={Math.round(t)}
            onChange={(e) => goTo(Number(e.target.value))}
            aria-valuetext={`Step ${current} of ${steps}`}
            className="h-11 w-full accent-orange-500"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2 px-1 pb-1">
          <button type="button" onClick={() => goTo(0)} className={controlButton} aria-label="Restart">
            <RotateCcw className="h-5 w-5" />
          </button>
          <button type="button" onClick={() => goTo(prevEdge)} disabled={t <= 0} className={controlButton} aria-label="Previous step">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={togglePlay}
            className="inline-flex h-11 min-w-24 items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 text-sm font-bold text-white hover:brightness-110 active:scale-[0.98]"
          >
            {running ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" fill="currentColor" />}
            {running ? 'Pause' : atEnd ? 'Play again' : 'Play'}
          </button>
          <button type="button" onClick={() => goTo(nextEdge)} disabled={atEnd} className={controlButton} aria-label="Next step">
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="ml-auto flex gap-1" role="group" aria-label="Speed">
            {([0.5, 1] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
                className={cn(controlButton, speed === s && 'border-zinc-600 bg-zinc-800 text-white')}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <section aria-labelledby="my-role" className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
        <h2 id="my-role" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Show my role
        </h2>
        <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Choose a player">
          <button
            type="button"
            onClick={() => setRole(null)}
            aria-pressed={role === null}
            className={cn(controlButton, role === null && 'border-orange-500/60 bg-orange-500/15 text-orange-200')}
          >
            Everyone
          </button>
          {offence.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setRole(p.id)}
              aria-pressed={role === p.id}
              aria-label={`Show my role: ${p.label}`}
              className={cn(controlButton, 'w-11 px-0 font-black', role === p.id && 'border-orange-500/60 bg-orange-500/15 text-orange-200')}
            >
              {p.label}
            </button>
          ))}
        </div>
        {role && <p className="mt-3 text-sm text-orange-300">You are {roleLabel}. {roleStart(diagram, role)}.</p>}

        <h2 className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-400">Steps</h2>
        <ol className="mt-2 space-y-1">
          {names.map((name, i) => {
            const k = i + 1;
            const isCurrent = k === current;
            return (
              <li key={k}>
                <button
                  type="button"
                  onClick={() => goTo(stepStart(diagram, k))}
                  aria-current={isCurrent ? 'step' : undefined}
                  className={cn(
                    'flex min-h-11 w-full items-start gap-3 rounded-xl px-3 py-2 text-left text-sm',
                    isCurrent ? 'bg-zinc-800 text-white' : 'text-zinc-300 hover:bg-zinc-900'
                  )}
                >
                  <span className="w-5 flex-shrink-0 font-black tabular-nums text-zinc-400">{k}</span>
                  <span className="min-w-0">
                    <span className="block">{name}</span>
                    {jobs && <span className="block text-orange-300">You: {jobs[i]}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
