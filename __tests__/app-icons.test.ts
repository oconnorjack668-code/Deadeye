// @vitest-environment node
// __tests__/app-icons.test.ts
// The app's icons and logo files are built from logo C by
// scripts/build-app-icons.mjs (D9, founder's choice 22 Nov 2026). This fails
// when a file is still the old artwork or falls out of step with the drawing,
// when a file changes size (pages and the manifest declare the sizes), and when
// the Android maskable icon reaches outside the circle launchers keep.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import sharp, { type Sharp } from 'sharp';
import { ICONS, FAVICON, SVGS, BACKGROUND, MASKABLE_SAFE_RADIUS, draw } from '../scripts/build-app-icons.mjs';

const ROOT = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(ROOT, file));

async function pixels(input: Buffer | Sharp) {
  const image = Buffer.isBuffer(input) ? sharp(input) : input;
  return image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

/**
 * Mean difference per channel (0-255) between a committed image and a fresh
 * drawing. Colours are weighted by opacity: lossy WebP keeps any colour under
 * a fully transparent pixel, and nobody sees it.
 */
async function meanDifference(committed: Buffer, fresh: Sharp) {
  const a = await pixels(committed);
  const b = await pixels(fresh);
  expect([a.info.width, a.info.height]).toEqual([b.info.width, b.info.height]);
  let sum = 0;
  for (let i = 0; i < a.data.length; i += 4) {
    const [alphaA, alphaB] = [a.data[i + 3], b.data[i + 3]];
    for (let c = 0; c < 3; c++) sum += Math.abs((a.data[i + c] * alphaA - b.data[i + c] * alphaB) / 255);
    sum += Math.abs(alphaA - alphaB);
  }
  return sum / a.data.length;
}

/** The PNGs inside an .ico, by size. */
function icoEntries(data: Buffer) {
  const entries = new Map<number, Buffer>();
  for (let i = 0; i < data.readUInt16LE(4); i++) {
    const at = 6 + 16 * i;
    const offset = data.readUInt32LE(at + 12);
    entries.set(data[at] || 256, data.subarray(offset, offset + data.readUInt32LE(at + 8)));
  }
  return entries;
}

describe('app icons (run: node scripts/build-app-icons.mjs)', () => {
  it.each(ICONS.map((icon) => [icon.file, icon] as const))('%s is logo C at its old size', async (file, icon) => {
    const committed = read(file);
    const { width, height } = await sharp(committed).metadata();
    expect([width, height]).toEqual([icon.size, icon.size]);
    // Encoding and libvips versions move a few levels; the old artwork is tens of levels away.
    expect(await meanDifference(committed, draw(icon.svg, icon.size, icon.background))).toBeLessThan(1.5);
  });

  it('favicon.ico holds logo C at 16, 32 and 48 px', async () => {
    const entries = icoEntries(read(FAVICON.file));
    expect([...entries.keys()]).toEqual(FAVICON.sizes);
    for (const size of FAVICON.sizes) {
      expect(await meanDifference(entries.get(size)!, draw(FAVICON.svg, size))).toBeLessThan(1.5);
    }
  });

  it('the logo SVGs are up to date', () => {
    // A Windows checkout (core.autocrlf) may turn line endings into \r\n.
    const lf = (s: string) => s.replace(/\r\n/g, '\n');
    for (const { file, svg } of SVGS) expect(lf(read(file).toString('utf8')), file).toBe(lf(svg));
  });

  it('keeps the maskable icon inside the safe circle', async () => {
    const { data, info } = await pixels(read('public/icon-maskable-512.png'));
    const bg = [1, 3, 5].map((i) => parseInt(BACKGROUND.slice(i, i + 2), 16));
    const centre = info.width / 2;
    let furthest = 0;
    for (let y = 0; y < info.height; y++) {
      for (let x = 0; x < info.width; x++) {
        const i = (y * info.width + x) * 4;
        const differs = Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]) > 24;
        if (differs) furthest = Math.max(furthest, Math.hypot(x + 0.5 - centre, y + 0.5 - centre));
      }
    }
    expect(furthest).toBeGreaterThan(0.3 * info.width); // the brackets are there, not only the ball
    expect(furthest).toBeLessThanOrEqual(MASKABLE_SAFE_RADIUS * info.width);
  });

  it('every icon the manifest names exists at the size it declares', async () => {
    const manifest = JSON.parse(read('public/manifest.json').toString('utf8'));
    const icons = [...manifest.icons, ...manifest.shortcuts.flatMap((s: { icons: unknown[] }) => s.icons)];
    for (const { src, sizes } of icons as { src: string; sizes: string }[]) {
      const { width, height } = await sharp(read(path.join('public', src))).metadata();
      expect(`${width}x${height}`, src).toBe(sizes);
    }
  });
});
