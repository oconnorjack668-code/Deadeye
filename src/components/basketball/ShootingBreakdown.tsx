// src/components/basketball/ShootingBreakdown.tsx
// What one tracked session says about the shooting, beyond the total: the
// shots in order, the best run, how the end compared with the start, which
// way the misses went and how clean the makes were. Shown in the tracker's
// review and on the saved session. Presentational only, so it renders on the
// server for the session page and in the browser for the review.
import React from 'react';
import { halves, makeKinds, missSides, missTendency, pct, streaks } from '@/lib/video/shotStats';
import type { SavedShot } from '@/lib/video/trackedShots';

export function ShootingBreakdown({ shots, className = '' }: { shots: SavedShot[]; className?: string }) {
  if (shots.length === 0) return null;
  const made = shots.map((s) => s.made);
  const run = streaks(made);
  const split = halves(shots);
  const sides = missSides(shots);
  const tendency = missTendency(sides);
  const kinds = makeKinds(shots);
  // Sides and clean makes need the tracker's own calls, which sessions saved
  // before 1 Nov 2026 do not have
  const hasCalls = shots.some((s) => s.called !== undefined);
  const wide = sides.left + sides.right;

  return (
    <div className={`rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 ${className}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Shot by shot</div>
      <div className="mt-2 flex flex-wrap gap-1" aria-label={`${shots.length} shots in order, makes in green`}>
        {shots.map((s, i) => (
          <span key={i} className={`h-3 w-3 rounded-full ${s.made ? 'bg-emerald-400' : 'bg-red-400/80'}`} title={`#${i + 1} ${s.made ? 'make' : 'miss'}`} />
        ))}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-zinc-500">Best run</dt>
          <dd className="text-xl font-black tabular-nums text-white">
            {run.best} <span className="text-sm font-semibold text-zinc-400">in a row</span>
          </dd>
        </div>
        {split && (
          <div>
            <dt className="text-xs text-zinc-500">Start → finish</dt>
            <dd className="text-xl font-black tabular-nums text-white">
              {pct(split.first.makes, split.first.attempts)}% → {pct(split.second.makes, split.second.attempts)}%
            </dd>
          </div>
        )}
        {hasCalls && kinds.clean + kinds.rim > 0 && (
          <div>
            <dt className="text-xs text-zinc-500">Clean makes</dt>
            <dd className="text-xl font-black tabular-nums text-emerald-400">
              {kinds.clean}
              <span className="text-sm font-semibold text-zinc-400"> of {kinds.clean + kinds.rim}</span>
            </dd>
          </div>
        )}
        {hasCalls && wide > 0 && (
          <div>
            <dt className="text-xs text-zinc-500">Wide misses</dt>
            <dd className="text-xl font-black tabular-nums text-white">
              {sides.left} <span className="text-sm font-semibold text-zinc-400">left</span> · {sides.right}{' '}
              <span className="text-sm font-semibold text-zinc-400">right</span>
            </dd>
          </div>
        )}
      </dl>

      {split && split.second.attempts > 0 && pct(split.first.makes, split.first.attempts) - pct(split.second.makes, split.second.attempts) >= 15 && (
        <p className="mt-3 text-sm text-zinc-400">
          Your second half dropped off. Tired legs show up as short misses: worth a rest between rounds, or ending on a make.
        </p>
      )}
      {tendency && (
        <p className="mt-2 text-sm text-zinc-400">
          Most wide misses went {tendency}, as the camera saw them. Filmed from behind you, that is your {tendency} too; from in front, it is
          the other way.
        </p>
      )}
      {hasCalls && kinds.rim > 0 && (
        <p className="mt-2 text-sm text-zinc-500">A clean make went through without the ball being seen bouncing off the ring first.</p>
      )}
    </div>
  );
}
