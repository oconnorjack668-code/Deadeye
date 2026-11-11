// src/components/video/TrackerHud.tsx
'use client';

import React from 'react';
import { Crosshair, Flame, Maximize2, Minimize2, Pause } from 'lucide-react';
import { ISSUE_TEXT, type HealthReading } from '@/lib/video/liveHealth';
import type { DrillProgress } from '@/lib/video/drillModes';
import type { Streaks } from '@/lib/video/shotStats';
import { heatLevel } from '@/lib/video/overlayTimeline';
import { callSpot, heatLabel } from '@/lib/video/overlayArt';
import type { Rim } from '@/lib/video/shotDetector';
import { StreakFlame } from './StreakFlame';

export interface ShotFlash {
  id: number;
  made: boolean;
  confident: boolean;
  makes: number;
  attempts: number;
  /** Makes in a row after this call. */
  streak: number;
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/**
 * The overlay on the live picture. The player is usually several metres away
 * with the phone on a tripod, so everything here answers one of three
 * questions at a glance from the arc: what's the score, did that one count,
 * and is it still working. Only the two buttons take touches; the rest lets
 * taps through to nothing.
 */
export function TrackerHud({
  makes,
  attempts,
  clockMs,
  paused,
  streak,
  recent,
  health,
  flash,
  drill,
  theatre,
  onToggleTheatre,
  onFixRim,
  canFixRim,
  banner = null,
  rim = null,
}: {
  makes: number;
  attempts: number;
  /** Time spent shooting, long breaks left out. */
  clockMs: number;
  /** Nothing has happened for a while: the clock is holding. */
  paused: boolean;
  streak: Streaks;
  recent: Array<{ id: number; made: boolean }>;
  health: HealthReading;
  flash: ShotFlash | null;
  drill: DrillProgress | null;
  theatre: boolean;
  onToggleTheatre: () => void;
  /** Offered when the camera has moved (canFixRim). */
  onFixRim: () => void;
  canFixRim: boolean;
  /** A milestone just reached (overlayTimeline's milestoneFor), keyed so each one animates afresh. */
  banner?: { id: number; label: string } | null;
  /** The rim in use, for putting the make/miss call beside it. The HUD box has the video's shape, so its fractions are the box's. */
  rim?: Rim | null;
}) {
  const pct = attempts ? Math.round((makes / attempts) * 100) : 0;
  const issues = health.issues;
  const heat = heatLevel(streak.current);
  const hotLabel = heatLabel(streak.current);
  const spot = callSpot(rim);

  return (
    <>
      {/* Scrim so the readout stays legible against a bright gym or sky */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/80 to-transparent" />

      {/* Primary readout: sized to be read from the three-point line */}
      <div className="pointer-events-none absolute left-3 top-2 text-white" aria-live="polite" aria-atomic="true">
        <div className="flex items-end gap-2">
          <span className="text-5xl sm:text-6xl font-black leading-none tabular-nums drop-shadow-lg">
            {makes}
            <span className="text-3xl sm:text-4xl text-zinc-300">/{attempts}</span>
          </span>
          <span className="mb-1 text-2xl sm:text-3xl font-black leading-none text-orange-400 tabular-nums drop-shadow-lg">{pct}%</span>
          {/* On a hot streak a flame stands beside the score, never over the numbers */}
          <StreakFlame heat={heat} className="h-12 w-10 sm:h-14 sm:w-12" />
        </div>
        <div className="mt-1 flex items-center gap-2 text-sm font-semibold tabular-nums text-zinc-300 drop-shadow">
          {paused && <Pause className="h-3.5 w-3.5" aria-label="Paused" />}
          {clock(clockMs)}
          {hotLabel && (
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold uppercase text-white ${heat > 1 ? 'bg-red-600' : 'bg-orange-600'}`}
            >
              <Flame className="h-3.5 w-3.5" aria-hidden="true" /> {hotLabel}
            </span>
          )}
        </div>
        {/* White in both themes: it sits on footage, not on the page */}
        {banner && (
          <div
            key={banner.id}
            className="deadeye-banner mt-2 flex w-fit items-center gap-2 rounded-full bg-[#fff] px-3 py-1 text-sm font-black uppercase text-[#09090b] shadow-lg"
          >
            <span className="h-2 w-2 rounded-full bg-orange-500" aria-hidden="true" />
            {banner.label}
          </div>
        )}
      </div>

      {/* Is it working? Calm unless something is wrong, and then it says what */}
      <div className="absolute right-3 top-3 flex max-w-[60%] flex-col items-end gap-1.5">
        {issues.length === 0 ? (
          <div
            className={`pointer-events-none flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold backdrop-blur-sm ${
              health.ball ? 'bg-emerald-500/90 text-white' : 'bg-black/55 text-zinc-100'
            }`}
          >
            <span className="h-2 w-2 rounded-full bg-current" />
            {health.ball ? 'Ball tracked' : 'Watching the hoop'}
          </div>
        ) : (
          issues.map((issue) => (
            <div key={issue} className="flex items-center gap-1.5 rounded-full bg-amber-500/95 py-1 pl-2.5 pr-1 text-xs font-bold text-zinc-950" title={ISSUE_TEXT[issue].tip}>
              <span className="h-2 w-2 rounded-full bg-current" />
              {ISSUE_TEXT[issue].short}
              {issue === 'moved' && canFixRim ? (
                <button type="button" onClick={onFixRim} className="ml-1 flex min-h-8 items-center gap-1 rounded-full bg-zinc-950 px-2.5 text-amber-300">
                  <Crosshair className="h-3.5 w-3.5" /> Fix rim
                </button>
              ) : (
                <span className="pr-1.5" />
              )}
            </div>
          ))
        )}
      </div>

      {/* Drill progress: where to shoot from, or how far to go */}
      {drill && (
        <div className="pointer-events-none absolute bottom-9 left-3 right-16">
          <div className="mb-1 text-center text-lg font-black text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">{drill.label}</div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/50">
            <div className="h-full bg-orange-500" style={{ width: `${Math.round(drill.fraction * 100)}%` }} />
          </div>
        </div>
      )}

      {/* Last 8 results, newest on the right */}
      {recent.length > 0 && (
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-1.5">
          {recent.slice(-8).map((s) => (
            <span key={s.id} className={`h-2.5 w-2.5 rounded-full ring-1 ring-black/40 ${s.made ? 'bg-emerald-400' : 'bg-red-400'}`} />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={onToggleTheatre}
        aria-label={theatre ? 'Leave full screen' : 'Full screen'}
        className="absolute bottom-1.5 right-1.5 flex h-11 w-11 items-center justify-center rounded-xl bg-black/50 text-white backdrop-blur-sm"
      >
        {theatre ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
      </button>

      {/* Confirmation a shot registered, read from the arc rather than up
          close: a tinted wash of the whole frame carries at a distance, and
          the word stands beside the rim (callSpot), where the ball went,
          leaving the hoop clear. Centred when there is no room beside it. */}
      {flash && (
        <div
          key={flash.id}
          className={`pointer-events-none absolute inset-0 deadeye-flash ${flash.made ? 'bg-emerald-500/25' : 'bg-red-500/20'} ${
            spot ? '' : 'flex flex-col items-center justify-center'
          }`}
          style={spot ? { transformOrigin: `${spot.x * 100}% ${spot.y * 100}%` } : undefined}
        >
          <div
            className={spot ? `absolute flex -translate-y-1/2 flex-col ${spot.side === 'right' ? 'items-start text-left' : 'items-end text-right'}` : 'flex flex-col items-center'}
            // The text keeps its size while the picture shrinks, so in the small
            // inline view it is also held clear of the status pill and the dots
            style={spot ? { top: `clamp(5.5rem, ${spot.y * 100}%, calc(100% - 4rem))`, ...(spot.side === 'right' ? { left: `${spot.x * 100}%` } : { right: `${(1 - spot.x) * 100}%` }) } : undefined}
          >
            <span
              className={`font-black uppercase leading-none tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] ${
                spot ? 'text-5xl sm:text-6xl' : 'text-6xl sm:text-7xl'
              } ${flash.made ? 'text-emerald-300' : 'text-red-300'}`}
            >
              {flash.made ? 'Make' : 'Miss'}
            </span>
            <span className={`mt-1 font-black tabular-nums text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] ${spot ? 'text-xl' : 'text-2xl'}`}>
              {flash.makes}/{flash.attempts}
            </span>
            {flash.made && flash.streak >= 3 && (
              <span className="mt-1 flex items-center gap-1 text-base font-black uppercase tabular-nums text-orange-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                <Flame className="h-4 w-4" aria-hidden="true" /> {flash.streak} in a row
              </span>
            )}
            {!flash.confident && (
              <span className="mt-1 rounded-full bg-amber-500/90 px-2.5 py-0.5 text-xs font-bold uppercase text-zinc-950">check this one</span>
            )}
          </div>
        </div>
      )}
    </>
  );
}
