// Cuts the source footage and screen recordings into the small files the
// composition uses. Run: node scripts/build-assets.mjs
// Paths below are on the maker's PC; change them if the sources move.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '..', 'assets');
const FF = process.env.FFMPEG || 'C:/Users/Vivobook S16/AppData/Local/Temp/deadeye-bench/ffmpeg-bin/ffmpeg.exe';
const SHOOT = 'C:/Users/Vivobook S16/Downloads/Mobile Devices/';
const REC = 'C:/Users/Vivobook S16/Documents/deadeye-recordings/';
const R1 = REC + 'Screen_Recording_20261020_170041_Chrome.mp4'; // home, hoops, gym, train, IQ, programmes
const R2 = REC + '16889.mp4'; // coach chat, form check

const run = (args) => execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
const enc = ['-an', '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-g', '15', '-movflags', '+faststart'];

// Shooting clips: portrait crop of 16606 (2336x1080) around the hoop, 1080x1920.
// 16606 crop is 607x1080 at x=900. Windows are source seconds.
// a light grade: a touch more contrast and colour, and sharpening after the upscale
const GRADE = 'eq=contrast=1.08:saturation=1.22:gamma=0.98,unsharp=5:5:0.7:3:3:0';
const SHOT_CROP = `crop=607:1080:900:0,scale=1080:1920:flags=lanczos,${GRADE},fps=30`;
const shots = { 'shoot-a': [1.5, 4.0], 'shoot-b': [12.9, 1.7], 'shoot-c': [7.5, 1.7], 'shoot-d': [19.4, 1.7] };
for (const [name, [ss, t]] of Object.entries(shots)) {
  run(['-ss', String(ss), '-t', String(t), '-i', SHOOT + '16606.mp4', '-vf', SHOT_CROP, ...enc, path.join(OUT, 'clips', name + '.mp4')]);
}
// closing shot: another make from 16606 (the 25.2s shot), dimmed in the composition.
run(['-ss', '24.4', '-t', '2.0', '-i', SHOOT + '16606.mp4', '-vf', SHOT_CROP, ...enc, path.join(OUT, 'clips', 'dark.mp4')]);
// 16761 is 1080x1920 (60fps made of doubled frames); one frame is used for the rim set-up card.
run(['-ss', '3.0', '-i', SHOOT + '16761.mp4', '-frames:v', '1', '-vf', 'crop=480:480:190:700', '-q:v', '2', path.join(OUT, 'screens', 'tap.jpg')]);

// App stills: [name, source, second, x, y, w, h] in source pixels (1080x2340).
// Each crop stays clear of the red + button and of any account name.
const stills = [
  ['coach-q', R2, 1.0, 40, 470, 1000, 900],
  ['coach-a', R2, 12.5, 0, 290, 1080, 790],
  ['chart', R1, 4.5, 30, 570, 1020, 940],
  ['drills', R1, 8.0, 30, 690, 1020, 810],
  ['iq-q', R1, 20.5, 30, 520, 1020, 1100],
  ['iq', R1, 21.5, 30, 1100, 1020, 300],
  ['level', R1, 0.5, 30, 520, 1020, 520],
  ['streak', R1, 1.6, 30, 1190, 1020, 440],
  ['gym', R1, 11.0, 30, 330, 1020, 1030],
];
for (const [name, src, t, x, y, w, h] of stills) {
  run(['-ss', String(t), '-i', src, '-frames:v', '1', '-vf', `crop=${w}:${h}:${x}:${y}`, '-q:v', '2', path.join(OUT, 'screens', name + '.jpg')]);
}
// App videos, sped up. [name, source, start, length, speed, crop]
const vids = [
  ['form', R2, 60.5, 6.0, 3, 'crop=1080:1000:0:840'],
  ['programs', R1, 65.5, 7.0, 3.5, 'crop=1040:1000:20:430'],
];
for (const [name, src, ss, t, sp, crop] of vids) {
  run(['-ss', String(ss), '-t', String(t), '-i', src, '-vf', `${crop},setpts=PTS/${sp},fps=30`, ...enc, path.join(OUT, 'screens', name + '.mp4')]);
}
console.log('assets ready in', OUT);
