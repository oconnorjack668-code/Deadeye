// src/components/plays/FromYourCoach.tsx
// The top of the plays library for a player on a team: plays their coach set
// for them (with the due date and whether they know it yet) and the team's
// playbook. Server-rendered; the data comes from coachPlaysFor.
import React from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Eye } from 'lucide-react';
import { PlayCourt } from './PlayCourt';
import type { CoachPlays } from '@/lib/plays/access';
import { COACH_SEES_LINE } from '@/lib/plays/progress';
import type { Play } from '@/lib/plays/rows';

function due(day: string | null): string {
  if (!day) return 'No due date';
  return `Due ${new Date(`${day}T00:00:00`).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' })}`;
}

function Row({ play, line, knows }: { play: Play; line: string; knows: boolean }) {
  return (
    <Link href={`/plays/${play.id}`} className="flex items-center gap-3 rounded-xl bg-zinc-950/60 p-3 hover:bg-zinc-900">
      <PlayCourt diagram={play.diagram} label="" className="h-12 w-12 flex-shrink-0 rounded-lg" />
      <span className="min-w-0 flex-1">
        <span className="block font-bold text-white">{play.title}</span>
        <span className="mt-0.5 block text-sm text-zinc-400">{line}</span>
      </span>
      {knows ? (
        <span className="inline-flex flex-shrink-0 items-center gap-1 text-sm font-semibold text-emerald-400">
          <Check className="h-4 w-4" /> You know it
        </span>
      ) : (
        <ChevronRight className="h-5 w-5 flex-shrink-0 text-zinc-500" />
      )}
    </Link>
  );
}

export function FromYourCoach({ data }: { data: CoachPlays }) {
  if (!data.assigned.length && !data.playbook.length) return null;
  return (
    <section aria-labelledby="from-coach" className="space-y-3 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
      <h2 id="from-coach" className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        From your coach
      </h2>
      {data.assigned.length > 0 && (
        <>
          <ul className="space-y-2">
            {data.assigned.map((a) => (
              <li key={a.assignmentId}>
                <Row play={a.play} line={`${a.title} · ${due(a.dueDate)}`} knows={data.knows.has(a.play.id)} />
              </li>
            ))}
          </ul>
          <p className="flex items-start gap-2 text-sm text-zinc-400">
            <Eye className="mt-0.5 h-4 w-4 flex-shrink-0" /> {COACH_SEES_LINE}
          </p>
        </>
      )}
      {data.playbook.length > 0 && (
        <>
          <h3 className="text-sm font-semibold text-zinc-300">Your team playbook</h3>
          <ul className="space-y-2">
            {data.playbook.map((p) => (
              <li key={p.id}>
                <Row play={p} line="In your team playbook" knows={data.knows.has(p.id)} />
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
