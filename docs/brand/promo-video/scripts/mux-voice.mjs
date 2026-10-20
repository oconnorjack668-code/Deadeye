// Adds sound to the silent picture render (renders/picture.mp4):
//   renders/silent.mp4 = picture + sound effects
//   renders/voice.mp4  = picture + sound effects + the three Kokoro voice lines
// Run: node scripts/mux-voice.mjs
// Voice timings (seconds) match the composition: the hook over the first shot, the
// tracker line over the make/miss cuts, the offer over the close.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const FF = process.env.FFMPEG || 'C:/Users/Vivobook S16/AppData/Local/Temp/deadeye-bench/ffmpeg-bin/ffmpeg.exe';
// node scripts/mux-voice.mjs classic   -> ../promo-classic/renders/silent.mp4 and voice.mp4 from ../promo-classic/renders/picture.mp4
const CLASSIC = process.argv[2] === 'classic';
// the first-promo version places each phrase under its caption (make-voice-phrases.mjs)
const lines = CLASSIC ? [['p1-set', 0.0], ['p2-counts', 1.34], ['p3-calls', 2.66], ['p4-keep', 5.46], ['p5-end', 19.45]] : [['v1-hook', 0.2], ['v2-tracker', 4.1], ['v3-end', 26.9]];
const PIC = CLASSIC ? '../promo-classic/renders/picture.mp4' : 'renders/picture.mp4';
const SFX = CLASSIC ? 'assets/sfx/sfx-classic.wav' : 'assets/sfx/sfx.wav';
const OUT_SILENT = CLASSIC ? '../promo-classic/renders/silent.mp4' : 'renders/silent.mp4';
const OUT_VOICE = CLASSIC ? '../promo-classic/renders/voice.mp4' : 'renders/voice.mp4';
const SFX_VOLUME = 0.55; // under the voice
const SFX_VOLUME_SILENT = 0.9; // nothing to compete with
const p = (f) => path.join(ROOT, f);
const aac = ['-c:v', 'copy', '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-b:a', '192k', '-shortest'];

// silent version: picture + effects
execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', p(PIC), '-i', p(SFX),
  '-filter_complex', `[1:a]volume=${SFX_VOLUME_SILENT},apad[aout]`, '-map', '0:v', '-map', '[aout]', ...aac, p(OUT_SILENT)], { stdio: 'inherit' });

// voice version
const inputs = lines.flatMap(([n]) => ['-i', p(`assets/voice/${n}.wav`)]);
const delays = lines.map(([, t], i) => `[${i + 2}:a]aformat=channel_layouts=stereo,adelay=${Math.round(t * 1000)}|${Math.round(t * 1000)},volume=1.3[a${i}]`);
const mix = `[1:a]volume=${SFX_VOLUME}[sfx];[sfx]${lines.map((_, i) => `[a${i}]`).join('')}amix=inputs=${lines.length + 1}:normalize=0,alimiter=limit=0.8:level=0,apad[aout]`;
execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', p(PIC), '-i', p(SFX), ...inputs,
  '-filter_complex', [...delays, mix].join(';'), '-map', '0:v', '-map', '[aout]', ...aac, p(OUT_VOICE)], { stdio: 'inherit' });
console.log('wrote', OUT_SILENT, 'and', OUT_VOICE);
