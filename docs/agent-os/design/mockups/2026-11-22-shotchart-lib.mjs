// The redesigned shot chart (draft, 2026-11-22): a dark hardwood half court with the 13 real shooting zones filled on a
// cold-to-hot scale, and a small plate behind each percentage. Same court geometry and zone rules as src/lib/court.ts
// (50 x 47 ft, hoop at the top, 1 ft = 10 units). Original line art. Made-up data only.

export const S = 10;
const HOOP = { x: 250, y: 52.5 };

/** Zone anchors for the label plates (feet), tuned so plates clear each other. Corner threes sit outside the sideline. */
const CHIP_AT = {
  paint: [25, 8.5], 'free-throw': [25, 21.8], 'mid-center': [25, 26.9],
  'mid-left-wing': [9.8, 17.5], 'mid-right-wing': [40.2, 17.5], 'mid-left-corner': [10, 7], 'mid-right-corner': [40, 7],
  'three-top': [25, 32.2], 'three-left-wing': [8, 26], 'three-right-wing': [42, 26], 'deep-three': [25, 38.5],
};
export const ZONE_LABEL = {
  paint: 'Paint', 'free-throw': 'Free throw', 'mid-left-corner': 'Mid left baseline', 'mid-left-wing': 'Mid left wing', 'mid-center': 'Mid top',
  'mid-right-wing': 'Mid right wing', 'mid-right-corner': 'Mid right baseline', 'three-left-corner': '3 left corner', 'three-left-wing': '3 left wing',
  'three-top': '3 top of key', 'three-right-wing': '3 right wing', 'three-right-corner': '3 right corner', 'deep-three': 'Deep 3',
};

/** The colour scale (founder, 22 Nov: classic, blue for cold and red for hot) over five absolute bands (<25, 25-33, 33-40, 40-50, 50+). */
export const SCALES = {
  classic: {
    name: 'Classic: blue (cold) to red (hot)',
    bands: [
      { id: 'cold', word: 'Cold', range: '<25%', fill: '#2563eb', edge: '#93c5fd', text: '#93c5fd' },
      { id: 'cool', word: 'Cool', range: '25-33%', fill: '#0ea5e9', edge: '#7dd3fc', text: '#7dd3fc' },
      { id: 'avg', word: 'Average', range: '33-40%', fill: '#eab308', edge: '#fde047', text: '#fde047' },
      { id: 'warm', word: 'Warm', range: '40-50%', fill: '#f97316', edge: '#fdba74', text: '#fdba74' },
      { id: 'hot', word: 'Hot', range: '50%+', fill: '#dc2626', edge: '#fca5a5', text: '#fca5a5' },
    ],
  },
};
export const bandIndex = (pct) => (pct >= 50 ? 4 : pct >= 40 ? 3 : pct >= 33 ? 2 : pct >= 25 ? 1 : 0);
export const pctOf = (z) => Math.round((z.makes / z.attempts) * 100);

const BASE = '#241a12';
const pol = (r, deg) => [HOOP.x + r * Math.sin((deg * Math.PI) / 180), HOOP.y + r * Math.cos((deg * Math.PI) / 180)];
const f = (n) => Math.round(n * 10) / 10;

/**
 * shotChart({ id, zones: [{zone, makes, attempts}], renderW, pctPx, subPx, yMax, yMin, xRange, below })
 * renderW is the width the SVG will be shown at (px), so the label chips are sized in real pixels: pctPx for the percent,
 * subPx for makes/attempts. Zone fills are feathered (blurred) and a little see-through so the hardwood shows; thin lines mark borders.
 * Chips are one compact line, "58%  7/12". Corner threes (a 3 ft strip) get a percent-only chip against the sideline, inside the court.
 */
