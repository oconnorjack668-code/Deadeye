// src/components/DrillTimer.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Minus, Pause, Play, Plus, RotateCcw, Timer } from 'lucide-react';
import { clock, phaseAt, totalSeconds, type TimerPlan } from '@/lib/drillTimer';

type Status = 'idle' | 'running' | 'paused' | 'done';

let audio: AudioContext | null = null;

/** A short beep. The context is made on the first tap, as phones only allow sound after one. */
function beep(frequency: number, ms: number) {
  try {
    audio ??= new AudioContext();
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.25, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + ms / 1000);
    osc.connect(gain).connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + ms / 1000);
  } catch {
    // No sound on this phone: the vibration and the screen still show it
  }
}

function Stepper({ label, value, onChange, step, min, max, format }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step: number;
  min: number;
  max: number;
  format: (v: number) => string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{label}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" aria-label={`Less ${label.toLowerCase()}`} onClick={() => onChange(Math.max(min, value - step))} className="rounded-lg bg-zinc-800 p-1.5 text-zinc-300">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-12 text-center text-sm font-bold text-white tabular-nums">{format(value)}</span>
        <button type="button" aria-label={`More ${label.toLowerCase()}`} onClick={() => onChange(Math.min(max, value + step))} className="rounded-lg bg-zinc-800 p-1.5 text-zinc-300">
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

/**
 * Work and rest rounds with a beep for the last 3 seconds of each and a double
 * beep when it changes, so a player can do the drill without watching the
 * phone. It keeps the screen awake while it runs.
 */
export function DrillTimer({ initial }: { initial: TimerPlan }) {
  const [plan, setPlan] = useState<TimerPlan>(initial);
  const [status, setStatus] = useState<Status>('idle');
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(0);
  const lastCue = useRef('');

  useEffect(() => {
    if (status !== 'running') return;
    let lock: { release: () => Promise<void> } | null = null;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } };
    nav.wakeLock?.request('screen').then((l) => (lock = l)).catch(() => undefined);

    const id = setInterval(() => {
      const secs = (Date.now() - startedAt.current) / 1000;
      const now = phaseAt(plan, secs);
      setElapsed(secs);
      const cue = `${now.phase}-${now.round}-${now.remaining}`;
      if (cue === lastCue.current) return;
      const before = lastCue.current;
      lastCue.current = cue;
      if (now.phase === 'done') {
        beep(880, 600);
        navigator.vibrate?.([300, 100, 300]);
        setStatus('done');
      } else if (before && !before.startsWith(`${now.phase}-${now.round}-`)) {
        beep(now.phase === 'work' ? 880 : 520, 250);
        setTimeout(() => beep(now.phase === 'work' ? 880 : 520, 250), 300);
        navigator.vibrate?.(now.phase === 'work' ? [150, 80, 150] : 200);
      } else if (now.remaining <= 3) {
        beep(660, 120);
      }
    }, 200);
    return () => {
      clearInterval(id);
      lock?.release().catch(() => undefined);
    };
  }, [status, plan]);

  /** Resumes from where it paused, or starts from zero when fresh. */
  function start(fresh: boolean) {
    beep(880, 1); // unlocks sound on the tap
    startedAt.current = Date.now() - (fresh ? 0 : elapsed) * 1000;
    if (fresh) {
      lastCue.current = '';
      setElapsed(0);
    }
    setStatus('running');
  }

  function reset() {
    setStatus('idle');
    setElapsed(0);
    lastCue.current = '';
  }

  function change(next: Partial<TimerPlan>) {
    setPlan((p) => ({ ...p, ...next }));
    reset();
  }

  const now = phaseAt(plan, elapsed);
  const intervals = plan.rounds > 1 || plan.rest > 0;
  const label = status === 'done' ? 'Done' : now.phase === 'rest' ? 'Rest' : intervals ? 'Work' : 'Time left';
  const colour = status === 'done' ? 'text-emerald-400' : now.phase === 'rest' ? 'text-cyan-300' : 'text-white';

  return (
    <section aria-label="Drill timer" className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-1.5 font-bold text-white">
          <Timer className="h-4 w-4 text-orange-400" /> Timer
        </h2>
        <span className="text-xs text-zinc-500">{clock(totalSeconds(plan))} total</span>
      </div>

      <div className="text-center" aria-live="polite">
        <div className={`text-xs font-bold uppercase tracking-widest ${colour}`}>{label}</div>
        <div className={`text-6xl font-black tabular-nums ${colour}`}>{clock(status === 'done' ? 0 : now.remaining)}</div>
        {intervals && (
          <div className="text-sm text-zinc-400">
            Round {Math.min(now.round, plan.rounds)} of {plan.rounds}
          </div>
        )}
      </div>

      <div className="flex justify-center gap-2">
        {status === 'running' ? (
          <button type="button" onClick={() => setStatus('paused')} className="flex items-center gap-2 rounded-xl bg-zinc-800 px-6 py-3 font-bold text-white">
            <Pause className="h-4 w-4" /> Pause
          </button>
        ) : (
          <button
            type="button"
            onClick={() => start(status !== 'paused')}
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-3 font-bold text-white hover:bg-orange-500"
          >
            <Play className="h-4 w-4" /> {status === 'paused' ? 'Resume' : status === 'done' ? 'Again' : 'Start'}
          </button>
        )}
        {status !== 'idle' && (
          <button type="button" onClick={reset} aria-label="Reset the timer" className="rounded-xl bg-zinc-800 px-4 py-3 text-zinc-300">
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
      </div>

      {status === 'idle' && (
        <div className="flex flex-wrap justify-center gap-4 border-t border-zinc-800 pt-3">
          <Stepper label="Rounds" value={plan.rounds} onChange={(rounds) => change({ rounds, rest: rounds === 1 ? 0 : plan.rest || 30 })} step={1} min={1} max={20} format={String} />
          <Stepper label={plan.rounds > 1 ? 'Work' : 'Time'} value={plan.work} onChange={(work) => change({ work })} step={plan.work >= 120 ? 60 : 5} min={5} max={3600} format={clock} />
          {plan.rounds > 1 && <Stepper label="Rest" value={plan.rest} onChange={(rest) => change({ rest })} step={5} min={0} max={600} format={clock} />}
        </div>
      )}
    </section>
  );
}
