// src/components/plays/PlayQuiz.tsx
// The role quiz: three questions built from the play, each answered by
// tapping a spot on the court, with the right answer and the job explained
// straight after. The spots are buttons with names ("the left corner"), so
// the quiz works from a keyboard and a screen reader too.
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';
import { PlayCourt, percentOf } from './PlayCourt';
import { Button } from '@/components/ui/Button';
import { stepStart } from '@/lib/plays/animation';
import type { Diagram } from '@/lib/plays/diagram';
import { knowsIt, passMark, QUIZ_TARGETS, targetLabel, type QuizQuestion } from '@/lib/plays/quiz';
import { submitQuizAttempt, type QuizResult } from '@/app/(app)/plays/actions';
import { track } from '@/lib/events';
import { cn } from '@/lib/utils';

export function PlayQuiz({ playId, title, diagram, questions }: { playId: string; title: string; diagram: Diagram; questions: QuizQuestion[] }) {
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Array<{ key: string; pick: string }>>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [sending, setSending] = useState(false);

  const q = questions[index];
  const pick = picks.find((p) => p.key === q?.key)?.pick ?? null;
  const finished = picks.length === questions.length && index === questions.length;
  const score = picks.filter((p) => questions.find((x) => x.key === p.key)?.answer === p.pick).length;

  async function send(all: Array<{ key: string; pick: string }>) {
    setSending(true);
    const res = await submitQuizAttempt(playId, all);
    setSending(false);
    setResult(res);
    if (res.ok) track('play_quiz_done');
  }

  function answer(target: string) {
    if (pick || !q) return;
    setPicks((cur) => [...cur, { key: q.key, pick: target }]);
  }

  function next() {
    const last = index === questions.length - 1;
    setIndex(index + 1);
    if (last) void send(picks);
  }

  function restart() {
    setIndex(0);
    setPicks([]);
    setResult(null);
  }

  if (finished) {
    const passed = knowsIt(score, questions.length);
    return (
      <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4" role="status">
        <p className="text-5xl font-black tabular-nums text-white">
          {score}/{questions.length}
        </p>
        <p className="text-sm text-zinc-300">
          {passed
            ? 'You know this play. Nice work.'
            : `Knowing it means ${passMark(questions.length)} of ${questions.length} right. Watch the play again with Show my role, then have another go.`}
        </p>
        {sending && <p className="text-sm text-zinc-400">Saving your answers...</p>}
        {result && !result.ok && (
          <div className="space-y-2">
            <p role="alert" className="text-sm text-red-400">
              {result.error}
            </p>
            <Button type="button" variant="secondary" onClick={() => void send(picks)}>
              Try saving again
            </Button>
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          <Button type="button" onClick={restart}>
            Try again
          </Button>
          <Link
            href={`/plays/${playId}`}
            className="inline-flex h-11 items-center rounded-xl border border-zinc-700 px-4 text-sm font-medium text-zinc-200 hover:bg-zinc-800/80"
          >
            Back to the play
          </Link>
        </div>
      </div>
    );
  }

  if (!q) return null;
  const right = pick !== null && pick === q.answer;

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        Question {index + 1} of {questions.length}
      </p>
      <h2 className="text-xl font-black tracking-tight text-white">{q.prompt}</h2>
      <p className="text-sm text-zinc-400">Tap the spot on the court.</p>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-2">
        <div className="relative mx-auto w-full max-w-xl">
          <PlayCourt
            diagram={diagram}
            t={stepStart(diagram, q.step)}
            role={q.playerId}
            hideMovesOf={q.playerId}
            ease={false}
            label={`${title}, at the start of step ${q.step}. You are ${q.label}.`}
            className="block h-auto w-full"
          />
          <div role="group" aria-label="Spots on the court">
            {QUIZ_TARGETS.map((t) => {
              const at = percentOf(diagram, t.at);
              const isPick = pick === t.id;
              const isAnswer = pick !== null && t.id === q.answer;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => answer(t.id)}
                  disabled={pick !== null}
                  aria-label={t.label}
                  aria-pressed={isPick}
                  style={{ left: `${at.left}%`, top: `${at.top}%` }}
                  className="absolute flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full border-2',
                      isAnswer
                        ? 'border-emerald-300 bg-emerald-500 text-white'
                        : isPick
                          ? 'border-red-300 bg-red-500/80 text-white'
                          : 'border-dashed border-zinc-300/70 bg-zinc-950/40'
                    )}
                  >
                    {isAnswer ? <Check className="h-4 w-4" /> : isPick ? <X className="h-4 w-4" /> : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div aria-live="polite">
        {pick !== null && (
          <div className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <p className={cn('font-bold', right ? 'text-emerald-400' : 'text-red-400')}>
              {right ? 'Right.' : `Not quite: you go to ${targetLabel(q.answer)}.`}
            </p>
            <p className="text-sm text-zinc-300">{q.explanation}</p>
            <Button type="button" onClick={next}>
              {index === questions.length - 1 ? 'See how you did' : 'Next question'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
