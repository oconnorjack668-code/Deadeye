// src/components/video/SoundPicker.tsx
// Choosing what the tracker says when it calls a shot.
'use client';

import React, { useEffect, useState } from 'react';
import { Volume2 } from 'lucide-react';
import {
  MAKE_SOUNDS,
  MISS_SOUNDS,
  VOICE_STYLES,
  availableVoices,
  onVoicesReady,
  playMake,
  playMiss,
  say,
  spokenLine,
  storeSound,
  type SoundSettings,
} from '@/lib/video/trackerSound';

export function SoundPicker({
  value,
  onChange,
}: {
  value: SoundSettings;
  onChange: (next: SoundSettings) => void;
}) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    // Some browsers populate the voice list only after an event, so this reads
    // it once the effect has settled and again when it lands. Without the
    // listener the picker shows an empty list on exactly the browsers with the
    // most voices; without the deferral, setting state synchronously inside an
    // effect sets off cascading renders.
    let live = true;
    const update = () => {
      if (live) setVoices(availableVoices());
    };
    const timer = setTimeout(update, 0);
    const stop = onVoicesReady(update);
    return () => {
      live = false;
      clearTimeout(timer);
      stop();
    };
  }, []);

  /** Saves and plays, so a choice can be judged standing at the phone. */
  function set(patch: Partial<SoundSettings>) {
    const next = { ...value, ...patch };
    onChange(next);
    storeSound(next);
    if (patch.make !== undefined) playMake(next.make);
    else if (patch.miss !== undefined) playMiss(next.miss);
    else {
      const line = spokenLine(next.voice, true, 4, 7);
      if (line) say(line, next.voiceUri);
    }
  }

  const selectClass =
    'mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-white';

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
        <Volume2 className="h-3.5 w-3.5" /> Call shots out loud
      </p>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <label className="text-xs text-zinc-400">
          When you score
          <select value={value.make} onChange={(e) => set({ make: e.target.value as SoundSettings['make'] })} className={selectClass}>
            {MAKE_SOUNDS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        {/* Separate from makes, and silent by default. A make is the thing
            worth hearing; most people want nothing for a miss unless it is
            funny, which is what the trombone is for. */}
        <label className="text-xs text-zinc-400">
          When you miss
          <select value={value.miss} onChange={(e) => set({ miss: e.target.value as SoundSettings['miss'] })} className={selectClass}>
            {MISS_SOUNDS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="mt-2 block text-xs text-zinc-400">
        Voice
        <select value={value.voice} onChange={(e) => set({ voice: e.target.value as SoundSettings['voice'] })} className={selectClass}>
          {VOICE_STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
              {s.example ? ` - "${s.example}"` : ''}
            </option>
          ))}
        </select>
      </label>

      {value.voice !== 'off' && voices.length > 0 && (
        <label className="mt-2 block text-xs text-zinc-400">
          Which voice
          <select
            value={value.voiceUri ?? ''}
            onChange={(e) => set({ voiceUri: e.target.value || null })}
            className={selectClass}
          >
            <option value="">This phone&apos;s default</option>
            {voices.map((v) => (
              <option key={v.voiceURI} value={v.voiceURI}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </label>
      )}

      {value.voice !== 'off' && voices.length === 0 && (
        <p className="mt-2 text-xs text-zinc-500">
          This browser offers no voice choices, so the default will be used.
        </p>
      )}

      <p className="mt-2 text-xs text-zinc-500">Each choice plays as you pick it.</p>
    </div>
  );
}
