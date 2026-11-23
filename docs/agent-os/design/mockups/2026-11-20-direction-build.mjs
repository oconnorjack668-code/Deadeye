// Builds the three visual-direction mockups (A Arena, B HUD, C Glass) x three screens (Today for a new player,
// the first-session result, Watch it back paused on a shot). Draft only. Made-up data, no real player's name.
// Icons: Phosphor Icons (MIT), inlined from @phosphor-icons/core (npm pack @phosphor-icons/core, then set PHOSPHOR_DIR
// to its assets folder). Fonts: Google Fonts (OFL), linked in each page. The footage frame is a local file.
// Run: node 2026-11-20-direction-build.mjs   then   node 2026-11-20-direction-shot.mjs <html files>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { styleA, todayA, resultA, watchA } from './2026-11-20-direction-a.mjs';
import { styleB, todayB, resultB, watchB } from './2026-11-20-direction-b.mjs';
import { styleC, todayC, resultC, watchC } from './2026-11-20-direction-c.mjs';

const OUT = path.dirname(fileURLToPath(import.meta.url));
const P = '2026-11-20-direction-';

const FONTS = {
  a: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:ital,wght@0,600;0,700;0,800;0,900;1,700;1,800;1,900&family=Barlow:wght@500;600;700&display=swap',
  b: 'https://fonts.googleapis.com/css2?family=Chakra+Petch:ital,wght@0,500;0,600;0,700;1,600;1,700&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@500;600&display=swap',
  c: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Plus+Jakarta+Sans:wght@500;600;700&display=swap',
};

const DIRS = {
  a: { name: 'Arena', style: styleA, pages: { today: todayA, result: resultA, watch: watchA } },
  b: { name: 'HUD', style: styleB, pages: { today: todayB, result: resultB, watch: watchB } },
  c: { name: 'Glass', style: styleC, pages: { today: todayC, result: resultC, watch: watchC } },
};

for (const [key, d] of Object.entries(DIRS)) {
  for (const [page, fn] of Object.entries(d.pages)) {
    const html = `<!doctype html>
<html lang="en-IE">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Deadeye visual direction ${key.toUpperCase()} (${d.name}): ${page}</title>
<!-- Designer proposal 2026-11-20, draft only. Direction ${key.toUpperCase()}: ${d.name}. Made-up data. Not built, not in docs/design.md.
     Fonts: Google Fonts (OFL). Icons: Phosphor (MIT). Footage frame (watch page): local file, consent confirmed by the founder, do not upload. -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="${FONTS[key]}" rel="stylesheet">
<style>${d.style}</style>
</head>
<body>
${fn()}
</body>
</html>
`;
    fs.writeFileSync(path.join(OUT, `${P}${key}-${page}.html`), html);
    console.log('wrote', `${P}${key}-${page}.html`);
  }
}
