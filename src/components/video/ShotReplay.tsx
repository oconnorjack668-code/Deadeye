// src/components/video/ShotReplay.tsx
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';

/** Seconds shown before the moment the ball reached the rim, and after it. */
const BEFORE_S = 2.5;
const AFTER_S = 1.5;

/**
 * Plays the few seconds around one shot, so a call can be checked by
 * watching it rather than remembering it. An "Unclear" shot used to be a
 * question the player had to answer from memory, minutes later; this is the
 * one place in the app where the answer can actually be seen. Make and Miss
 * here settle the call in the same tap.
 */
export function ShotReplay({
  file,
  atMs,
  title,
  made,
  onSet,
  onClose,
}: {
  file: File;
  /** When the ball reached the rim, in ms from the start of the file. */
  atMs: number;
  title: string;
  /** The call as it stands, or null while unclear. */
  made: boolean | null;
  onSet: (made: boolean) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);

  // The file's address is made and set on the video here, and released when
  // the effect is cleaned up. Not made during render and released in an
  // effect: development mounts effects twice, so the address was released
  // before the video had loaded it and nothing played.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const url = URL.createObjectURL(file);
    video.src = url;
    return () => {
      video.removeAttribute('src');
      URL.revokeObjectURL(url);
    };
  }, [file]);

  // Close on Escape, for a keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const from = Math.max(0, atMs / 1000 - BEFORE_S);
  const to = atMs / 1000 + AFTER_S;

  function play() {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = from;
    v.play().catch(() => undefined);
  }

  function onTime() {
    const v = videoRef.current;
    if (v && v.currentTime >= to) v.pause();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-lg space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-white">{title}</p>
          <button type="button" onClick={onClose} aria-label="Close the replay" className="flex h-11 w-11 items-center justify-center rounded-xl text-zinc-300 hover:bg-zinc-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        {failed ? (
          <p className="rounded-xl bg-zinc-900 p-4 text-sm text-zinc-400">This browser could not play the video back.</p>
        ) : (
          <video
              ref={videoRef}
              muted
              playsInline
              onLoadedMetadata={play}
              onTimeUpdate={onTime}
              onError={() => setFailed(true)}
              className="w-full rounded-xl bg-black"
            />
        )}
        <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
          <button type="button" onClick={play} aria-label="Watch it again" className="flex h-11 w-11 items-center justify-center rounded-xl bg-zinc-800 text-zinc-100">
            <RotateCcw className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onSet(true)}
            aria-pressed={made === true}
            className={`h-11 rounded-xl font-semibold ${made === true ? 'bg-emerald-600 text-white' : 'border border-emerald-600/50 text-emerald-300'}`}
          >
            Make
          </button>
          <button
            type="button"
            onClick={() => onSet(false)}
            aria-pressed={made === false}
            className={`h-11 rounded-xl font-semibold ${made === false ? 'bg-red-600 text-white' : 'border border-red-600/50 text-red-300'}`}
          >
            Miss
          </button>
        </div>
      </div>
    </div>
  );
}
