// src/lib/shotChart.ts
// The shot chart, v2 (approved 2026-11-22, docs/agent-os/design/2026-11-22-polish.md
// "Shot chart redesign"): a dark hardwood half court with the 13 real zones of
// classifyZone() softly filled on the classic cold-to-hot scale, and one small
// chip per zone. Pure geometry and markup, so the app (ShotHeatMap) and the
// share cards (next/og) draw the same chart.
//
// Units: 1 ft = 10 (S). Hoop at the top, as in the logger.
import {
  CORNER_DEPTH_FT,
  CORNER_THREE_X_FT,
  COURT_LENGTH_FT,
  COURT_WIDTH_FT,
  DEEP_THREE_FT,
  FT_CIRCLE_RADIUS_FT,
  HOOP,
  PAINT,
  THREE_RADIUS_FT,
  ZONE_LABELS,
  ZONE_SPOTS,
  type CourtZone,
} from '@/lib/court';

const S = 10;
const W = COURT_WIDTH_FT * S;
const L = COURT_LENGTH_FT * S;
const HX = HOOP.x * S;
const HY = HOOP.y * S;
const CENTER_DEG = 22;

export interface ChartZoneInput {
  zone: string;
  makes: number;
  attempts: number;
}

export interface Band {
  id: 'cold' | 'cool' | 'avg' | 'warm' | 'hot';
  word: string;
  range: string;
  /** Zone fill and key swatch */
  fill: string;
  /** Chip edge */
  edge: string;
  /** Tailwind class for the percent in the list under the chart */
  text: string;
}

/**
 * Classic scale (founder, 2026-11-22): blue-600 cold, sky-500, yellow-500,
 * orange-500, red-600 hot. Absolute bands, never scaled to the player's best
 * zone: a relative scale would paint a 20%-everywhere shooter's least-bad zone hot.
 */
export const BANDS: readonly Band[] = [
  { id: 'cold', word: 'Cold', range: '<25%', fill: '#2563eb', edge: '#93c5fd', text: 'text-blue-300' },
  { id: 'cool', word: 'Cool', range: '25-33%', fill: '#0ea5e9', edge: '#7dd3fc', text: 'text-sky-300' },
  { id: 'avg', word: 'Average', range: '33-40%', fill: '#eab308', edge: '#fde047', text: 'text-yellow-300' },
  { id: 'warm', word: 'Warm', range: '40-50%', fill: '#f97316', edge: '#fdba74', text: 'text-orange-300' },
  { id: 'hot', word: 'Hot', range: '50%+', fill: '#dc2626', edge: '#fca5a5', text: 'text-red-300' },
];

export const zonePct = (z: { makes: number; attempts: number }) => (z.attempts > 0 ? Math.round((z.makes / z.attempts) * 100) : 0);

export function bandFor(pct: number): Band {
  return BANDS[pct >= 50 ? 4 : pct >= 40 ? 3 : pct >= 33 ? 2 : pct >= 25 ? 1 : 0];
}

const isZone = (z: string): z is CourtZone => Object.prototype.hasOwnProperty.call(ZONE_SPOTS, z);
const isCornerThree = (z: string) => z === 'three-left-corner' || z === 'three-right-corner';

/** Where each zone's chip sits (feet), tuned so neighbours clear each other. Corner threes are placed on their own. */
const CHIP_AT: Record<Exclude<CourtZone, 'three-left-corner' | 'three-right-corner'>, [number, number]> = {
  paint: [25, 8.5],
  'free-throw': [25, 21.8],
  'mid-center': [25, 26.9],
  'mid-left-wing': [9.8, 17.5],
  'mid-right-wing': [40.2, 17.5],
  'mid-left-corner': [10, 7],
  'mid-right-corner': [40, 7],
  'three-top': [25, 32.2],
  'three-left-wing': [8, 26],
  'three-right-wing': [42, 26],
  'deep-three': [25, 38.5],
};
/** Height (units) a chip moved below its zone sits at: under the three-point arc. */
const BELOW_Y = 348;