export function shotChart({ id = 'sc', zones = [], scale = 'classic', renderW = 358, pctPx = 14, subPx = 12, yMax = 47, yMin = null, xRange = null, below = [], cls = 'block h-auto w-full' }) {
  const bands = SCALES[scale].bands;
  const data = Object.fromEntries(zones.filter((z) => z.attempts > 0).map((z) => [z.zone, z]));
  const colour = (zone) => bands[bandIndex(pctOf(data[zone]))].fill;

  const x0 = xRange ? xRange[0] : -28, x1 = xRange ? xRange[1] : 528, y0 = (yMin ?? -3) * S;
  const k = renderW / (x1 - x0);
  const fp = pctPx / k, fs = subPx / k; // font sizes in units
  const H = Math.max(fp, fs) * 1.0 + fp * 0.85; // chip height
  const gap = fp * 0.38, padX = fp * 0.62;
  const wPct = (z) => (`${pctOf(z)}`.length * 0.62 + 0.9) * fp;
  const wSub = (z) => `${z.makes}/${z.attempts}`.length * 0.56 * fs;
  const W = (z, solo) => (solo ? wPct(z) : wPct(z) + gap + wSub(z)) + padX * 2;

  const circ = (cx, cy, r) => `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;
  const A3 = `M 30 0 L 30 140 A 237.5 237.5 0 0 0 470 140 L 470 0 Z`;
  const [wl, wr] = [pol(700, -22), pol(700, 22)];
  const wedge = `M ${HOOP.x} ${HOOP.y} L ${f(wl[0])} ${f(wl[1])} L ${f(wr[0])} ${f(wr[1])} Z`;
  const rect = (x, y, w, h) => (fill, op) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" fill-opacity="${op}"/>`;
  const path = (d, rule = '') => (fill, op) => `<path d="${d}" ${rule} fill="${fill}" fill-opacity="${op}"/>`;
  const OP = 0.78;
  // each zone is painted on opaque wood first (so a zone below never shows through), then in its colour at 78%
  const layer = (zone, mk, clip) => {
    const inner = mk(BASE, 1) + (data[zone] ? mk(colour(zone), OP) : '');
    return clip ? `<g clip-path="url(#${id}${clip})">${inner}</g>` : inner;
  };

  let r0 = 150;
  for (; r0 < 237; r0 += 0.5) { const [x, y] = pol(r0, 22); if (y > 190 && Math.hypot(x - 250, y - 190) >= 60) break; }
  const ray = (a, b, deg) => { const p = pol(a, deg), q = pol(b, deg); return `M ${f(p[0])} ${f(p[1])} L ${f(q[0])} ${f(q[1])}`; };
  const zoneLines = [
    ray(r0, 237.5, 22), ray(r0, 237.5, -22), ray(237.5, 280, 22), ray(237.5, 280, -22),
    'M 30 140 H 170', 'M 330 140 H 470', 'M 0 140 H 30', 'M 470 140 H 500', `M 0 178.5 A 280 280 0 0 0 500 178.5`,
  ].join(' ');
  const courtLines = ['M 0 0 H 500 V 470 H 0 Z', 'M 170 0 V 190 H 330 V 0', 'M 190 190 A 60 60 0 0 0 310 190', A3.replace(' Z', ''), 'M 210 52.5 A 40 40 0 0 0 290 52.5', 'M 190 470 A 60 60 0 0 1 310 470'].join(' ');
  const hash = [60, 90, 120, 150].map((y) => `M 160 ${y} H 170 M 330 ${y} H 340`).join(' ');

  const chips = Object.values(data).map((z) => {
    const solo = z.zone === 'three-left-corner' || z.zone === 'three-right-corner';
    const w = W(z, solo), h = H;
    let cx, cy;
    if (z.zone === 'three-left-corner') { cx = 3 + w / 2; cy = 108; }
    else if (z.zone === 'three-right-corner') { cx = 497 - w / 2; cy = 108; }
    else if (below.includes(z.zone)) { cx = CHIP_AT[z.zone][0] * S; cy = 348; }
    else { const a = CHIP_AT[z.zone]; cx = a[0] * S; cy = a[1] * S; }
    const b = bands[bandIndex(pctOf(z))];
    const x = cx - w / 2, y = cy - h / 2, ty = cy + fp * 0.36;
    const ptr = below.includes(z.zone) ? `<path d="M ${f(cx - 7)} ${f(y + 1)} L ${f(cx)} ${f(y - 10)} L ${f(cx + 7)} ${f(y + 1)} Z" fill="${b.edge}"/>` : '';
    const sub = solo ? '' : `<tspan dx="${f(gap)}" font-weight="600" font-size="${f(fs)}" fill="#d4d4d8">${z.makes}/${z.attempts}</tspan>`;
    return `${ptr}<g><rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(h * 0.32)}" fill="#09090b" fill-opacity=".9" stroke="${b.edge}" stroke-opacity=".85" stroke-width="${f(1.3 / k)}"/>
      <text x="${f(cx)}" y="${f(ty)}" text-anchor="middle" font-family="Geist, system-ui, sans-serif" style="font-variant-numeric:tabular-nums"><tspan font-weight="900" font-size="${f(fp)}" fill="#fff">${pctOf(z)}%</tspan>${sub}</text></g>`;
  }).join('');

  const fh = yMax * S - y0;
  const masked = yMax < 47 || xRange;
  const fade = masked ? `<mask id="${id}m" maskUnits="userSpaceOnUse" x="${x0}" y="${y0}" width="${x1 - x0}" height="${fh}"><linearGradient id="${id}mg" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${yMax * S}"><stop offset="0" stop-color="${yMin ? '#000' : '#fff'}"/><stop offset="${yMin ? 0.1 : 0}" stop-color="#fff"/><stop offset="0.8" stop-color="#fff"/><stop offset="1" stop-color="#000"/></linearGradient><rect x="${x0}" y="${y0}" width="${x1 - x0}" height="${fh}" fill="url(#${id}mg)"/></mask>` : '';
  const aria = zones.map((z) => `${ZONE_LABEL[z.zone] ?? z.zone}: ${pctOf(z)}% on ${z.attempts} shots`).join('. ');

  return `<svg class="${cls}" viewBox="${x0} ${y0} ${x1 - x0} ${fh}" role="img" aria-label="Shot chart. ${aria}">
  <defs>
    <clipPath id="${id}c"><rect x="0" y="0" width="500" height="470"/></clipPath>
    <clipPath id="${id}a"><path d="${A3}"/></clipPath>
    <clipPath id="${id}y140"><rect x="0" y="140" width="500" height="330"/></clipPath>
    <clipPath id="${id}y190"><rect x="0" y="190" width="500" height="280"/></clipPath>
    <filter id="${id}f" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="7"/></filter>
    <pattern id="${id}w" width="60" height="40" patternUnits="userSpaceOnUse"><rect x="10" width="10" height="40" fill="#e0a460" fill-opacity=".05"/><rect x="20" width="10" height="40" fill="#e0a460" fill-opacity=".018"/><rect x="30" width="10" height="40" fill="#e0a460" fill-opacity=".075"/><rect x="40" width="10" height="40" fill="#e0a460" fill-opacity=".012"/><rect x="50" width="10" height="40" fill="#e0a460" fill-opacity=".04"/><path d="M0 0V40M10 0V40M20 0V40M30 0V40M40 0V40M50 0V40" stroke="#000" stroke-opacity=".3" stroke-width="1"/></pattern>
    <radialGradient id="${id}v" cx="${HOOP.x}" cy="${HOOP.y}" r="360" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fff" stop-opacity=".09"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
    ${fade}
  </defs>
  <g ${masked ? `mask="url(#${id}m)"` : ''}>
    <g clip-path="url(#${id}c)">
      <rect x="0" y="0" width="500" height="470" fill="${BASE}"/>
      <g filter="url(#${id}f)">
        ${layer('three-left-wing', rect(0, 0, 250, 470))}${layer('three-right-wing', rect(250, 0, 250, 470))}
        ${layer('three-top', path(wedge), 'c')}
        <g clip-path="url(#${id}y140)">${layer('deep-three', path(`${circ(HOOP.x, HOOP.y, 280)} M 0 0 H 500 V 470 H 0 Z`, 'fill-rule="evenodd"'))}</g>
        ${layer('three-left-corner', rect(0, 0, 30, 140))}${layer('three-right-corner', rect(470, 0, 30, 140))}
        <g clip-path="url(#${id}a)">${layer('mid-left-wing', rect(0, 0, 250, 470))}${layer('mid-right-wing', rect(250, 0, 250, 470))}${layer('mid-left-corner', rect(30, 0, 140, 140))}${layer('mid-right-corner', rect(330, 0, 140, 140))}${layer('mid-center', path(wedge))}</g>
        <g clip-path="url(#${id}y190)">${layer('free-throw', (fill, op) => `<circle cx="250" cy="190" r="60" fill="${fill}" fill-opacity="${op}"/>`)}</g>
        ${layer('paint', rect(170, 0, 160, 190))}
      </g>
      <rect x="0" y="0" width="500" height="470" fill="url(#${id}w)"/><rect x="0" y="0" width="500" height="470" fill="url(#${id}v)"/>
    </g>
    <g clip-path="url(#${id}c)" fill="none" stroke-linecap="round"><path d="${zoneLines}" stroke="#000" stroke-opacity=".38" stroke-width="${f(3.4 / k)}"/><path d="${zoneLines}" stroke="#fff" stroke-opacity=".22" stroke-width="${f(1 / k)}"/></g>
    <g fill="none" stroke="#f4f4f5" stroke-opacity=".85" stroke-width="${f(1.8 / k)}" stroke-linecap="round" stroke-linejoin="round"><path d="${courtLines}"/><path d="${hash}" stroke-width="${f(1.4 / k)}"/>
      <path d="M 190 190 A 60 60 0 0 1 310 190" stroke-dasharray="${f(5 / k)} ${f(6 / k)}" stroke-opacity=".5"/>
      <path d="M 220 40 H 280" stroke-width="${f(3.4 / k)}"/><path d="M 250 40 V 45" stroke-width="${f(1.6 / k)}"/>
      <circle cx="250" cy="52.5" r="7.5" stroke="#f97316" stroke-width="${f(2.8 / k)}"/></g>
  </g>
  ${chips}
</svg>`;
}

