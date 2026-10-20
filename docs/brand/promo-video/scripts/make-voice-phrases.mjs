// The same voice lines as make-voice.mjs, one file per phrase, so each phrase can be placed
// exactly under its caption (used by the first-promo version).
// am_adam at 1.04x (a touch slower than the 1.12x full lines, for a smoother read)
// node scripts/make-voice-phrases.mjs <folder-with-node_modules/kokoro-js> assets/voice
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const [kokoroDir, outDir] = process.argv.slice(2);
const { KokoroTTS } = await import(pathToFileURL(path.join(kokoroDir, 'node_modules', 'kokoro-js', 'dist', 'kokoro.js')).href);
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'fp32', device: 'cpu' });
const phrases = {
  'p1-set': 'Set your phone down and shoot.',
  'p2-counts': 'It counts for you.',
  'p3-calls': 'It calls your makes and misses as they happen.',
  'p4-keep': 'You just keep shooting.',
  'p5-end': "Deadeye's free to start. The first hundred players get three months of Pro.",
};
for (const [k, text] of Object.entries(phrases)) { const a = await tts.generate(text, { voice: 'am_adam', speed: 1.04 }); await a.save(path.join(outDir, k + '.wav')); console.log('wrote', k); }
