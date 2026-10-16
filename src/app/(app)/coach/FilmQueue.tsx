// src/app/(app)/coach/FilmQueue.tsx
// The coach side of "was that the right read?".
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Clock, Play } from 'lucide-react';
import { VERDICTS, momentClock, MAX_COACH_NOTE, type FilmQuestion, type Verdict } from '@/lib/filmQuestions';

export function FilmQueue({
  questions,
  names,
}: {
  questions: FilmQuestion[];
  /** player_id -> display name, resolved server-side from the roster. */
  names: Record<string, string>;
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [clipUrl, setClipUrl] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (questions.length === 0) return null;

  /**
   * Fetches the clip through the broker route. A coach has no direct read on
   * the player's video, by design - the question is the only key, and the URL
   * it returns expires in minutes.
   */
  async function open(q: FilmQuestion) {
    setOpenId(q.id);
    setClipUrl(null);
    setNote('');
    setError(null);
    try {
      const res = await fetch(`/api/film-questions/${q.id}/clip`);
      const data = (await res.json()) as { url?: string; momentMs?: number; error?: string };
      if (!res.ok || !data.url) {
        setError(data.error || 'Could not open that clip.');
        return;
      }
      setClipUrl(data.url);
    } catch {
      setError('Could not open that clip. Check your connection.');
    }
  }

  async function answer(q: FilmQuestion, verdict: Verdict) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    // Only the four answer columns are writable; 00035 enforces that in the
    // database, so this cannot quietly become an edit of the question.
    const { error: updateError } = await supabase
      .from('film_questions')
      .update({
        verdict,
        coach_note: note.trim().slice(0, MAX_COACH_NOTE) || null,
        answered_by: user?.id ?? null,
        answered_at: new Date().toISOString(),
      })
      .eq('id', q.id);
    setBusy(false);
    if (updateError) {
      setError(`Could not save that: ${updateError.message}`);
      return;
    }
    setOpenId(null);
    setClipUrl(null);
    router.refresh();
  }

  return (
    <section className="rounded-2xl border border-cyan-600/40 bg-cyan-600/5 p-4 space-y-3">
      <div>
        <h2 className="font-bold text-white">
          {questions.length} player{questions.length === 1 ? '' : 's'} asked about a read
        </h2>
        <p className="text-xs text-zinc-400">
          Each one shares a single moment of a single clip with you. Oldest first.
        </p>
      </div>

      {error && (
        <Alert variant="error" title="Check this">
          {error}
        </Alert>
      )}

      {questions.map((q) => (
        <div key={q.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
          <p className="font-semibold text-white">{q.question}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
            <span>{names[q.player_id] || 'A player'}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" /> {momentClock(q.moment_ms)}
            </span>
          </p>

          {/* Shown before the clip opens, deliberately. Knowing what the player
              believed is the context that makes the answer teach something -
              "no, because the weak-side help had already rotated" lands, "wrong
              read" does not. */}
          {q.player_read && (
            <p className="mt-2 rounded-lg bg-zinc-950/60 p-2 text-sm text-zinc-300">
              They thought: {q.player_read}
            </p>
          )}

          {openId === q.id ? (
            <div className="mt-3 space-y-3">
              {clipUrl ? (
                <video
                  src={clipUrl}
                  controls
                  playsInline
                  autoPlay
                  className="w-full rounded-xl bg-black"
                  onLoadedMetadata={(e) => {
                    // Jump straight to the moment they asked about
                    e.currentTarget.currentTime = q.moment_ms / 1000;
                  }}
                />
              ) : (
                <p className="text-sm text-zinc-400">Opening the clip…</p>
              )}

              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={MAX_COACH_NOTE}
                rows={3}
                placeholder="What should they have seen? One or two sentences is plenty."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-white placeholder:text-zinc-600"
              />

              <div className="flex flex-wrap gap-2">
                {VERDICTS.map((v) => (
                  <Button
                    key={v.id}
                    variant={v.id === 'good_read' ? 'primary' : 'secondary'}
                    size="sm"
                    disabled={busy}
                    onClick={() => void answer(q, v.id)}
                    title={v.hint}
                  >
                    {v.label}
                  </Button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setOpenId(null);
                    setClipUrl(null);
                  }}
                  className="text-xs text-zinc-500 underline"
                >
                  Not now
                </button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" size="sm" className="mt-2 gap-1.5" onClick={() => void open(q)}>
              <Play className="h-3.5 w-3.5" /> Watch and answer
            </Button>
          )}
        </div>
      ))}
    </section>
  );
}
