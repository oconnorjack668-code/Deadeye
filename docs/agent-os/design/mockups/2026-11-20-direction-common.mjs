// Shared helpers for the direction mockups: Phosphor icons (MIT) inlined, the half-court drawing, the clock.
import fs from 'node:fs';

const PH = process.env.PHOSPHOR_DIR ?? 'C:/Users/Vivobook S16/AppData/Local/Temp/dd-phosphor/x/package/assets';

/** Inline a Phosphor icon. weight: fill | duotone | bold | regular | light | thin. */
export function ico(name, weight = 'fill', cls = '') {
  const suf = weight === 'regular' ? '' : `-${weight}`;
  const s = fs.readFileSync(`${PH}/${weight}/${name}${suf}.svg`, 'utf8');
  return s.replace('<svg ', `<svg class="ph ${cls}" aria-hidden="true" `);
}

export const LOGO = '../../../../public/logo.png';
export const FOOTAGE = '2026-11-20-direction-footage-frame.jpg';

// 6 makes, 4 misses, all in the "Mid top" zone (made-up session: 6/10).
export const DOTS = [
  [90, 85, 1], [103, 78, 1], [118, 80, 1], [130, 90, 1], [100, 96, 1], [113, 89, 1],
  [82, 92, 0], [138, 80, 0], [94, 73, 0], [124, 99, 0],
];

/**
 * Half court in 220 x 200 units (about 4.4 per foot), original line art.
 * o: line, lineW, zoneA, zoneB (gradient stops), make, miss, rim, dotR, id
 */
export function court(o) {
  const id = o.id ?? 'c';
  const arc = 'M13 190 V128 A104.5 104.5 0 0 1 207 128 V190';
  return `<svg class="court" viewBox="0 0 220 200" role="img" aria-label="Half court. Ten shots from Mid top, six made.">
  <defs>
    <radialGradient id="z${id}" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="${o.zoneA}" stop-opacity="${o.zoneAo ?? 0.85}"/>
      <stop offset="1" stop-color="${o.zoneB}" stop-opacity="0"/>
    </radialGradient>
    <clipPath id="k${id}"><path d="${arc} Z"/></clipPath>
  </defs>
  <g clip-path="url(#k${id})"><ellipse cx="110" cy="87" rx="62" ry="30" fill="url(#z${id})"/></g>
  <g fill="none" stroke="${o.line}" stroke-width="${o.lineW ?? 1.6}" stroke-linecap="round" stroke-linejoin="round">
    <path d="M2 190 V10 H218 V190 Z" opacity="${o.frameOp ?? 0.55}"/>
    <rect x="75" y="106" width="70" height="84"/>
    <path d="M84 106 A26 26 0 0 1 136 106"/>
    <path d="M84 106 A26 26 0 0 0 136 106" stroke-dasharray="3 4" opacity=".6"/>
    <path d="${arc}"/>
    <path d="M97 173 H123"/>
    <circle cx="110" cy="167" r="6" stroke="${o.rim}" stroke-width="2.2"/>
  </g>
  ${DOTS.map(([x, y, m]) => (m
    ? `<circle cx="${x}" cy="${y}" r="${o.dotR ?? 4.6}" fill="${o.make}"/>`
    : `<circle cx="${x}" cy="${y}" r="${(o.dotR ?? 4.6) - 1}" fill="none" stroke="${o.miss}" stroke-width="2"/>`)).join('')}
</svg>`;
}

export const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

// The 9 calls of the made-up clip (same as the Watch it back mockups). t in seconds of a 48 s clip.
export const SHOTS = [
  { n: 1, t: 4, k: 'make' }, { n: 2, t: 9, k: 'miss' }, { n: 3, t: 13, k: 'make' },
  { n: 4, t: 18, k: 'make' }, { n: 5, t: 23, k: 'unclear' }, { n: 6, t: 27, k: 'miss' },
  { n: 7, t: 31, k: 'make' }, { n: 8, t: 37, k: 'make' }, { n: 9, t: 43, k: 'miss' },
];
export const DUR = 48;
export const NOW = 31;

/** Pin positions along a rail of the given inner width. */
export function pins(width) {
  return SHOTS.map((s) => ({ ...s, x: Math.round((s.t / DUR) * width) }));
}
