// src/components/basketball/ShotHeatMap.tsx
import React from 'react';
import { COURT_LENGTH_FT, COURT_WIDTH_FT, ZONE_LABELS, ZONE_SPOTS, type CourtZone } from '@/lib/court';
import { CourtMarkings, S } from './CourtMarkings';

export interface ZoneShooting {
  zone: string;
  makes: number;
  attempts: number;
  percentage: number;
}

/** Below this, one lucky or unlucky run swings the percentage enough that it
 *  should not be presented with the same confidence as a real sample. */
const LOW_SAMPLE = 10;

/** Blob radius in feet, from the smallest sample to the largest. */
export const MIN_RADIUS_FT = 2.8;
export const MAX_RADIUS_FT = 6;

/**
 * The corner zones sit at x = 1.5ft and 48.5ft on a 50ft court, so their blobs
 * reach well past the sideline. Without this breathing room the viewBox clipped
 * them in half and the corner percentages ran off the edge of the chart.
 * shotHeatMap.test.ts asserts no blob can escape these bounds.
 */
export const PAD_X_FT = 6;
export const PAD_TOP_FT = 4;

/** Area grows with volume, so a 200-attempt zone reads heavier than a 12-attempt one. */
export function blobRadiusFt(attempts: number, maxAttempts: number): number {
  if (maxAttempts <= 0) return MIN_RADIUS_FT;
  return MIN_RADIUS_FT + (MAX_RADIUS_FT - MIN_RADIUS_FT) * Math.sqrt(attempts / maxAttempts);
}

interface Band {
  label: string;
  fill: string;
  text: string;
}

/**
 * Raw shooting percentage bands. Deliberately absolute rather than scaled to
 * the player's own best zone: a relative scale would paint somebody's least-bad
 * zone bright orange even if they shoot 20% everywhere.
 */
function bandFor(percentage: number): Band {
  if (percentage >= 50) return { label: 'Hot', fill: 'rgb(239 68 68)', text: 'text-red-400' };
  if (percentage >= 40) return { label: 'Warm', fill: 'rgb(249 115 22)', text: 'text-orange-400' };
  if (percentage >= 33) return { label: 'Average', fill: 'rgb(245 158 11)', text: 'text-amber-400' };
  if (percentage >= 25) return { label: 'Cool', fill: 'rgb(100 116 139)', text: 'text-slate-400' };
  return { label: 'Cold', fill: 'rgb(59 130 246)', text: 'text-blue-400' };
}

/** One representative percentage per band, used to render the key. */
const LEGEND = [
  { at: 0, range: '<25%' },
  { at: 25, range: '25-33%' },
  { at: 33, range: '33-40%' },
  { at: 40, range: '40-50%' },
  { at: 50, range: '50%+' },
];

export function ShotHeatMap({ zones }: { zones: ZoneShooting[] }) {
  const tracked = zones.filter((z) => z.attempts > 0 && z.zone in ZONE_SPOTS);
  if (tracked.length === 0) return null;

  const maxAttempts = Math.max(...tracked.map((z) => z.attempts));

  return (
    <div>
      <svg
        viewBox={`${-PAD_X_FT * S} ${-PAD_TOP_FT * S} ${(COURT_WIDTH_FT + 2 * PAD_X_FT) * S} ${(COURT_LENGTH_FT + PAD_TOP_FT) * S}`}
        role="img"
        aria-label={`Shooting heat map. ${tracked
          .map((z) => `${ZONE_LABELS[z.zone as CourtZone]}: ${z.percentage}% on ${z.attempts} attempts`)
          .join('. ')}`}
        className="w-full h-auto rounded-2xl bg-amber-950/40 border border-zinc-800"
      >
        <defs>
          {tracked.map((z) => {
            const band = bandFor(z.percentage);
            return (
              <radialGradient key={z.zone} id={`heat-${z.zone}`}>
                <stop offset="0%" stopColor={band.fill} stopOpacity={0.85} />
                <stop offset="55%" stopColor={band.fill} stopOpacity={0.45} />
                <stop offset="100%" stopColor={band.fill} stopOpacity={0} />
              </radialGradient>
            );
          })}
        </defs>

        {/* Blobs sit under the line work so the court stays readable */}
        {tracked.map((z) => {
          const spot = ZONE_SPOTS[z.zone as CourtZone];
          const radiusFt = blobRadiusFt(z.attempts, maxAttempts);
          return (
            <circle
              key={z.zone}
              cx={spot.x * S}
              cy={spot.y * S}
              r={radiusFt * S}
              fill={`url(#heat-${z.zone})`}
            />
          );
        })}

        <CourtMarkings />

        {/* Percentage labels on top of everything */}
        {tracked.map((z) => {
          const spot = ZONE_SPOTS[z.zone as CourtZone];
          const lowSample = z.attempts < LOW_SAMPLE;
          return (
            <g key={z.zone}>
              <text
                x={spot.x * S}
                y={spot.y * S}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={26}
                fontWeight={900}
                fill="white"
                opacity={lowSample ? 0.65 : 1}
                stroke="rgb(9 9 11)"
                strokeWidth={5}
                paintOrder="stroke"
              >
                {Math.round(z.percentage)}%
              </text>
              <text
                x={spot.x * S}
                y={spot.y * S + 24}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={16}
                fontWeight={700}
                fill="rgb(212 212 216)"
                stroke="rgb(9 9 11)"
                strokeWidth={4}
                paintOrder="stroke"
              >
                {z.makes}/{z.attempts}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend, driven off bandFor() so it can never drift from the colours
          actually drawn on the court */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
        {LEGEND.map((l) => (
          <span key={l.at} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: bandFor(l.at).fill }} />
            {bandFor(l.at).label} <span className="text-zinc-500">{l.range}</span>
          </span>
        ))}
      </div>

      {/* Exact numbers under the court, best first */}
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-1.5">
        {[...tracked]
          .sort((a, b) => b.percentage - a.percentage)
          .map((z) => {
            const band = bandFor(z.percentage);
            const lowSample = z.attempts < LOW_SAMPLE;
            return (
              <div key={z.zone} className="flex items-center justify-between gap-2 text-sm">
                <span className="text-zinc-300 truncate">
                  {ZONE_LABELS[z.zone as CourtZone]}
                  {lowSample && <span className="ml-1.5 text-[10px] uppercase text-zinc-500">low sample</span>}
                </span>
                <span className="flex-shrink-0 font-semibold">
                  <span className={band.text}>{z.percentage}%</span>{' '}
                  <span className="text-zinc-500 text-xs">
                    {z.makes}/{z.attempts}
                  </span>
                </span>
              </div>
            );
          })}
      </div>

      {tracked.some((z) => z.attempts < LOW_SAMPLE) && (
        <p className="mt-3 text-xs text-zinc-500">
          Zones marked low sample have under {LOW_SAMPLE} attempts, so the percentage will move a lot with your next
          few shots.
        </p>
      )}
    </div>
  );
}
