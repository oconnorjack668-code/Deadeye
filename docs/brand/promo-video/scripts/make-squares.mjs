// 1080x1080 cuts of the finals: the full upright video in the middle, over a blurred,
// darkened copy of itself, so nothing (captions, rim, count) is cropped off.
// Run: node scripts/make-squares.mjs   (reads and writes docs/brand/deadeye-promo-{voice,silent}*.mp4)
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BRAND = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FF = process.env.FFMPEG || 'C:/Users/Vivobook S16/AppData/Local/Temp/deadeye-bench/ffmpeg-bin/ffmpeg.exe';
for (const v of ['voice', 'silent']) {
  execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', path.join(BRAND, `deadeye-promo-${v}.mp4`),
    '-filter_complex', '[0:v]split[a][b];[a]scale=1080:1920,crop=1080:1080:0:420,boxblur=40:3,eq=brightness=-0.18[bg];[b]scale=608:1080[fg];[bg][fg]overlay=(W-w)/2:0,format=yuv420p[v]',
    '-map', '[v]', '-map', '0:a', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-c:a', 'copy', '-movflags', '+faststart',
    path.join(BRAND, `deadeye-promo-${v}-square.mp4`)], { stdio: 'inherit' });
}
console.log('square cuts written');
