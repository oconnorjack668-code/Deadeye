// The Deadeye logo as parametric SVG. Measured from public/icon-store-1024.png (1024 px) on 22 Nov 2026:
//   ball centre (512,420), ring r 215.5 / 11 thick, face r 204.5, dark disc r 131, red dot r 63, cross bars 32 wide,
//   seams = arcs of circles r 92.5 centred 193 left and right of the ball, stroke 32; brackets: square of half-size 336,
//   arms 114 long, 21 thick, #ff2436; wordmark letters x 237-789, cap height 101, baseline 905 (Anton outlines, OFL).
// "faithful" reproduces those numbers; the improved versions are proposals (the founder picks, nothing is replaced).
import fs from 'node:fs';
const n = (v) => +v.toFixed(2);
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const WORD = JSON.parse(fs.readFileSync(path.join(HERE, '2026-11-22-logo-wordmark-paths.json'), 'utf8'));

// Seam: a tapered crescent (about 34 px thick at the middle, 28 px near the ends), traced from measured edges of the
// original (left seam; the right one is its mirror). Points are [x, y] for the upper half, mirrored below.
const SEAM_OUTER_UP = [[286, 300], [304, 312], [322, 324], [339, 336], [355, 348], [368, 360], [379, 372], [386, 384], [392, 396], [395, 408], [395.6, 420]];
const SEAM_INNER_UP = [[322, 296], [331, 300], [359, 312], [375, 324], [388, 336], [399, 348], [409, 360], [417, 372], [422, 384], [426, 396], [428, 408], [428.6, 420]];
function catmull(pts) {
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] ?? p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d;
}
const mirrorY = (pts) => pts.slice(0, -1).reverse().map(([x, y]) => [x, 840 - y]);
const full = (up) => [...up, ...mirrorY(up)];
export const SEAM_D = (() => {
  const inner = full(SEAM_INNER_UP); // runs top to bottom along the inside edge
  const outer = full(SEAM_OUTER_UP).reverse(); // back up along the outside edge
  return `${catmull(inner)}L${n(outer[0][0])} ${n(outer[0][1])}${catmull(outer).replace(/^M[^C]*/, '')}Z`;
})();

const FAITHFUL = {
  name: 'faithful', cx: 512, cy: 420, box: 336, arm: 114, th: 21, R: 215.5, ringT: 11, disc: 131, dot: 63,
  bar: 32, seamR: 92.5, seamOff: 193, seamW: 32, chamfer: 0,
  face: [[216, '#fe3a49'], [250, '#fb3746'], [300, '#f63241'], [323, '#f0303c'], [420, '#e5212f'], [549, '#d91a26'], [604, '#d71422'], [630, '#d71421']],
  dotGrad: [[357, '#fc3947'], [390, '#f4313f'], [437, '#e3212e'], [470, '#d81623'], [483, '#d41421']], seamScale: 1, seamBold: 0,
  ring: [[204, '#7d0d18'], [636, '#7d0d18']], discFill: '#121214', discEdge: null,
  bracket: ['#ff2436', '#ff2436'], bars: '#0a0a0b', highlight: 0, wordDy: 0, wordK: 1,
};
// A: same drawing, better rendering: lit face, bevelled ring, a disc that reads against the red, seams that read on the disc.
const A = {
  ...FAITHFUL, name: 'improved-a', dotGrad: null,
  face: [[216, '#ff5963'], [330, '#fb3a48'], [420, '#ec2a38'], [520, '#d91a27'], [620, '#c5121f']],
  ring: [[204, '#a8151f'], [420, '#8a0f1a'], [636, '#5e0912']], discFill: '#19191d', discEdge: '#2a2a30',
  bracket: ['#ff3a4b', '#f01c30'], highlight: 0.16,
};
// B: built to hold at 48 px: bolder brackets and bars, brackets tucked closer, a bigger ball, lighter seams.
const B = {
  ...A, name: 'improved-b', box: 304, arm: 122, th: 32, R: 226, ringT: 13, disc: 134, dot: 60,
  bar: 42, seamScale: 226 / 215.5, seamBold: 7, wordDy: -22, wordK: 1.06,
};
// C: B's proportions, with chamfered bracket tips (cut at 45 degrees) and A's rendering: the "finished" one.
const C = { ...B, name: 'improved-c', chamfer: 14, bracket: ['#ff3d4d', '#ee1a2f'], highlight: 0.2 };

