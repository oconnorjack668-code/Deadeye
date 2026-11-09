#!/usr/bin/env node
// scripts/bench-suite.mjs
// Runs the clip bench (__tests__/clipBench.test.ts) over every labelled clip
// and a set of harder versions of each, and prints one table.
//
// Two labelled clips cannot say whether a change helps on a court the tracker
// has not seen. Filming more takes weeks; making harder versions of the clips
// we have takes minutes, and keeps their labels: a clip made smaller, darker,
// slower or shakier still has its shots at the same moments. So each clip is
// also run far away (half the pixels), dim, washed out by bright windows, at
// 15 and 10 frames a second, on a wobbly mount, and all of the worst at once.
// They stand in for the conditions players report, not for real courts:
// keep adding real clips (bench-suite.json) as they come.
//
// Usage:
//   DEADEYE_BENCH_DIR=~/Documents/deadeye-bench node scripts/bench-suite.mjs [clip-id ...] [--variant=id,id] [--label=name]
//
// DEADEYE_BENCH_DIR holds the clip files named in bench-suite.json; versions
// are made into its variants/ folder once and reused, and reports go to
// out/<label>/. DEADEYE_BENCH_FFMPEG points at ffmpeg when it is not on PATH.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const suite = JSON.parse(readFileSync(path.join(root, 'scripts', 'bench-suite.json'), 'utf8'));
const dir = process.env.DEADEYE_BENCH_DIR;
if (!dir) {
  console.error('Set DEADEYE_BENCH_DIR to the folder holding the clips.');
  process.exit(1);
}
// Clips saved from the app's "Save for the test library" (src/lib/video/
// benchLabels.ts) are a video and a .json of labels; dropped into the folder,
// they join the suite as they are
for (const name of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
  try {
    const clip = JSON.parse(readFileSync(path.join(dir, name), 'utf8'));
    const valid = clip.id && clip.file && Array.isArray(clip.rim) && clip.rim.length === 4 && Array.isArray(clip.makes) && Array.isArray(clip.attempts);
    if (valid && !suite.clips.some((c) => c.id === clip.id)) suite.clips.push(clip);
  } catch {
    // Not a labels file
  }
}
const ffmpeg = process.env.DEADEYE_BENCH_FFMPEG || 'ffmpeg';
const args = process.argv.slice(2);
const opt = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=');
const onlyClips = args.filter((a) => !a.startsWith('--'));
const onlyVariants = opt('variant')?.split(',');
const label = opt('label') || 'latest';
const outDir = path.join(dir, 'out', label);
mkdirSync(path.join(dir, 'variants'), { recursive: true });
mkdirSync(outDir, { recursive: true });

/** The rim taps after a crop of `c` from each side, scaled back up. */
function cropRim(rim, c) {
  return rim.map((v) => (v - c) / (1 - 2 * c));
}

function makeVariant(clip, variant) {
  const src = path.join(dir, clip.file);
  if (!variant.vf) return src;
  const dst = path.join(dir, 'variants', `${clip.id}-${variant.id}.mp4`);
  if (existsSync(dst)) return dst;
  process.stdout.write(`  making ${path.basename(dst)}... `);
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-vf', variant.vf, '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', dst], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (r.status !== 0) throw new Error(`ffmpeg failed on ${dst}`);
  console.log('done');
  return dst;
}

/** Pulls the scored attempts line out of a bench report. */
function parse(text) {
  const m = text.match(/attempts\s+(\d+) labelled, (\d+) called, (\d+) called right, (\d+) calls with no shot/);
  const inferred = text.match(/shots called\s+\d+ \(\d+ made, (\d+) inferred\)/);
  const found = text.match(/ball found in\s+\d+ \(([\d.]+)%\)/);
  if (!m) return null;
  return {
    labelled: +m[1],
    called: +m[2],
    right: +m[3],
    phantoms: +m[4],
    missed: (text.match(/<-- MISSED/g) || []).length,
    // Called, against the labels, the wrong way: the report lists each one
    // twice (in its make/miss and its attempts sections), so count from the totals
    wrong: +m[2] - +m[3],
    unsure: inferred ? +inferred[1] : 0,
    ballPct: found ? +found[1] : 0,
  };
}

