// src/components/film/FilmNotes.tsx
// A private note on a clip: what the player wants to remember about it. Only
// they can read it (film_notes, 00062); coaches and teammates never see it.
// Capped at 500 characters, here and in the database.
'use client';

import React, { useId, useState } from 'react';
import { Lock } from 'lucide-react';
import { saveFilmNote } from '@/app/(app)/film/actions';
import { MAX_NOTE } from '@/lib/film/limits';

export function FilmNotes({ clipId, initial }: { clipId: string; initial: string }) {
  const [text, setText] = useState(initial);
  const [kept, setKept] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const boxId = useId();
  const helpId = useId();

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const res = await saveFilmNote(clipId, text);
    setBusy(false);
    if (!res.ok) return setMessage({ tone: 'error', text: res.error });
    setKept(text.trim());
    setMessage({ tone: 'ok', text: text.trim() ? 'Note saved.' : 'Note removed.' });
  }

  return (
    <form onSubmit={save} className="space-y-2 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <label htmlFor={boxId} className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        Your notes
      </label>
      <p id={helpId} className="flex items-center gap-1.5 text-sm text-zinc-400">
        <Lock className="h-4 w-4 flex-shrink-0" /> Only you can see these.
      </p>
      <textarea
        id={boxId}
        aria-describedby={helpId}
        value={text}
        onChange={(e) => {
          setText(e.target.value.slice(0, MAX_NOTE));
          setMessage(null);
        }}
        maxLength={MAX_NOTE}
        rows={3}
        placeholder="What do you want to remember from this clip?"
        className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-base text-white placeholder:text-zinc-500"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs tabular-nums text-zinc-500">
          {text.length} / {MAX_NOTE}
        </span>
        <button
          type="submit"
          disabled={busy || text.trim() === kept}
          className="inline-flex h-11 items-center rounded-xl border border-zinc-700 px-4 text-sm font-semibold text-zinc-100 hover:bg-zinc-800 disabled:opacity-40"
        >
          {busy ? 'Saving...' : 'Save note'}
        </button>
      </div>
      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${message.tone === 'error' ? 'text-red-400' : 'text-emerald-400'}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
