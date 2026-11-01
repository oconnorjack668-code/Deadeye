// src/components/study/DailyQuestion.tsx
'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Alert } from '@/components/ui/Alert';
import { CheckCircle2, XCircle, Flame } from 'lucide-react';

export interface DailyQuestionView {
  itemId: string;
  questionIndex: number;
  /** Which lesson it came from, so the player can go and read up */
  lessonTitle: string;
  topicId: string;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

export function DailyQuestion({
  question,
  date,
  answeredIndex,
  streak,
  daysLeft,
}: {
  question: DailyQuestionView;
  date: string;
  /** The answer already given today, if there is one */
  answeredIndex: number | null;
  streak: number;
  daysLeft: number;
}) {
  const router = useRouter();
  const [chosen, setChosen] = useState<number | null>(answeredIndex);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const locked = chosen !== null;
  const correct = chosen === question.correctIndex;

  async function answer(index: number) {
    if (locked || saving) return;
    setSaving(true);
    setError(null);
    // Shown immediately; a failed save is reported rather than silently losing it
    setChosen(index);

    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user) {
      router.push('/login');
      return;
    }
    const { error: saveError } = await supabase.from('daily_iq_answers').insert({
      user_id: auth.user.id,
      answer_date: date,
      item_id: question.itemId,
      question_index: question.questionIndex,
      chosen_index: index,
      was_correct: index === question.correctIndex,
    });
    setSaving(false);
    if (saveError) {
      // 23505 means today's answer is already recorded - another tab got there
      // first, which is the rule working, not a failure.
      if (saveError.code !== '23505') {
        setError('Your answer could not be saved. It will not count towards your run.');
        return;
      }
    }
    router.refresh();
  }

  return (
    <div className="mb-6 rounded-2xl border border-blue-600/40 bg-blue-600/10 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Question of the day</span>
        {streak > 0 && (
          <span className="flex items-center gap-1 text-xs font-bold text-orange-300">
            <Flame className="h-3.5 w-3.5" /> {streak} day{streak === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {error && <Alert variant="error" title="Not saved" className="mb-2">{error}</Alert>}

      <p className="font-bold text-white">{question.text}</p>

      <div className="mt-3 space-y-2">
        {question.options.map((option, i) => {
          const isCorrect = i === question.correctIndex;
          const isChosen = i === chosen;
          const show = locked && (isCorrect || isChosen);
          return (
            <button
              key={option}
              type="button"
              disabled={locked}
              onClick={() => void answer(i)}
              className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-colors ${
                show
                  ? isCorrect
                    ? 'bg-emerald-600/25 text-emerald-100 ring-1 ring-emerald-500/50'
                    : 'bg-red-600/20 text-red-100 ring-1 ring-red-500/40'
                  : locked
                    ? 'bg-zinc-900/60 text-zinc-500'
                    : 'bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {show && (isCorrect ? <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> : <XCircle className="h-4 w-4 flex-shrink-0" />)}
              <span>{option}</span>
            </button>
          );
        })}
      </div>

      {locked && (
        <div className="mt-3 space-y-1 text-sm">
          <p className={correct ? 'font-bold text-emerald-300' : 'font-bold text-amber-300'}>
            {correct ? 'Correct.' : 'Not this time.'}
          </p>
          {question.explanation && <p className="text-zinc-300">{question.explanation}</p>}
          <p className="text-sm text-zinc-500">
            From {question.lessonTitle} · a new question tomorrow · {daysLeft} before any repeat
          </p>
        </div>
      )}
    </div>
  );
}
