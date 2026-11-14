// src/app/(app)/admin/demo-videos/FilmClipForm.tsx
// Owner tool: add or edit one film clip. A YouTube link, the start and end,
// the title and channel, theme and level, Free or Pro, and the questions,
// each stopping the clip at its own moment. Saving asks YouTube whether the
// video may play inside other sites first (filmActions.ts). The owner also
// checks the video is not "Made for Kids" (YouTube API policy III.E.4.j).
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { FILM_LEVELS, FILM_THEMES } from '@/lib/film/catalog';
import { parseClipDraft, type ClipDraft } from '@/lib/film/input';
import { nextQuestionKey, type FilmQuestion } from '@/lib/film/questions';
import { formatClock, parseClock } from '@/lib/film/rows';
import { saveFilmClip } from './filmActions';

const input = 'w-full rounded-lg border border-zinc-700/80 bg-zinc-950 px-3 py-2 text-base text-white placeholder:text-zinc-500';
const label = 'block text-sm text-zinc-300';

/** A question as the form holds it: the moment as typed. */
interface QuestionDraft {
  key: string;
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
  moment: string;
}

export interface FilmClipFormValues {
  id?: string;
  link: string;
  start: string;
  end: string;
  title: string;
  channel: string;
  theme: string;
  level: string;
  isFree: boolean;
  published: boolean;
  questions: FilmQuestion[];
}

function toDraft(q: FilmQuestion): QuestionDraft {
  return { key: q.key, question: q.question, options: [...q.options], correct_index: q.correct_index, explanation: q.explanation, moment: formatClock(q.moment_s) };
}

