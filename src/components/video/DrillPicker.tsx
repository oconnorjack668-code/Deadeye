// src/components/video/DrillPicker.tsx
'use client';

import React from 'react';
import {
  PER_SPOT_CHOICES,
  SPOT_SETS,
  TARGET_CHOICES,
  TIMED_CHOICES,
  type DrillMode,
  type SpotSetId,
} from '@/lib/video/drillModes';

const KINDS: Array<{ kind: DrillMode['kind']; label: string }> = [
  { kind: 'free', label: 'Just shoot' },
  { kind: 'target', label: 'Make target' },
  { kind: 'timed', label: 'Timed' },
  { kind: 'spots', label: 'Spots' },
];

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`min-h-11 rounded-xl px-3 text-sm font-semibold ${on ? 'bg-zinc-800 text-white ring-1 ring-orange-500/70' : 'bg-zinc-900 text-zinc-400'}`}
    >
      {children}
    </button>
  );
}

/**
 * How this session runs: just counting, or a drill the tracker runs for the
 * player - a number of makes to reach, a clock, or spots called out in turn.
 * Chosen before the rim is set, since that is when the player is at the phone.
 */
export function DrillPicker({ value, onChange }: { value: DrillMode; onChange: (mode: DrillMode) => void }) {
  return (
    <div className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Session</p>
      <div className="grid grid-cols-4 gap-1 rounded-xl bg-zinc-950/60 p-1">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            type="button"
            aria-pressed={value.kind === k.kind}
            onClick={() => {
              if (k.kind === value.kind) return;
              if (k.kind === 'free') onChange({ kind: 'free' });
              else if (k.kind === 'target') onChange({ kind: 'target', makes: 25 });
              else if (k.kind === 'timed') onChange({ kind: 'timed', seconds: 120 });
              else onChange({ kind: 'spots', set: 'five-mid', perSpot: 5 });
            }}
            className={`min-h-11 rounded-lg px-1 text-xs font-semibold ${value.kind === k.kind ? 'bg-zinc-800 text-white' : 'text-zinc-500'}`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {value.kind === 'target' && (
        <div className="flex flex-wrap gap-2">
          {TARGET_CHOICES.map((n) => (
            <Chip key={n} on={value.makes === n} onClick={() => onChange({ kind: 'target', makes: n })}>
              {n} makes
            </Chip>
          ))}
        </div>
      )}

      {value.kind === 'timed' && (
        <div className="flex flex-wrap gap-2">
          {TIMED_CHOICES.map((s) => (
            <Chip key={s} on={value.seconds === s} onClick={() => onChange({ kind: 'timed', seconds: s })}>
              {s / 60} min
            </Chip>
          ))}
        </div>
      )}

      {value.kind === 'spots' && (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SPOT_SETS) as SpotSetId[]).map((id) => (
              <Chip key={id} on={value.set === id} onClick={() => onChange({ ...value, set: id })}>
                {SPOT_SETS[id].label}
              </Chip>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {PER_SPOT_CHOICES.map((n) => (
              <Chip key={n} on={value.perSpot === n} onClick={() => onChange({ ...value, perSpot: n })}>
                {n} shots a spot
              </Chip>
            ))}
          </div>
        </div>
      )}

      <p className="text-sm text-zinc-500">
        {value.kind === 'free'
          ? 'Counts every shot it sees until you stop.'
          : value.kind === 'target'
            ? 'Stops by itself when you reach the target.'
            : value.kind === 'timed'
              ? 'Counts down on screen and stops when time is up.'
              : 'Tells you when to move to the next spot, and saves each shot with its spot. Turn the sound up to hear it.'}
      </p>
    </div>
  );
}