export const VARIANTS = { faithful: FAITHFUL, 'improved-a': A, 'improved-b': B, 'improved-c': C };

const stops = (arr, y0, y1) => arr.map(([y, c]) => `<stop offset="${n((y - y0) / (y1 - y0))}" stop-color="${c}"/>`).join('');

export function bracketPath(v, sx, sy, local = false) {
  // sx, sy = -1 or 1: which corner. Path of the L-shape, optionally relative to its own corner box (for single-corner svgs).
  const ox = local ? (sx < 0 ? 0 : v.arm) : v.cx + sx * v.box;
  const oy = local ? (sy < 0 ? 0 : v.arm) : v.cy + sy * v.box;
  const dx = -sx, dy = -sy, a = v.arm, t = v.th, c = v.chamfer;
  const P = (x, y) => `${n(ox + dx * x)} ${n(oy + dy * y)}`;
  // L-shape: corner, along x arm (tip cut by chamfer), back along inner edge, down y arm.
  const pts = [
    [0, 0], [a, 0], [a - c, t], [t, t], [t, a - c], [0, a],
  ];
  return 'M' + pts.map(([x, y]) => P(x, y)).join('L') + 'Z';
}

/** The ball only (ring, face, disc, dot, seams, bars) in its own 0 0 2R 2R box, or in place when inPlace is true. */
export function ballInner(v, id, inPlace = false, layer = null) {
  const { cx, cy, R, ringT } = v;
  const face = R - ringT;
  const y0 = cy - R, y1 = cy + R;
  const on = (name) => !layer || layer === name;
  return `<defs>
<linearGradient id="${id}f" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}">${stops(v.face, y0, y1)}</linearGradient>
<linearGradient id="${id}r" gradientUnits="userSpaceOnUse" x1="0" y1="${y0}" x2="0" y2="${y1}">${stops(v.ring, y0, y1)}</linearGradient>
${v.dotGrad ? `<linearGradient id="${id}o" gradientUnits="userSpaceOnUse" x1="0" y1="${cy - v.dot}" x2="0" y2="${cy + v.dot}">${stops(v.dotGrad, cy - v.dot, cy + v.dot)}</linearGradient>` : ''}
<clipPath id="${id}c"><circle cx="${cx}" cy="${cy}" r="${face}"/></clipPath>
${v.highlight ? `<radialGradient id="${id}h" gradientUnits="userSpaceOnUse" cx="${cx - 40}" cy="${cy - 150}" r="210"><stop offset="0" stop-color="#fff" stop-opacity="${v.highlight}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>` : ''}
${v.discEdge ? `<radialGradient id="${id}d" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${v.disc}"><stop offset="0" stop-color="${v.discFill}"/><stop offset="1" stop-color="#101013"/></radialGradient>` : ''}
</defs>
${on('base') ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="url(#${id}r)"/>
<circle cx="${cx}" cy="${cy}" r="${face}" fill="url(#${id}f)"/>` : ''}
${layer ? '' : `<g clip-path="url(#${id}c)">`}
${on('base') && v.highlight ? (layer ? `<g clip-path="url(#${id}c)"><circle cx="${cx}" cy="${cy}" r="${face}" fill="url(#${id}h)"/></g>` : `<circle cx="${cx}" cy="${cy}" r="${face}" fill="url(#${id}h)"/>`) : ''}
${on('disc') ? `${layer ? `<g clip-path="url(#${id}c)">` : ''}<circle cx="${cx}" cy="${cy}" r="${v.disc}" fill="${v.discEdge ? `url(#${id}d)` : v.discFill}"${v.discEdge ? ` stroke="${v.discEdge}" stroke-width="3"` : ''}/>${layer ? '</g>' : ''}` : ''}
${on('dot') ? `<circle cx="${cx}" cy="${cy}" r="${v.dot}" fill="url(#${v.dotGrad ? id + 'o' : id + 'f'})"/>` : ''}
${on('top') ? `${layer ? `<g clip-path="url(#${id}c)">` : ''}<g fill="${v.bars}" stroke="${v.bars}" stroke-width="${v.seamBold}" stroke-linejoin="round" transform="translate(${cx} ${cy}) scale(${v.seamScale}) translate(-512 -420)"><path d="${SEAM_D}"/><path d="${SEAM_D}" transform="translate(1024 0) scale(-1 1)"/></g>
<rect x="${cx - v.bar / 2}" y="${cy - face}" width="${v.bar}" height="${face * 2}" fill="${v.bars}"/>
<rect x="${cx - face}" y="${cy - v.bar / 2}" width="${face * 2}" height="${v.bar}" fill="${v.bars}"/>${layer ? '</g>' : ''}` : ''}
${layer ? '' : '</g>'}`;
}

/** Full lockup. opts: word (bool), wordColor, bg (colour or null), mark (crop to the mark's own square when false word). */
let uid = 0;
export function logoSvg(v, { word = true, wordColor = '#f4f4f5', bg = null, size = 1024 } = {}) {
  const id = `l${++uid}`;
  const brackets = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy], i) => {
    const gy = v.cy + sy * v.box;
    void gy;
    return `<path d="${bracketPath(v, sx, sy)}" fill="url(#${id}b${i < 2 ? 0 : 1})"/>`;
  }).join('');
  const yT = v.cy - v.box, yB = v.cy + v.box;
  const wordSvg = word
    ? `<g fill="${wordColor}" transform="translate(0 ${v.wordDy}) translate(512 905) scale(${v.wordK}) translate(-512 -905)">${WORD.map((d) => `<path d="${d}"/>`).join('')}</g>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="${size}" height="${size}" role="img" aria-label="Deadeye">
<title>Deadeye</title>
<defs>
<linearGradient id="${id}b0" gradientUnits="userSpaceOnUse" x1="0" y1="${yT}" x2="0" y2="${yB}"><stop offset="0" stop-color="${v.bracket[0]}"/><stop offset="1" stop-color="${v.bracket[1]}"/></linearGradient>
<linearGradient id="${id}b1" gradientUnits="userSpaceOnUse" x1="0" y1="${yT}" x2="0" y2="${yB}"><stop offset="0" stop-color="${v.bracket[0]}"/><stop offset="1" stop-color="${v.bracket[1]}"/></linearGradient>
</defs>
${bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : ''}
${brackets}
${ballInner(v, id)}
${wordSvg}
</svg>
`;
}