export interface ChartOptions {
  /** Prefix for SVG ids, unique on the page (letters, digits, dashes). */
  id?: string;
  /** Width in px the chart is shown at, so chips are sized in real pixels. */
  renderW?: number;
  /** Percent size in px; makes/attempts in px (12 px floor, docs/design.md). */
  pctPx?: number;
  subPx?: number;
  /** Crop in feet: shown from yMin to yMax, x in units. */
  yMin?: number | null;
  yMax?: number;
  xRange?: [number, number] | null;
  /** Zones whose chip sits below the zone with a pointer, so the lit zone stays whole. */
  below?: string[];
}

export interface Chip {
  zone: CourtZone;
  label: string;
  pct: number;
  makes: number;
  attempts: number;
  band: Band;
  /** Percent only (corner threes, and the smaller of two chips that would overlap). */
  solo: boolean;
  /** Pointer up to the zone (chip moved below it). */
  pointer: boolean;
  /** Centre and size, in chart units. */
  cx: number;
  cy: number;
  w: number;
  h: number;
}

export interface ShotChartLayout {
  viewBox: { x: number; y: number; w: number; h: number };
  /** Units per px at renderW, the other way round: px per unit. */
  k: number;
  /** Font sizes and the gap between percent and makes/attempts, in units. */
  fontPct: number;
  fontSub: number;
  gap: number;
  /** Every zone with shots, in drawing order. */
  zones: Chip[];
  chips: Chip[];
  /** The court and zone fills, without the chips (no text: next/og cannot draw SVG text). */
  courtMarkup: string;
  /** Screen-reader summary. */
  ariaLabel: string;
}

const f = (n: number) => Math.round(n * 10) / 10;
const pol = (r: number, deg: number): [number, number] => [HX + r * Math.sin((deg * Math.PI) / 180), HY + r * Math.cos((deg * Math.PI) / 180)];

function overlaps(a: Chip, b: Chip): boolean {
  return Math.abs(a.cx - b.cx) * 2 < a.w + b.w && Math.abs(a.cy - b.cy) * 2 < a.h + b.h;
}