const rows = [];
for (const clip of suite.clips) {
  if (onlyClips.length && !onlyClips.includes(clip.id)) continue;
  // A hold-out clip measures the tracker on footage it was never tuned on, so
  // it only runs when named: a routine run must not let it be looked at
  if (clip.holdout && !onlyClips.includes(clip.id)) {
    console.log(`skipping ${clip.id}: hold-out, runs only when named`);
    continue;
  }
  if (!existsSync(path.join(dir, clip.file))) {
    console.log(`skipping ${clip.id}: ${clip.file} is not in ${dir}`);
    continue;
  }
  for (const variant of suite.variants) {
    if (onlyVariants && !onlyVariants.includes(variant.id)) continue;
    const file = makeVariant(clip, variant);
    const rim = variant.rimCrop ? cropRim(clip.rim, variant.rimCrop) : clip.rim;
    const out = path.join(outDir, `${clip.id}-${variant.id}.txt`);
    process.stdout.write(`${clip.id} ${variant.id}: `);
    const r = spawnSync('npx', ['vitest', 'run', '__tests__/clipBench.test.ts'], {
      cwd: root,
      shell: process.platform === 'win32',
      encoding: 'utf8',
      env: {
        ...process.env,
        DEADEYE_BENCH_FFMPEG: ffmpeg,
        DEADEYE_BENCH_CLIP: file,
        DEADEYE_BENCH_RIM: rim.map((v) => v.toFixed(4)).join(','),
        DEADEYE_BENCH_3FRAME: '1',
        DEADEYE_BENCH_LEARN: '1',
        DEADEYE_BENCH_APP: '1',
        DEADEYE_BENCH_SAMPLE_FPS: String(variant.fps ?? 30),
        DEADEYE_BENCH_MAKES: clip.makes.join(','),
        DEADEYE_BENCH_ATTEMPTS: clip.attempts.join(','),
        DEADEYE_BENCH_OUT: out,
      },
    });
    const score = existsSync(out) ? parse(readFileSync(out, 'utf8')) : null;
    if (!score) {
      console.log(`failed (exit ${r.status})`);
      rows.push({ clip: clip.id, variant: variant.id, failed: true });
      continue;
    }
    console.log(`${score.right}/${score.labelled} right, ${score.missed} missed, ${score.phantoms} phantom, ${score.unsure} unsure`);
    rows.push({ clip: clip.id, variant: variant.id, ...score });
  }
}

const ok = rows.filter((r) => !r.failed);
const total = ok.reduce((t, r) => ({ labelled: t.labelled + r.labelled, right: t.right + r.right, phantoms: t.phantoms + r.phantoms, missed: t.missed + r.missed }), {
  labelled: 0,
  right: 0,
  phantoms: 0,
  missed: 0,
});
const table = [
  `bench suite: ${label}`,
  'clip   variant  right  missed  wrong  phantom  unsure  ball%',
  ...rows.map((r) =>
    r.failed
      ? `${r.clip.padEnd(6)} ${r.variant.padEnd(8)} failed`
      : `${r.clip.padEnd(6)} ${r.variant.padEnd(8)} ${`${r.right}/${r.labelled}`.padStart(5)}  ${String(r.missed).padStart(6)}  ${String(r.wrong).padStart(5)}  ${String(r.phantoms).padStart(7)}  ${String(r.unsure).padStart(6)}  ${r.ballPct.toFixed(1).padStart(5)}`
  ),
  `total  ${total.right}/${total.labelled} right (${((total.right / Math.max(total.labelled, 1)) * 100).toFixed(1)}%), ${total.missed} missed, ${total.phantoms} phantom`,
];
writeFileSync(path.join(outDir, 'summary.txt'), table.join('\n') + '\n');
writeFileSync(path.join(outDir, 'summary.json'), JSON.stringify(rows, null, 2));
console.log('\n' + table.join('\n'));