export function FilmClipForm({ initial }: { initial: FilmClipFormValues }) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => initial.questions.map(toDraft));
  const [checkedKids, setCheckedKids] = useState(!!initial.id);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);

  const set = <K extends keyof FilmClipFormValues>(key: K, value: FilmClipFormValues[K]) => setV((old) => ({ ...old, [key]: value }));
  const setQ = (i: number, change: Partial<QuestionDraft>) => setQuestions((old) => old.map((q, n) => (n === i ? { ...q, ...change } : q)));

  function draft(): ClipDraft {
    return {
      ...(v.id ? { id: v.id } : {}),
      link: v.link,
      start: v.start,
      end: v.end,
      title: v.title,
      channel: v.channel,
      theme: v.theme,
      level: v.level,
      isFree: v.isFree,
      published: v.published,
      questions: questions.map((q) => ({
        key: q.key,
        question: q.question,
        options: q.options,
        correct_index: q.correct_index,
        explanation: q.explanation,
        moment_s: parseClock(q.moment) ?? -1,
      })),
    };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    const local = parseClipDraft(draft());
    if (!local.ok) return setMessage({ tone: 'error', text: local.error });
    if (!checkedKids) return setMessage({ tone: 'error', text: 'Tick that you checked the video is not Made for Kids.' });
    setBusy(true);
    const res = await saveFilmClip(draft());
    setBusy(false);
    if (!res.ok) return setMessage({ tone: 'error', text: res.error });
    setMessage({ tone: 'ok', text: v.published ? 'Saved and published.' : 'Saved as a draft. Players do not see it yet.' });
    if (!v.id) router.push(`/admin/demo-videos?show=film&edit=${res.id}`);
    else router.refresh();
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
      <h2 className="font-bold text-white">{v.id ? 'Edit clip' : 'New clip'}</h2>

      <label className={label}>
        YouTube link
        <input className={`${input} mt-1`} value={v.link} onChange={(e) => set('link', e.target.value)} placeholder="https://youtu.be/..." />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className={label}>
          Start (m:ss)
          <input className={`${input} mt-1`} value={v.start} onChange={(e) => set('start', e.target.value)} placeholder="0:00" inputMode="numeric" />
        </label>
        <label className={label}>
          End (m:ss)
          <input className={`${input} mt-1`} value={v.end} onChange={(e) => set('end', e.target.value)} placeholder="0:45" inputMode="numeric" />
        </label>
      </div>
      <label className={label}>
        Title
        <input className={`${input} mt-1`} value={v.title} onChange={(e) => set('title', e.target.value)} maxLength={100} />
      </label>
      <label className={label}>
        Channel (shown as where the video is from)
        <input className={`${input} mt-1`} value={v.channel} onChange={(e) => set('channel', e.target.value)} maxLength={100} />
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className={label}>
          Theme
          <select className={`${input} mt-1`} value={v.theme} onChange={(e) => set('theme', e.target.value)}>
            {FILM_THEMES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className={label}>
          Level
          <select className={`${input} mt-1`} value={v.level} onChange={(e) => set('level', e.target.value)}>
            {FILM_LEVELS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-semibold text-white">Questions</legend>
        {questions.length === 0 && <p className="text-sm text-zinc-500">None yet. A clip needs at least one before it is published.</p>}
        {questions.map((q, i) => (
          <div key={q.key} className="space-y-2 rounded-lg border border-zinc-800 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-zinc-200">Question {i + 1}</span>
              <button
                type="button"
                onClick={() => setQuestions((old) => old.filter((_, n) => n !== i))}
                aria-label={`Remove question ${i + 1}`}
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-zinc-800 text-zinc-400 hover:text-white"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <label className={label}>
              Stop the clip at (m:ss, between the start and the end)
              <input className={`${input} mt-1`} value={q.moment} onChange={(e) => setQ(i, { moment: e.target.value })} placeholder="0:12" />
            </label>
            <label className={label}>
              Question
              <input className={`${input} mt-1`} value={q.question} onChange={(e) => setQ(i, { question: e.target.value })} maxLength={200} />
            </label>
            {q.options.map((o, n) => (
              <div key={n} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`right-${q.key}`}
                  checked={q.correct_index === n}
                  onChange={() => setQ(i, { correct_index: n })}
                  aria-label={`Answer ${n + 1} is right`}
                  className="h-5 w-5"
                />
                <input
                  className={input}
                  value={o}
                  onChange={(e) => setQ(i, { options: q.options.map((x, m) => (m === n ? e.target.value : x)) })}
                  aria-label={`Question ${i + 1}, answer ${n + 1}`}
                  maxLength={120}
                />
              </div>
            ))}
            <div className="flex gap-2">
              {q.options.length < 4 && (
                <button type="button" onClick={() => setQ(i, { options: [...q.options, ''] })} className="h-11 rounded-lg border border-zinc-800 px-3 text-sm text-zinc-300">
                  Add an answer
                </button>
              )}
              {q.options.length > 2 && (
                <button
                  type="button"
                  onClick={() => setQ(i, { options: q.options.slice(0, -1), correct_index: Math.min(q.correct_index, q.options.length - 2) })}
                  className="h-11 rounded-lg border border-zinc-800 px-3 text-sm text-zinc-300"
                >
                  Remove the last answer
                </button>
              )}
            </div>
            <label className={label}>
              Why (shown after answering)
              <textarea className={`${input} mt-1`} rows={2} value={q.explanation} onChange={(e) => setQ(i, { explanation: e.target.value })} maxLength={400} />
            </label>
          </div>
        ))}
        {questions.length < 10 && (
          <button
            type="button"
            onClick={() =>
              setQuestions((old) => [...old, { key: nextQuestionKey(old), question: '', options: ['', ''], correct_index: 0, explanation: '', moment: '' }])
            }
            className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-700 px-3 text-sm font-semibold text-zinc-200"
          >
            <Plus className="h-4 w-4" /> Add a question
          </button>
        )}
      </fieldset>

      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={v.isFree} onChange={(e) => set('isFree', e.target.checked)} className="h-5 w-5" /> Free (everyone can open it; otherwise Pro)
      </label>
      <label className="flex items-center gap-2 text-sm text-zinc-300">
        <input type="checkbox" checked={v.published} onChange={(e) => set('published', e.target.checked)} className="h-5 w-5" /> Published (players can see it)
      </label>

      <div className="space-y-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-100">
        <p className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
          Check this video is not &ldquo;Made for Kids&rdquo; (YouTube API policy III.E.4.j). One sign on YouTube: its comments are turned off. If it is
          Made for Kids, pick a different video.
        </p>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={checkedKids} onChange={(e) => setCheckedKids(e.target.checked)} className="h-5 w-5" /> I checked: it is not
          Made for Kids
        </label>
      </div>

      {message && (
        <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-sm ${message.tone === 'error' ? 'text-red-300' : 'text-emerald-400'}`}>
          {message.text}
        </p>
      )}
      <button type="submit" disabled={busy} className="h-11 rounded-lg bg-orange-600 px-4 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50">
        {busy ? 'Checking with YouTube...' : 'Save clip'}
      </button>
    </form>
  );
}
