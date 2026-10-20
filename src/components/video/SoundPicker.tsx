// src/components/video/SoundPicker.tsx
// Choosing what the tracker says when it calls a shot.
//
// The picker belongs in Settings, not in the tracker. It is set up once and
// then wanted on every session, and four dropdowns in front of someone who is
// about to start shooting is four dropdowns in the way. What the tracker shows
// instead is SoundStatus: what will be heard, and one button to silence it.
'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Volume2, VolumeX } from 'lucide-react';
import {
  DEFAULT_SOUND,
  MAKE_SOUNDS,
  MISS_SOUNDS,
  VOICE_STYLES,
  availableVoices,
  isAudible,
  loadSound,
  onVoicesReady,
  playMake,
  playMiss,
  say,
  soundSummary,
  spokenLine,
  storeSound,
  type SoundSettings,
} from '@/lib/video/trackerSound';

const selectClass =
  'mt-1 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-sm text-white';

/**
 * The full picker, which keeps its own saved state.
 *
 * Nothing on the settings screen needs to read the choice back, so it is not
 * worth threading through a parent. `onChange` exists only for a host that
 * wants to react to a change, not to own the value.
 */
export function SoundPicker({ onChange }: { onChange?: (next: SoundSettings) => void }) {
  const [value, setValue] = useState<SoundSettings>(DEFAULT_SOUND);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    // Both of these are deferred rather than read during render. There is no
    // localStorage on the server, so the first paint is the defaults whatever
    // happens, and reading either one synchronously inside an effect sets off
    // cascading renders.
    //
    // The voice list is also listened for: some browsers populate it only
    // after an event, and without the listener the picker shows an empty list
    // on exactly the browsers with the most voices.
    let live = true;
    const readVoices = () => {
      if (live) setVoices(availableVoices());
    };
    const timer = setTimeout(() => {
      if (!live) return;
      setValue(loadSound());
      readVoices();
    }, 0);
    const stop = onVoicesReady(readVoices);
    return () => {
      live = false;
      clearTimeout(timer);
      stop();
    };
  }, []);

  /** Saves and plays, so a choice can be judged where it will be used. */
  function set(patch: Partial<SoundSettings>) {
    const next = { ...value, ...patch };
    setValue(next);
    storeSound(next);
    onChange?.(next);
    if (patch.make !== undefined) playMake(next.make);
    else if (patch.miss !== undefined) playMiss(next.miss);
    else {
      const line = spokenLine(next.voice, true, 4, 7);
      if (line) say(line, next.voiceUri);
    }
  }

  return (
    <div className="space-y-2 px-4 py-3">
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-zinc-400">
          When you score
          <select
            value={value.make}
            onChange={(e) => set({ make: e.target.value as SoundSettings['make'] })}
            className={selectClass}
          >
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
          <select
            value={value.miss}
            onChange={(e) => set({ miss: e.target.value as SoundSettings['miss'] })}
            className={selectClass}
          >
            {MISS_SOUNDS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-xs text-zinc-400">
        Call the score out loud
        <select
          value={value.voice}
          onChange={(e) => set({ voice: e.target.value as SoundSettings['voice'] })}
          className={selectClass}
        >
          {VOICE_STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
              {s.example ? ` - "${s.example}"` : ''}
            </option>
          ))}
        </select>
      </label>

      {value.voice !== 'off' && voices.length > 0 && (
        <label className="block text-xs text-zinc-400">
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
        <p className="text-xs text-zinc-500">
          This browser offers no voice choices, so the default will be used.
        </p>
      )}

      <p className="text-xs text-zinc-500">
        Each choice plays as you pick it. Sounds are kept on this device, so a different phone has
        its own - which is the point, because they are judged through whichever speaker is in the
        gym with you.
      </p>
    </div>
  );
}

/**
 * What the tracker shows: the choice in a line, and a mute button.
 *
 * Mute is separate from setting everything to silent so that someone sharing
 * a court gets their sounds back afterwards without rebuilding the choice.
 */
export function SoundStatus({
  value,
  onChange,
}: {
  value: SoundSettings;
  onChange: (next: SoundSettings) => void;
}) {
  function toggle() {
    const next = { ...value, muted: !value.muted };
    onChange(next);
    storeSound(next);
  }

  const audible = isAudible(value);

  return (
    <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2">
      <button
        type="button"
        onClick={toggle}
        aria-pressed={value.muted}
        aria-label={value.muted ? 'Unmute shot sounds' : 'Mute shot sounds'}
        className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg ${
          audible ? 'bg-zinc-800 text-white' : 'bg-zinc-800 text-zinc-500'
        }`}
      >
        {audible ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs text-zinc-300">{soundSummary(value)}</span>
        {/* The picker lives in Settings, so say what is there: most players never
            find a choice they were not told about */}
        <span className="block text-[11px] leading-snug text-zinc-500">
          Pick your make and miss sounds in Settings: airhorn, crowd roar, sad trombone and more.
        </span>
      </span>
      <Link
        href="/settings#sounds"
        className="flex flex-shrink-0 items-center gap-0.5 text-xs font-semibold text-cyan-400 underline"
      >
        Sounds <ChevronRight className="h-3 w-3" />
      </Link>
    </div>
  );
}
