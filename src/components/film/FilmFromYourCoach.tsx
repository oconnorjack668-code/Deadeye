// src/components/film/FilmFromYourCoach.tsx
// The top of the film library for a player on a team: clips and packs their
// coach set for them, with the due date and whether they have done them.
// Server-rendered; the data comes from coachFilmFor.
import React from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Eye, Film, Layers } from 'lucide-react';
import type { CoachFilm } from '@/lib/film/access';
import { clipLength } from '@/lib/film/rows';
import { COACH_SEES_LINE } from '@/lib/plays/progress';

export function dueLabel(day: string | null): string {
  if (!day) return 'No due date';
  return `Due ${new Date(`${day}T00:00:00`).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' })}`;
}

const row = 'flex min-h-11 items-center gap-3 rounded-xl bg-zinc-950/60 p-3 hover:bg-zinc-900';

export function FilmFromYourCoach({ data, done }: { data: CoachFilm; done: ReadonlySet<string> }) {
  if (!data.clips.length && !data.packs.length) return null;
  return (
    <section aria-labelledby="film-from-coach" className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <h2 id="film-from-coach" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        From your coach
      </h2>
      <ul className="space-y-2">
        {data.clips.map((a) => (
          <li key={a.assignmentId}>
            <Link href={`/film/${a.clip.id}`} className={row}>
              <Film className="h-5 w-5 flex-shrink-0 text-zinc-400" />
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-white">{a.clip.title}</span>
                <span className="mt-0.5 block text-sm text-zinc-400">
                  {dueLabel(a.dueDate)} · {clipLength(a.clip)}
                </span>
              </span>
              {done.has(a.clip.id) ? (
                <span className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-emerald-400">
                  <Check className="h-4 w-4" /> Done
                </span>
              ) : (
                <ChevronRight className="h-5 w-5 flex-shrink-0 text-zinc-500" />
              )}
            </Link>
          </li>
        ))}
        {data.packs.map((a) => {
          const finished = a.clipIds.filter((id) => done.has(id)).length;
          return (
            <li key={a.assignmentId}>
              <Link href={`/film/packs/${a.packId}`} className={row}>
                <Layers className="h-5 w-5 flex-shrink-0 text-zinc-400" />
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-white">{a.packTitle}</span>
                  <span className="mt-0.5 block text-sm text-zinc-400">
                    {dueLabel(a.dueDate)} · {finished} of {a.clipIds.length} clips done
                  </span>
                </span>
                {a.clipIds.length > 0 && finished >= a.clipIds.length ? (
                  <span className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-emerald-400">
                    <Check className="h-4 w-4" /> Done
                  </span>
                ) : (
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-zinc-500" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <p className="flex items-start gap-2 text-sm text-zinc-400">
        <Eye className="mt-0.5 h-4 w-4 flex-shrink-0" /> {COACH_SEES_LINE}
      </p>
    </section>
  );
}