/** Lays out the chart: crop, chip sizes and places, and the court markup. */
export function shotChartLayout(input: readonly ChartZoneInput[], opts: ChartOptions = {}): ShotChartLayout {
  const id = (opts.id ?? 'sc').replace(/[^a-zA-Z0-9-]/g, '') || 'sc';
  const renderW = opts.renderW ?? 320;
  const pctPx = opts.pctPx ?? 14;
  const subPx = Math.max(12, opts.subPx ?? 12);
  const yMax = opts.yMax ?? COURT_LENGTH_FT;
  const below = new Set(opts.below ?? []);

  // One entry per known zone with shots; unknown zones (e.g. "all-around") have no place on the court
  const merged = new Map<CourtZone, { makes: number; attempts: number }>();
  for (const z of input) {
    if (!isZone(z.zone) || !(z.attempts > 0)) continue;
    const m = merged.get(z.zone) ?? { makes: 0, attempts: 0 };
    m.makes += Math.max(0, Math.min(z.makes, z.attempts));
    m.attempts += z.attempts;
    merged.set(z.zone, m);
  }

  const x0 = opts.xRange ? opts.xRange[0] : -28;
  const x1 = opts.xRange ? opts.xRange[1] : W + 28;
  const y0 = (opts.yMin ?? -3) * S;
  const k = renderW / (x1 - x0);
  const fp = pctPx / k;
  const fs = subPx / k;
  const h = Math.max(fp, fs) + fp * 0.85;
  const gap = fp * 0.38;
  const padX = fp * 0.62;
  const widthOf = (c: Pick<Chip, 'pct' | 'makes' | 'attempts' | 'solo'>) => {
    const wPct = (`${c.pct}`.length * 0.62 + 0.9) * fp;
    const wSub = `${c.makes}/${c.attempts}`.length * 0.56 * fs;
    return (c.solo ? wPct : wPct + gap + wSub) + padX * 2;
  };

  const zones: Chip[] = [...merged.entries()].map(([zone, t]) => {
    const pct = zonePct(t);
    const solo = isCornerThree(zone);
    const pointer = below.has(zone) && !solo;
    const base = { zone, label: ZONE_LABELS[zone], pct, makes: t.makes, attempts: t.attempts, band: bandFor(pct), solo, pointer };
    const w = widthOf(base);
    let cx: number;
    let cy: number;
    if (zone === 'three-left-corner') [cx, cy] = [3 + w / 2, 108];
    else if (zone === 'three-right-corner') [cx, cy] = [W - 3 - w / 2, 108];
    else {
      const [ax, ay] = CHIP_AT[zone];
      [cx, cy] = [ax * S, pointer ? BELOW_Y : ay * S];
    }
    return { ...base, cx, cy, w, h };
  });

  // Founder's rule: when two chips overlap, the zone with fewer shots drops to the percent only
  const chips = zones.map((c) => ({ ...c }));
  for (let i = 0; i < chips.length; i++) {
    for (let j = i + 1; j < chips.length; j++) {
      const [a, b] = [chips[i], chips[j]];
      if (!overlaps(a, b)) continue;
      const smaller = a.attempts < b.attempts || (a.attempts === b.attempts && a.zone > b.zone) ? a : b;
      if (smaller.solo) continue;
      const old = smaller.w;
      smaller.solo = true;
      smaller.w = widthOf(smaller);
      // Corner chips keep hugging the sideline
      if (smaller.zone === 'three-left-corner') smaller.cx -= (old - smaller.w) / 2;
      if (smaller.zone === 'three-right-corner') smaller.cx += (old - smaller.w) / 2;
    }
  }
  // A corner three chip still touching its mid baseline neighbour steps down the sideline, clear of it
  for (const c of chips) {
    if (!isCornerThree(c.zone)) continue;
    for (const o of chips) {
      if (o !== c && overlaps(c, o)) c.cy = o.cy + (c.h + o.h) / 2 + c.h * 0.15;
    }
  }

  const fh = yMax * S - y0;
  const ariaLabel = `Shot chart. ${
    zones.length ? zones.map((z) => `${z.label}: ${z.pct}% on ${z.attempts} ${z.attempts === 1 ? 'shot' : 'shots'}`).join('. ') : 'No shots yet'
  }.`;

  return {
    viewBox: { x: x0, y: y0, w: x1 - x0, h: fh },
    k,
    fontPct: fp,
    fontSub: fs,
    gap,
    zones,
    chips,
    courtMarkup: courtMarkup(id, merged, { x0, x1, y0, yMax, k, masked: yMax < COURT_LENGTH_FT || !!opts.xRange, fadeTop: opts.yMin != null }),
    ariaLabel,
  };
}

const BASE = '#241a12';
const ZONE_OPACITY = 0.78;

