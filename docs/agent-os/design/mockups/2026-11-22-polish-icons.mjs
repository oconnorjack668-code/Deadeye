// Pulls the lucide icons the polish mockups use (lucide-react, ISC licence, already a dependency of the app)
// into 2026-11-22-polish-icons.json as inline SVG markup. Run once: node 2026-11-22-polish-icons.mjs <path to node_modules/lucide-react>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const root = process.argv[2];
if (!root) throw new Error('give the path to node_modules/lucide-react');
const names = ['mail','mail-check','target','dumbbell','camera','trophy','plus','x','layout-dashboard','calendar-check','book-open','flame','sparkles','chart-no-axes-column','party-popper','check','share-2','users','shield-check','star','zap','chevron-right','chevron-down','lock','eye','play','pause','skip-back','skip-forward','gauge','maximize','rotate-ccw','clock','crosshair','award','medal','crown','trending-up','activity','arrow-right','gift','smartphone','video','circle-check','circle-dot','undo-2','minus','shield','flag','timer','circle-help','badge-check','lightbulb','info','send','bell','volume-x','layers','bolt','rocket','arrow-up-right','download','user','link','sparkle','image','list-checks','chevron-left','square-pen','mail-open'];
const out = {};
for (const n of names) {
  const f = path.join(root, 'dist/esm/icons', `${n}.mjs`);
  if (!fs.existsSync(f)) { console.log('missing', n); continue; }
  const src = fs.readFileSync(f, 'utf8');
  const m = src.match(/const __iconData = (\{[\s\S]*?\n\});/);
  if (!m) { console.log('unparsed', n); continue; }
  const node = eval('(' + m[1] + ')').node;
  out[n] = node.map(([tag, attrs]) => {
    const a = Object.entries(attrs).filter(([k]) => k !== 'key').map(([k, v]) => `${k}="${v}"`).join(' ');
    return `<${tag} ${a}/>`;
  }).join('');
}
fs.writeFileSync(path.join(HERE, '2026-11-22-polish-icons.json'), JSON.stringify(out, null, 1));
console.log('wrote', Object.keys(out).length, 'icons');