/** Pieces for the animated openings: the ball in its own square viewBox, and one corner bracket in its own box. */
export function parts(v, uidTag = 'p') {
  const id = `${uidTag}${++uid}`;
  const r = v.R;
  const ball = `<svg viewBox="${v.cx - r} ${v.cy - r} ${r * 2} ${r * 2}" width="100%" height="100%" aria-hidden="true" focusable="false">${ballInner(v, id)}</svg>`;
  const box = `viewBox="${v.cx - r} ${v.cy - r} ${r * 2} ${r * 2}" width="100%" height="100%" aria-hidden="true" focusable="false"`;
  // The ball in four stacked layers so the seams can turn while the lighting stays put: base (ring, face, highlight) and dot stay fixed; disc and seams/bars spin.
  const ballLayers = ['base', 'disc', 'dot', 'top'].map((l) => `<div class="lay ${l === 'disc' || l === 'top' ? 'spin' : ''}"><svg ${box}>${ballInner(v, id, false, l)}</svg></div>`).join('');
  const corner = (sx, sy) => {
    const g = `${id}k${sx}${sy}`;
    return `<svg viewBox="0 0 ${v.arm} ${v.arm}" width="100%" height="100%" aria-hidden="true" focusable="false"><defs><linearGradient id="${g}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${v.bracket[0]}"/><stop offset="1" stop-color="${v.bracket[1]}"/></linearGradient></defs><path d="${bracketPath(v, sx, sy, true)}" fill="url(#${g})"/></svg>`;
  };
  // The wordmark in its own box (x 237-789, cap 804-905).
  const wordBox = `<svg viewBox="237 804 553 102" width="100%" height="100%" aria-hidden="true" focusable="false"><g fill="#f4f4f5">${WORD.map((d) => `<path d="${d}"/>`).join('')}</g></svg>`;
  return { ball, ballLayers, corner, wordBox, v };
}
