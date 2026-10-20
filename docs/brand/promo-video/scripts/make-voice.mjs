// Makes the three voice lines with Kokoro (am_adam, 1.12x). Needs kokoro-js installed somewhere:
// node scripts/make-voice.mjs <folder-with-node_modules/kokoro-js> assets/voice
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const [kokoroDir, outDir] = process.argv.slice(2);
const { KokoroTTS } = await import(pathToFileURL(path.join(kokoroDir,'node_modules','kokoro-js','dist','kokoro.js')).href);
const tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype: 'fp32', device: 'cpu' });
const lines = {
  'v1-hook': "Set your phone down and shoot. It counts for you.",
  'v2-tracker': "It calls your makes and misses as they happen. You just keep shooting.",
  'v3-end': "Deadeye's free to start. The first hundred players get three months of Pro.",
};
for (const [k, text] of Object.entries(lines)) { const a = await tts.generate(text, { voice: 'am_adam', speed: 1.12 }); await a.save(path.join(outDir, k + '.wav')); console.log('wrote', k); }
