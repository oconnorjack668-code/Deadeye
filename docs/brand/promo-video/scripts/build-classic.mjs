// Cuts the first promo (docs/brand/deadeye-promo-v1.mp4, or deadeye-promo.mp4 before the rename)
// into the pieces classic.html uses: the logo sting after the first shot is dropped, the
// "Train smarter" tiles are replaced by the real programmes screen, and the end card is
// held long enough for the last voice line. A light grade is applied to all of it.
// Run: node scripts/build-classic.mjs
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
// writes into the separate HyperFrames project ../promo-classic (one root composition per project)
const CLASSIC = path.join(HERE, '..', '..', 'promo-classic');
const OUT = path.join(CLASSIC, 'assets', 'classic');
const FF = process.env.FFMPEG || 'C:/Users/Vivobook S16/AppData/Local/Temp/deadeye-bench/ffmpeg-bin/ffmpeg.exe';
const BRAND = path.join(HERE, '..', '..');
const SRC = fs.existsSync(path.join(BRAND, 'deadeye-promo-v1.mp4')) ? path.join(BRAND, 'deadeye-promo-v1.mp4') : path.join(BRAND, 'deadeye-promo.mp4');
const GRADE = 'eq=contrast=1.06:saturation=1.15:gamma=0.99,unsharp=5:5:0.5:3:3:0';
const enc = ['-an', '-c:v', 'libx264', '-crf', '15', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-g', '15', '-movflags', '+faststart'];
fs.mkdirSync(OUT, { recursive: true });
// The first promo's own captions are blurred out where they sit, so the new captions in
// index.html can go exactly on top. Boxes are [x, y, w, h, from, to] in each piece's own seconds,
// measured from the first promo (a few pixels bigger than the caption boxes they cover).
const BLUR = {
  hook: [
    [45, 1146, 921, 153, 0.08, 1.8],   // "What if your phone"
    [265, 1298, 482, 154, 0.45, 1.8],  // "could call"
    [239, 1454, 533, 154, 0.85, 1.8],  // "every shot?"
    [195, 1288, 621, 158, 2.0, 2.8],   // "It just did."
  ],
  middle: [
    [302, 1324, 400, 154, 0, 1.33],    // "Makes."
    [289, 1324, 433, 154, 1.33, 2.73], // "Misses."
    [233, 1324, 544, 154, 2.73, 4.13], // "Every rep."
    [162, 1324, 677, 154, 4.13, 5.55], // "Counted live."
    [208, 246, 592, 153, 5.55, 7.67],  // "Tap the rim"
    [334, 396, 346, 152, 5.55, 7.67],  // "twice."
    [266, 246, 475, 153, 7.67, 8.65],  // "Any gym."
    [234, 400, 543, 148, 7.67, 8.65],  // "Any angle."
    [133, 308, 741, 158, 8.7, 10.6],   // "See your shot"
    [98, 308, 815, 158, 10.6, 12.23],  // "Ask it anything"
  ],
};
function blurChain(boxes) {
  if (!boxes.length) return '';
  let g = '[0:v]' + GRADE + ',split=' + (boxes.length + 1) + '[base]' + boxes.map((_, i) => '[s' + i + ']').join('') + ';';
  boxes.forEach(([x, y, w, h], i) => { g += '[s' + i + ']crop=' + w + ':' + h + ':' + x + ':' + y + ',boxblur=luma_radius=28:luma_power=3:chroma_radius=20:chroma_power=2[b' + i + '];'; });
  let prev = 'base';
  boxes.forEach(([x, y, , , from, to], i) => { const out = i === boxes.length - 1 ? 'v' : 'o' + i; g += '[' + prev + '][b' + i + ']overlay=' + x + ':' + y + ":enable='between(t," + from + ',' + to + ")'[" + out + '];'; prev = out; });
  return g.replace(/;$/, '');
}
const cut = (name, ss, to, extra = '') => {
  const boxes = BLUR[name] || [];
  const vf = boxes.length ? ['-filter_complex', blurChain(boxes) + ';[v]fps=30' + extra + '[out]', '-map', '[out]'] : ['-vf', GRADE + ',fps=30' + extra];
  execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(ss), '-to', String(to), '-i', SRC, ...vf, ...enc, path.join(OUT, name + '.mp4')], { stdio: 'inherit' });
};
cut('hook', 0, 2.8);                 // first shot, up to just before the logo sting
cut('middle', 4.07, 16.3);           // makes and misses, rim set-up, form check, coach
// "See your shot" and "Ask it anything" land from larger than their boxes for two frames, and
// "Any gym." whips upward as it leaves. Those few frames are covered with the same picture a
// moment later (title area) or held on the frame before (the exit), so nothing is darkened.
{
  const mid = path.join(OUT, 'middle.mp4'), tmp = path.join(OUT, 'middle-pass1.mp4');
  fs.renameSync(mid, tmp);
  const still = (t, crop, file) => execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', String(t), '-i', tmp, '-frames:v', '1', ...(crop ? ['-vf', crop] : []), path.join(OUT, file)]);
  still(8.98, 'crop=1080:370:0:150', 'patch-see.png');
  still(10.8, 'crop=1080:370:0:150', 'patch-ask.png');
  still(8.56, '', 'hold-anygym.png');
  execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', tmp, '-i', path.join(OUT, 'patch-see.png'), '-i', path.join(OUT, 'patch-ask.png'), '-i', path.join(OUT, 'hold-anygym.png'),
    '-filter_complex', "[0:v][1:v]overlay=0:150:enable='between(t,8.80,8.93)'[a];[a][2:v]overlay=0:150:enable='between(t,10.69,10.77)'[b];[b][3:v]overlay=0:0:enable='between(t,8.57,8.67)'[v]",
    '-map', '[v]', ...enc, mid], { stdio: 'inherit' });
  for (const f of ['middle-pass1.mp4', 'patch-see.png', 'patch-ask.png', 'hold-anygym.png']) fs.unlinkSync(path.join(OUT, f));
}
cut('close', 18.3, 24.0, ',tpad=stop_mode=clone:stop_duration=1.4'); // no sensors (covered by new footage), end card, held
// clean footage for the closing line, in place of the first promo's "No sensors" shot
execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-ss', '24.2', '-t', '2.3', '-i', 'C:/Users/Vivobook S16/Downloads/Mobile Devices/16606.mp4',
  '-vf', 'crop=607:1080:900:0,scale=1080:1920:flags=lanczos,eq=contrast=1.08:saturation=1.22:gamma=0.98,unsharp=5:5:0.7:3:3:0,fps=30', ...enc, path.join(OUT, 'dark.mp4')], { stdio: 'inherit' });
// shared pieces from this project
for (const f of ['logo.png', 'screens/programs.mp4', 'screens/tap.jpg']) { fs.mkdirSync(path.dirname(path.join(CLASSIC, 'assets', f)), { recursive: true }); fs.copyFileSync(path.join(HERE, '..', 'assets', f), path.join(CLASSIC, 'assets', f)); }
console.log('classic pieces ready from', path.basename(SRC));
