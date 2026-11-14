// src/components/coach/AnswerSplit.tsx
// How a team answered one question, as totals with a bar each, the right
// answer marked. Used by the head coach's progress view for plays and for
// film. Never who picked what: it only ever gets counts.
import React from 'react';
import { cn } from '@/lib/utils';

export interface SplitPick {
  pick: string;
  label: string;
  players: number;
  right: boolean;
}

export function AnswerSplit({ prompt, answered, picks }: { prompt: string; answered: number; picks: SplitPick[] }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold text-white">{prompt}</p>
      {answered === 0 ? (
        <p className="text-sm text-zinc-500">No answers yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {picks.map((p) => (
            <li key={p.pick}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={p.right ? 'font-semibold text-emerald-300' : 'text-zinc-300'}>
                  {p.label}
                  {p.right && ' (right answer)'}
                </span>
                <span className="tabular-nums text-zinc-400">
                  {p.players} of {answered}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800" aria-hidden>
                <div
                  className={cn('h-full rounded-full', p.right ? 'bg-emerald-500' : 'bg-zinc-500')}
                  style={{ width: `${Math.round((p.players / answered) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
