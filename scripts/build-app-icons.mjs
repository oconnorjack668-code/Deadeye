// scripts/build-app-icons.mjs
// Builds the app's logo and icon files from logo C, the logo the founder chose
// on 22 Nov 2026 (docs/agent-os/design/logo/README.md). Run again whenever the
// logo drawing in docs/agent-os/design/logo/2026-11-22-logo-lib.mjs changes:
//   node scripts/build-app-icons.mjs
//
// Every file keeps its old name and pixel size, so nothing that links to one
// breaks. What each shows:
// - the lockup (brackets, ball, DEADEYE) on the dark background: the 512 px
//   install icon and the store icons, as before;
// - the mark (brackets and ball) on the dark background: the 192 px icon (the
//   share cards and the offline page use it), the iPhone home screen icon,
//   and the Android maskable icon, where it sits inside the safe zone (the
//   middle circle, 40% of the width in radius, that no launcher crops);
// - the ball alone with no background: logo.png and logo.webp, as before,
//   because <Logo> rounds it into a circle and the page loader spins it; and
//   favicon.ico (16, 32 and 48 px), because at tab size the brackets would
//   shrink the ball to about 9 px.
// It also writes the two SVGs to public/ and docs/brand/.
// PNGs are drawn from the SVG by sharp (libvips), never traced from old PNGs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { VARIANTS, logoSvg, ballInner } from '../docs/agent-os/design/logo/2026-11-22-logo-lib.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = VARIANTS['improved-c'];
export const BACKGROUND = '#0a0a0b';
/** Largest distance from the centre of the maskable icon a launcher never crops, as a share of its width */
export const MASKABLE_SAFE_RADIUS = 0.4;

const MARK_SIDE = 2 * C.box; // the brackets' square, in the drawing's 1024 units
const BALL_SIDE = 2 * C.R;

/** The drawing with its viewBox moved to a square of `side` units centred on the ball. */
function framed(svg, side) {
  return svg.replace('viewBox="0 0 1024 1024"', `viewBox="${C.cx - side / 2} ${C.cy - side / 2} ${side} ${side}"`);
}
const svgOf = {
  lockup: () => logoSvg(C, { bg: BACKGROUND }),
  // fill: how much of the width the brackets' square takes
  mark: (fill) => framed(logoSvg(C, { word: false }), MARK_SIDE / fill),
  // fill: how much of the width the ball (ring included) takes
  ball: (fill) =>
    framed(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" role="img" aria-label="Deadeye"><title>Deadeye</title>${ballInner(C, 'b')}</svg>`,
      BALL_SIDE / fill,
    ),
};

// The maskable mark's corners sit 0.38 of the width from the centre, just inside the 0.4 safe circle.
const MASKABLE_FILL = (2 * 0.38) / Math.SQRT2;

/** Every raster file: where it goes, its size, and what it shows. */
export const ICONS = [
  { file: 'public/icon-512.png', size: 512, svg: svgOf.lockup() },
  { file: 'public/icon-play-512.png', size: 512, svg: svgOf.lockup() },
  { file: 'public/icon-store-1024.png', size: 1024, svg: svgOf.lockup() },
  { file: 'public/icon-192.png', size: 192, svg: svgOf.mark(0.72), background: BACKGROUND },
  { file: 'public/apple-touch-icon.png', size: 180, svg: svgOf.mark(0.72), background: BACKGROUND },
  { file: 'public/icon-maskable-512.png', size: 512, svg: svgOf.mark(MASKABLE_FILL), background: BACKGROUND },
  { file: 'public/logo.png', size: 256, svg: svgOf.ball(0.68) },
  { file: 'public/logo.webp', size: 256, svg: svgOf.ball(0.68), format: 'webp' },
];
/** favicon.ico holds one PNG per size. */
export const FAVICON = { file: 'src/app/favicon.ico', sizes: [16, 32, 48], svg: svgOf.ball(0.98) };

// The SVGs, for anything that can use them: the lockup with a light wordmark for dark pages, and the mark cropped to its brackets.
const lockupSvg = logoSvg(C);
const markSvg = framed(logoSvg(C, { word: false }), MARK_SIDE);
export const SVGS = [
  { file: 'public/logo.svg', svg: lockupSvg },
  { file: 'public/logo-mark.svg', svg: markSvg },
  { file: 'docs/brand/deadeye-logo.svg', svg: lockupSvg },
  { file: 'docs/brand/deadeye-logo-mark.svg', svg: markSvg },
];

/** The icon drawn at its size, as an RGBA sharp pipeline. */
export function draw(svg, size, background) {
  // Every SVG here says width="1024", so this density makes librsvg draw it at
  // the target size rather than scale another size up or down.
  const image = sharp(Buffer.from(svg), { density: (72 * size) / 1024 }).resize(size, size);
  return background ? image.flatten({ background }).ensureAlpha() : image.ensureAlpha();
}

/** An .ico file holding the given PNGs (each entry may be PNG data since Windows Vista). */
export function ico(pngs) {
  const header = Buffer.alloc(6 + 16 * pngs.length);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(pngs.length, 4);
  let offset = header.length;
  pngs.forEach(({ size, data }, i) => {
    const at = 6 + 16 * i;
    header[at] = size % 256; // 0 means 256
    header[at + 1] = size % 256;
    header.writeUInt16LE(1, at + 4); // colour planes
    header.writeUInt16LE(32, at + 6); // bits per pixel
    header.writeUInt32LE(data.length, at + 8);
    header.writeUInt32LE(offset, at + 12);
    offset += data.length;
  });
  return Buffer.concat([header, ...pngs.map((p) => p.data)]);
}

async function build() {
  for (const { file, size, svg, background, format } of ICONS) {
    const image = draw(svg, size, background);
    const out = format === 'webp' ? image.webp({ quality: 92, alphaQuality: 100, effort: 6 }) : image.png({ compressionLevel: 9 });
    await out.toFile(path.join(ROOT, file));
    console.log('wrote', file);
  }
  const pngs = await Promise.all(
    FAVICON.sizes.map(async (size) => ({ size, data: await draw(FAVICON.svg, size).png({ compressionLevel: 9 }).toBuffer() })),
  );
  fs.writeFileSync(path.join(ROOT, FAVICON.file), ico(pngs));
  console.log('wrote', FAVICON.file);

  for (const { file, svg } of SVGS) {
    fs.writeFileSync(path.join(ROOT, file), svg);
    console.log('wrote', file);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
