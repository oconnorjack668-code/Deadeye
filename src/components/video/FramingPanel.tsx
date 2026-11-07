// src/components/video/FramingPanel.tsx
'use client';

import React from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import { framingVerdict, type FramingCheck, type FramingCheckId } from '@/lib/video/framing';

/**
 * One light for "is this set up well", with the reasons underneath when it is
 * not. See src/lib/video/framing.ts. Advice, never a block: a player filming
 * a small outdoor hoop from the only spot there is still gets to start.
 */
export function FramingPanel({
  checks: all,
  shownElsewhere = [],
}: {
  checks: FramingCheck[] | null;
  /** Checks with their own warning on the same screen, left out here. */
  shownElsewhere?: FramingCheckId[];
}) {
  if (!all) {
    return <p className="text-sm text-zinc-500">Checking the picture…</p>;
  }
  const checks = all.filter((c) => !shownElsewhere.includes(c.id));
  const good = framingVerdict(checks) === 'good';
  // One of the checks shown elsewhere failed, so "good" would contradict it
  const otherwise = all.some((c) => !c.ok && shownElsewhere.includes(c.id));
  const problems = checks.filter((c) => !c.ok);
  return (
    <div className={`rounded-xl border p-3 text-sm ${good ? 'border-emerald-600/40 bg-emerald-600/10' : 'border-amber-500/40 bg-amber-500/10'}`}>
      <p className={`flex items-center gap-2 font-semibold ${good ? 'text-emerald-300' : 'text-amber-200'}`}>
        {good ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4 text-amber-400" />}
        {good
          ? otherwise
            ? 'Otherwise a good set-up'
            : 'Good set-up for tracking'
          : `${problems.length === 1 ? 'One thing' : `${problems.length} things`} to fix for the best count`}
      </p>
      {!good && (
        <ul className="mt-2 space-y-1.5 text-xs text-amber-100/90">
          {problems.map((c) => (
            <li key={c.id}>
              <span className="font-semibold">{c.label}.</span> {c.fix}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