/** The five-band key, with the words (colour is never the only cue). */
export function legend(scale, { cls = 'text-xs text-zinc-300' } = {}) {
  return `<div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 ${cls}">${SCALES[scale].bands.map((b) => `<span class="flex items-center gap-1.5"><span class="h-3 w-3 rounded-[4px] ring-1 ring-white/20" style="background:${b.fill}"></span>${b.word} <span class="text-zinc-400">${b.range}</span></span>`).join('')}</div>`;
}

/**
 * Today's heat map, rebuilt from ShotHeatMap.tsx and CourtMarkings.tsx (red hot band, soft blobs, outlined numbers),
 * so the before frame is the real thing.
 */
const SPOT = {
  paint: [25, 9], 'free-throw': [25, 20], 'mid-left-corner': [8, 6], 'mid-left-wing': [10, 17], 'mid-center': [25, 27], 'mid-right-wing': [40, 17],
  'mid-right-corner': [42, 6], 'three-left-corner': [1.5, 6], 'three-left-wing': [6, 24], 'three-top': [25, 30.5], 'three-right-wing': [44, 24],
  'three-right-corner': [48.5, 6], 'deep-three': [25, 36],
};
const OLD = (p) => (p >= 50 ? '239 68 68' : p >= 40 ? '249 115 22' : p >= 33 ? '245 158 11' : p >= 25 ? '100 116 139' : '59 130 246');
export function oldHeatMap(zones, id = 'old') {
  const max = Math.max(...zones.map((z) => z.attempts));
  const rad = (a) => 2.8 + (6 - 2.8) * Math.sqrt(a / max);
  const defs = zones.map((z) => `<radialGradient id="${id}${z.zone}"><stop offset="0%" stop-color="rgb(${OLD(pctOf(z))})" stop-opacity=".85"/><stop offset="55%" stop-color="rgb(${OLD(pctOf(z))})" stop-opacity=".45"/><stop offset="100%" stop-color="rgb(${OLD(pctOf(z))})" stop-opacity="0"/></radialGradient>`).join('');
  const blobs = zones.map((z) => `<circle cx="${SPOT[z.zone][0] * S}" cy="${SPOT[z.zone][1] * S}" r="${rad(z.attempts) * S}" fill="url(#${id}${z.zone})"/>`).join('');
  const marks = `<g fill="none" stroke="rgb(161 161 170 / 0.55)" stroke-width="2"><rect x="170" y="0" width="160" height="190"/><circle cx="250" cy="190" r="60"/><path d="M 30 0 L 30 140 A 237.5 237.5 0 0 0 470 140 L 470 0"/><path d="M 210 52.5 A 40 40 0 0 0 290 52.5"/><line x1="220" y1="40" x2="280" y2="40" stroke-width="3"/><circle cx="250" cy="52.5" r="7.5" stroke="rgb(249 115 22)" stroke-width="3"/><path d="M 190 470 A 60 60 0 0 1 310 470"/></g>`;
  const labels = zones.map((z) => `<text x="${SPOT[z.zone][0] * S}" y="${SPOT[z.zone][1] * S}" text-anchor="middle" dominant-baseline="middle" font-size="26" font-weight="900" fill="white" stroke="rgb(9 9 11)" stroke-width="5" paint-order="stroke">${pctOf(z)}%</text><text x="${SPOT[z.zone][0] * S}" y="${SPOT[z.zone][1] * S + 24}" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="700" fill="rgb(212 212 216)" stroke="rgb(9 9 11)" stroke-width="4" paint-order="stroke">${z.makes}/${z.attempts}</text>`).join('');
  return `<svg viewBox="-60 -40 620 510" role="img" aria-label="Shooting heat map (today)" class="h-auto w-full rounded-2xl border border-zinc-800 bg-amber-950/40"><defs>${defs}</defs>${blobs}${marks}${labels}</svg>`;
}
export const oldLegend = `<div class="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">${[['59 130 246', 'Cold <25%'], ['100 116 139', 'Cool 25-33%'], ['245 158 11', 'Average 33-40%'], ['249 115 22', 'Warm 40-50%'], ['239 68 68', 'Hot 50%+']].map(([c, t]) => `<span class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" style="background:rgb(${c})"></span>${t}</span>`).join('')}</div>`;
