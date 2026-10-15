// src/app/(app)/video/FormTrends.tsx
// What has actually changed across a run of form checks.
//
// FormCheck has been saving every result to video_analyses all along and
// nothing read it back, so a player could do twenty checks and never find out
// whether their elbow had moved. A single reading is a number; the run is the
// only thing that answers the question they are really asking.
import React from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { TrendingUp } from 'lucide-react';
import { formTrends, isNotable, trendSentence, MIN_CHECKS, type FormCheckRecord } from '@/lib/video/formTrend';

/** A line, drawn in the values' own range so small real moves stay visible. */
function Sparkline({ values }: { values: number[] }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((v, i) => {
      const x = (i / Math.max(1, values.length - 1)) * 100;
      // SVG y grows downward, so the highest value belongs at the top
      const y = 22 - ((v - min) / span) * 20;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <svg viewBox="0 0 100 24" preserveAspectRatio="none" className="h-6 w-24 flex-shrink-0" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export function FormTrends({ records }: { records: FormCheckRecord[] }) {
  const trends = formTrends(records);

  if (!trends) {
    // Said rather than hidden: a player who has done two checks should know
    // the trend is coming, not wonder whether the feature exists.
    const done = records.length;
    return (
      <Card className="mt-6 border-zinc-800 bg-zinc-900/70">
        <CardContent className="p-5">
          <h2 className="flex items-center gap-2 font-bold text-white">
            <TrendingUp className="h-4 w-4 text-cyan-400" /> Your form over time
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            {done === 0
              ? 'Run a form check and your release angle, elbow, knee bend and release time are saved. After a few, this shows what has actually changed.'
              : `${MIN_CHECKS - done} more form ${MIN_CHECKS - done === 1 ? 'check' : 'checks'} and this will show what has changed. Fewer than ${MIN_CHECKS} cannot tell a trend from a bad day.`}
          </p>
        </CardContent>
      </Card>
    );
  }

  const notable = trends.filter(isNotable);

  return (
    <Card className="mt-6 border-zinc-800 bg-zinc-900/70">
      <CardContent className="p-5">
        <h2 className="flex items-center gap-2 font-bold text-white">
          <TrendingUp className="h-4 w-4 text-cyan-400" /> Your form over time
        </h2>
        <p className="mt-1 text-xs text-zinc-500">Across your last {trends[0].points.length} form checks</p>

        <div className="mt-4 space-y-3">
          {trends.map((t) => {
            const round = (n: number) => (t.key === 'releaseTimeMs' ? Math.round(n) : Math.round(n * 10) / 10);
            const moved = isNotable(t);
            return (
              <div key={t.key} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm text-zinc-200">{t.label}</div>
                  <div className="text-xs text-zinc-500 tabular-nums">
                    {round(t.first)}
                    {t.unit} → {round(t.last)}
                    {t.unit}
                  </div>
                </div>
                <div className={moved ? 'text-cyan-400' : 'text-zinc-600'}>
                  <Sparkline values={t.points.map((p) => p.value)} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Only what moved enough to be worth saying. A trend reported on noise
            has a player change something that was never wrong. */}
        {notable.length > 0 ? (
          <ul className="mt-4 space-y-1 border-t border-zinc-800 pt-3 text-sm text-zinc-300">
            {notable.map((t) => (
              <li key={t.key}>{trendSentence(t)}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 border-t border-zinc-800 pt-3 text-sm text-zinc-400">
            Nothing has moved more than your shot normally varies, which is its own answer: your stroke is
            repeating.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
