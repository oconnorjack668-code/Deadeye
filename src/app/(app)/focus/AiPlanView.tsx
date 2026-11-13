'use client';

import React from 'react';
import Link from 'next/link';
import { BookOpen, CalendarDays, Film, Lock, Sparkles, Target, TrendingUp, X } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import type { FocusAiPlan } from '@/lib/focus/ai';
import type { FocusDrill, FocusGuide, FocusLesson } from '@/lib/focus/plan';

function Label({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
      <Icon className="h-4 w-4" />
      {children}
    </h3>
  );
}

/**
 * The AI week plan. Every item is looked up in the app's own library before it
 * is shown, so a drill deleted since the plan was saved simply drops out
 * rather than showing as a dead link.
 */
export function AiPlanView({
  plan,
  drillsById,
  lessonsById,
  guidesBySlug,
  support,
  onClose,
}: {
  plan: FocusAiPlan;
  drillsById: Map<string, FocusDrill>;
  lessonsById: Map<string, FocusLesson>;
  guidesBySlug: Map<string, FocusGuide>;
  support: string | null;
  onClose: () => void;
}) {
  const film = plan.film.map((f) => ({ ...f, lesson: lessonsById.get(f.lessonId) })).filter((f) => f.lesson);
  const drills = plan.drills.map((d) => ({ ...d, drill: drillsById.get(d.drillId) })).filter((d) => d.drill);
  const reads = plan.reads.map((r) => ({ ...r, guide: guidesBySlug.get(r.guideSlug) })).filter((r) => r.guide);

  return (
    <section className="rounded-2xl border border-orange-600/40 bg-gradient-to-br from-orange-600/15 to-transparent p-4 space-y-5" aria-label="AI week plan">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-300">
            <Sparkles className="h-4 w-4" /> Deadeye Coach · week plan
          </div>
          <p className="mt-1 font-semibold text-white">{plan.summary}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close the plan" className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white">
          <X className="h-5 w-5" />
        </button>
      </div>

      {support && (
        <Alert variant="warning" title="You are not on your own">
          {support}
        </Alert>
      )}

      {plan.focus.length > 0 && (
        <ul className="space-y-1">
          {plan.focus.map((f) => (
            <li key={f.label} className="text-sm text-zinc-300">
              <span className="font-semibold text-white">{f.label}: </span>
              {f.lookFor}
            </li>
          ))}
        </ul>
      )}

      {plan.week.length > 0 && (
        <div>
          <Label icon={CalendarDays}>The week</Label>
          <ol className="space-y-1.5">
            {plan.week.map((line, i) => (
              <li key={i} className="rounded-xl bg-zinc-950/60 px-3 py-2 text-sm text-zinc-200">
                {line}
              </li>
            ))}
          </ol>
        </div>
      )}

      {film.length > 0 && (
        <div>
          <Label icon={Film}>Film and IQ</Label>
          <ul className="space-y-2">
            {film.map(({ lesson: l, watchFor }) => (
              <li key={l!.id} className="rounded-xl bg-zinc-950/60 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-white">{l!.title}</div>
                  {!l!.canOpen && (
                    <Badge variant="outline" className="flex-shrink-0 gap-1 text-xs">
                      <Lock className="h-3 w-3" /> Pro
                    </Badge>
                  )}
                </div>
                {watchFor && (
                  <p className="mt-1 text-sm text-zinc-300">
                    <span className="text-zinc-500">Watch for: </span>
                    {watchFor}
                  </p>
                )}
                <div className="mt-2 flex flex-wrap gap-2">
                  <Link href={`/study/${l!.topicId}#lesson-${l!.id}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800">
                    <Film className="h-4 w-4" /> Watch
                  </Link>
                  {l!.questionCount > 0 && l!.canOpen && (
                    <Link href={`/study/${l!.topicId}/quiz?item=${l!.id}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-zinc-700 px-3 text-sm font-semibold text-zinc-200 hover:bg-zinc-800">
                      Quiz ({l!.questionCount})
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {drills.length > 0 && (
        <div>
          <Label icon={Target}>Drills</Label>
          <ul className="space-y-2">
            {drills.map(({ drill: d, why, dose }) => (
              <li key={d!.id}>
                <Link href={`/drills/${d!.slug}`} className="block rounded-xl bg-zinc-950/60 p-3 hover:bg-zinc-900">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-white">{d!.name}</span>
                    {dose && <span className="flex-shrink-0 text-sm font-semibold text-orange-300">{dose}</span>}
                  </div>
                  {why && <p className="mt-1 text-sm text-zinc-300">{why}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {reads.length > 0 && (
        <div>
          <Label icon={BookOpen}>Read</Label>
          <ul className="space-y-2">
            {reads.map(({ guide: g, why }) => (
              <li key={g!.slug}>
                <Link href={`/guides/${g!.slug}`} className="block rounded-xl bg-zinc-950/60 p-3 hover:bg-zinc-900">
                  <span className="font-semibold text-white">{g!.title}</span>
                  {why && <p className="mt-1 text-sm text-zinc-300">{why}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {plan.measure && (
        <p className="flex items-start gap-2 text-sm text-zinc-300">
          <TrendingUp className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
          <span>
            <span className="font-semibold text-white">How you will know: </span>
            {plan.measure}
          </span>
        </p>
      )}

      <p className="text-xs text-zinc-500">
        Saved. It is also in{' '}
        <Link href="/ai-coach" className="underline">
          AI Coach
        </Link>
        . The AI can be wrong: if something does not fit, skip it.
      </p>
    </section>
  );
}
