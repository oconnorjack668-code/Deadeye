// src/components/basketball/ShotHeatMap.tsx
// The shot chart, v2 (docs/agent-os/design/2026-11-22-polish.md, "Shot chart
// redesign"): hardwood court, the 13 real zones softly filled on the classic
// scale, one small chip per zone. Geometry lives in src/lib/shotChart.ts so the
// share cards draw the same chart. CourtMarkings stays for the logger.
import React from 'react';
import { BANDS, sessionCrop, shotChartLayout, type ChartZoneInput, type Chip } from '@/lib/shotChart';

export interface ZoneShooting {
  zone: string;
  makes: number;
  attempts: number;
  percentage?: number;
}

/** Below this, one lucky or unlucky run swings the percentage a lot. */
const LOW_SAMPLE = 10;

const f = (n: number) => Math.round(n * 10) / 10;

function ChipMark({ c, fp, fs, gap, k }: { c: Chip; fp: number; fs: number; gap: number; k: number }) {
  const x = c.cx - c.w / 2;
  const y = c.cy - c.h / 2;
  return (
    <g>
      {c.pointer && <path d={`M ${f(c.cx - 7)} ${f(y + 1)} L ${f(c.cx)} ${f(y - 10)} L ${f(c.cx + 7)} ${f(y + 1)} Z`} fill={c.band.edge} />}
      <rect
        x={f(x)}
        y={f(y)}
        width={f(c.w)}
        height={f(c.h)}
        rx={f(c.h * 0.32)}
        fill="#09090b"
        fillOpacity={0.9}
        stroke={c.band.edge}
        strokeOpacity={0.85}
        strokeWidth={f(1.3 / k)}
      />
      <text x={f(c.cx)} y={f(c.cy + fp * 0.36)} textAnchor="middle" style={{ fontVariantNumeric: 'tabular-nums' }}>
        <tspan fontWeight={900} fontSize={f(fp)} fill="#fff">
          {c.pct}%
        </tspan>
        {!c.solo && (
          <tspan dx={f(gap)} fontWeight={600} fontSize={f(fs)} fill="#d4d4d8">
            {c.makes}/{c.attempts}
          </tspan>
        )}
      </text>
    </g>
  );
}

/** The court with its zones and chips. `session` crops it to the part one session uses. */
export function ShotChart({
  zones,
  id = 'sc',
  variant = 'full',
  renderW,
  className = 'block h-auto w-full',
}: {
  zones: readonly ChartZoneInput[];
  id?: string;
  variant?: 'full' | 'session';
  /** About the width it shows at, in px, so the chips come out at 14 px (16 on a session). */
  renderW?: number;
  className?: string;
}) {
  const layout = shotChartLayout(
    zones,
    variant === 'session'
      ? { id, renderW: renderW ?? 318, pctPx: 16, subPx: 12, ...sessionCrop(zones) }
      : { id, renderW: renderW ?? 310, pctPx: 14, subPx: 12 }
  );
  const { x, y, w, h } = layout.viewBox;
  return (
    <svg viewBox={`${x} ${y} ${w} ${h}`} role="img" aria-label={layout.ariaLabel} className={className}>
      {/* Our own numeric geometry only: no player text goes into this string */}
      <g dangerouslySetInnerHTML={{ __html: layout.courtMarkup }} />
      <g fontFamily="var(--font-geist-sans), system-ui, sans-serif" aria-hidden="true">
        {layout.chips.map((c) => (
          <ChipMark key={c.zone} c={c} fp={layout.fontPct} fs={layout.fontSub} gap={layout.gap} k={layout.k} />
        ))}
      </g>
    </svg>
  );
}

/** The five-band key, with the words: colour is never the only cue. */
export function ShotChartKey() {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-zinc-300">
      {BANDS.map((b) => (
        <span key={b.id} className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-[4px] ring-1 ring-white/20" style={{ backgroundColor: b.fill }} />
          {b.word} <span className="text-zinc-400">{b.range}</span>
        </span>
      ))}
    </div>
  );
}

/** The dashboard's shot chart card body: chart, key, and the exact numbers best first. */
export function ShotHeatMap({ zones }: { zones: ZoneShooting[] }) {
  const layout = shotChartLayout(zones);
  const tracked = layout.zones;
  if (tracked.length === 0) return null;

  return (
    <div>
      <ShotChart zones={zones} id="dash" className="block h-auto w-full rounded-2xl border border-zinc-800" />

      <div className="mt-3">
        <ShotChartKey />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-x-5 gap-y-1.5 sm:grid-cols-2">
        {[...tracked]
          .sort((a, b) => b.pct - a.pct || b.attempts - a.attempts)
          .map((z) => (
            <div key={z.zone} className="flex items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-zinc-300">
                <span className="h-2.5 w-2.5 flex-shrink-0 rounded-[3px]" style={{ backgroundColor: z.band.fill }} />
                <span className="truncate">{z.label}</span>
                {z.attempts < LOW_SAMPLE && <span className="text-xs text-zinc-500">low sample</span>}
              </span>
              <span className="flex-shrink-0 font-semibold tabular-nums">
                <span className={z.band.text}>{z.pct}%</span>{' '}
                <span className="text-xs text-zinc-400">
                  {z.makes}/{z.attempts}
                </span>
              </span>
            </div>
          ))}
      </div>

      {tracked.some((z) => z.attempts < LOW_SAMPLE) && (
        <p className="mt-3 text-xs text-zinc-500">
          Zones marked low sample have under {LOW_SAMPLE} attempts, so the percentage will move a lot with your next few shots.
        </p>
      )}
    </div>
  );
}