function courtMarkup(
  id: string,
  data: Map<CourtZone, { makes: number; attempts: number }>,
  v: { x0: number; x1: number; y0: number; yMax: number; k: number; masked: boolean; fadeTop: boolean }
): string {
  const { x0, x1, y0, yMax, k, masked, fadeTop } = v;
  const R3 = THREE_RADIUS_FT * S;
  const C3 = CORNER_THREE_X_FT * S;
  const CD = CORNER_DEPTH_FT * S;
  const PL = PAINT.left * S;
  const PR = PAINT.right * S;
  const PD = PAINT.depth * S;
  const FTR = FT_CIRCLE_RADIUS_FT * S;
  const DEEP = DEEP_THREE_FT * S;

  const circ = (cx: number, cy: number, r: number) => `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
  const A3 = `M ${C3} 0 L ${C3} ${CD} A ${R3} ${R3} 0 0 0 ${W - C3} ${CD} L ${W - C3} 0 Z`;
  const [wl, wr] = [pol(700, -CENTER_DEG), pol(700, CENTER_DEG)];
  const wedge = `M ${HX} ${HY} L ${f(wl[0])} ${f(wl[1])} L ${f(wr[0])} ${f(wr[1])} Z`;
  type Mk = (fill: string, op: number) => string;
  const rect =
    (x: number, y: number, w: number, hh: number): Mk =>
    (fill, op) =>
      `<rect x="${x}" y="${y}" width="${w}" height="${hh}" fill="${fill}" fill-opacity="${op}"/>`;
  const path =
    (d: string, rule = ''): Mk =>
    (fill, op) =>
      `<path d="${d}" ${rule} fill="${fill}" fill-opacity="${op}"/>`;
  // Each zone goes on opaque wood first (so a zone painted earlier never shows through), then its colour
  const layer = (zone: CourtZone, mk: Mk, clip = '') => {
    const t = data.get(zone);
    const inner = mk(BASE, 1) + (t ? mk(bandFor(zonePct(t)).fill, ZONE_OPACITY) : '');
    return clip ? `<g clip-path="url(#${id}${clip})">${inner}</g>` : inner;
  };

  // Where the wing/top split rays leave the free-throw circle
  let r0 = 150;
  for (; r0 < R3; r0 += 0.5) {
    const [x, y] = pol(r0, CENTER_DEG);
    if (y > PD && Math.hypot(x - HX, y - PD) >= FTR) break;
  }
  const ray = (a: number, b: number, deg: number) => {
    const p = pol(a, deg);
    const q = pol(b, deg);
    return `M ${f(p[0])} ${f(p[1])} L ${f(q[0])} ${f(q[1])}`;
  };
  const deepY = f(HY + Math.sqrt(DEEP * DEEP - HX * HX));
  const zoneLines = [
    ray(r0, R3, CENTER_DEG),
    ray(r0, R3, -CENTER_DEG),
    ray(R3, DEEP, CENTER_DEG),
    ray(R3, DEEP, -CENTER_DEG),
    `M ${C3} ${CD} H ${PL}`,
    `M ${PR} ${CD} H ${W - C3}`,
    `M 0 ${CD} H ${C3}`,
    `M ${W - C3} ${CD} H ${W}`,
    `M 0 ${deepY} A ${DEEP} ${DEEP} 0 0 0 ${W} ${deepY}`,
  ].join(' ');
  const courtLines = [
    `M 0 0 H ${W} V ${L} H 0 Z`,
    `M ${PL} 0 V ${PD} H ${PR} V 0`,
    `M ${HX - FTR} ${PD} A ${FTR} ${FTR} 0 0 0 ${HX + FTR} ${PD}`,
    A3.replace(' Z', ''),
    `M ${HX - 40} ${HY} A 40 40 0 0 0 ${HX + 40} ${HY}`,
    `M ${HX - FTR} ${L} A ${FTR} ${FTR} 0 0 1 ${HX + FTR} ${L}`,
  ].join(' ');
  const hash = [60, 90, 120, 150].map((y) => `M ${PL - 10} ${y} H ${PL} M ${PR} ${y} H ${PR + 10}`).join(' ');

  const fh = yMax * S - y0;
  const fade = masked
    ? `<mask id="${id}m" maskUnits="userSpaceOnUse" x="${x0}" y="${y0}" width="${x1 - x0}" height="${fh}"><linearGradient id="${id}mg" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${yMax * S}"><stop offset="0" stop-color="${fadeTop ? '#000' : '#fff'}"/><stop offset="${fadeTop ? 0.1 : 0}" stop-color="#fff"/><stop offset="0.8" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${fh}" fill="url(#${id}mg)"/></mask>`
    : '';

  return `<defs>
<clipPath id="${id}c"><rect x="0" y="0" width="${W}" height="${L}"/></clipPath>
<clipPath id="${id}a"><path d="${A3}"/></clipPath>
<clipPath id="${id}y140"><rect x="0" y="${CD}" width="${W}" height="${L - CD}"/></clipPath>
<clipPath id="${id}y190"><rect x="0" y="${PD}" width="${W}" height="${L - PD}"/></clipPath>
<filter id="${id}f" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="7"/></filter>
<pattern id="${id}w" width="60" height="40" patternUnits="userSpaceOnUse"><rect x="10" width="10" height="40" fill="#e0a460" fill-opacity=".05"/><rect x="20" width="10" height="40" fill="#e0a460" fill-opacity=".018"/><rect x="30" width="10" height="40" fill="#e0a460" fill-opacity=".075"/><rect x="40" width="10" height="40" fill="#e0a460" fill-opacity=".012"/><rect x="50" width="10" height="40" fill="#e0a460" fill-opacity=".04"/><path d="M0 0V40M10 0V40M20 0V40M30 0V40M40 0V40M50 0V40" stroke="#000" stroke-opacity=".3" stroke-width="1"/></pattern>
<radialGradient id="${id}v" cx="${HX}" cy="${HY}" r="360" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
${fade}
</defs>
<g${masked ? ` mask="url(#${id}m)"` : ''}>
<g clip-path="url(#${id}c)">
<rect x="0" y="0" width="${W}" height="${L}" fill="${BASE}"/>
<g filter="url(#${id}f)">
${layer('three-left-wing', rect(0, 0, HX, L))}${layer('three-right-wing', rect(HX, 0, W - HX, L))}
${layer('three-top', path(wedge), 'c')}
<g clip-path="url(#${id}y140)">${layer('deep-three', path(`${circ(HX, HY, DEEP)} M 0 0 H ${W} V ${L} H 0 Z`, 'fill-rule="evenodd"'))}</g>
${layer('three-left-corner', rect(0, 0, C3, CD))}${layer('three-right-corner', rect(W - C3, 0, C3, CD))}
<g clip-path="url(#${id}a)">${layer('mid-left-wing', rect(0, 0, HX, L))}${layer('mid-right-wing', rect(HX, 0, W - HX, L))}${layer('mid-left-corner', rect(C3, 0, PL - C3, CD))}${layer('mid-right-corner', rect(PR, 0, W - C3 - PR, CD))}${layer('mid-center', path(wedge))}</g>
<g clip-path="url(#${id}y190)">${layer('free-throw', (fill, op) => `<circle cx="${HX}" cy="${PD}" r="${FTR}" fill="${fill}" fill-opacity="${op}"/>`)}</g>
${layer('paint', rect(PL, 0, PR - PL, PD))}
</g>
<rect x="0" y="0" width="${W}" height="${L}" fill="url(#${id}w)"/><rect x="0" y="0" width="${W}" height="${L}" fill="url(#${id}v)"/>
</g>
<g clip-path="url(#${id}c)" fill="none" stroke-linecap="round"><path d="${zoneLines}" stroke="#000" stroke-opacity=".38" stroke-width="${f(3.4 / k)}"/><path d="${zoneLines}" stroke="#fff" stroke-opacity=".22" stroke-width="${f(1 / k)}"/></g>
<g fill="none" stroke="#f4f4f5" stroke-opacity=".85" stroke-width="${f(1.8 / k)}" stroke-linecap="round" stroke-linejoin="round"><path d="${courtLines}"/><path d="${hash}" stroke-width="${f(1.4 / k)}"/>
<path d="M ${HX - FTR} ${PD} A ${FTR} ${FTR} 0 0 1 ${HX + FTR} ${PD}" stroke-dasharray="${f(5 / k)} ${f(6 / k)}" stroke-opacity=".5"/>
<path d="M ${HX - 30} 40 H ${HX + 30}" stroke-width="${f(3.4 / k)}"/><path d="M ${HX} 40 V 45" stroke-width="${f(1.6 / k)}"/>
<circle cx="${HX}" cy="${HY}" r="7.5" stroke="#f97316" stroke-width="${f(2.8 / k)}"/></g>
</g>`;
}

/** The whole chart (court and zones, no chips) as one SVG document, for an img in next/og. */
export function shotChartSvg(layout: ShotChartLayout): string {
  const { x, y, w, h } = layout.viewBox;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${f(w * layout.k)}" height="${f(h * layout.k)}">${layout.courtMarkup}</svg>`;
}

/**
 * The crop for a single session (the result screen and the session card):
 * from just above the paint to past the arc, narrower unless a corner three
 * is in it, the deep three only when shot. A lit mid top drops its chip under
 * the arc so the zone stays whole.
 */
export function sessionCrop(zones: readonly ChartZoneInput[]): Pick<ChartOptions, 'yMin' | 'yMax' | 'xRange' | 'below'> {
  const shot = new Set(zones.filter((z) => z.attempts > 0).map((z) => z.zone));
  const corner = shot.has('three-left-corner') || shot.has('three-right-corner') || shot.has('mid-left-corner') || shot.has('mid-right-corner');
  return {
    yMin: corner || shot.has('paint') ? -1 : 9,
    yMax: shot.has('deep-three') ? 45 : 40,
    xRange: corner ? [-6, W + 6] : [20, W - 20],
    below: shot.has('mid-center') ? ['mid-center'] : [],
  };
}
