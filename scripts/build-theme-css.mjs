// scripts/build-theme-css.mjs
// Builds src/app/theme.css: the light theme, and the dark theme restored inside
// anything that sits on video.
//
//   node scripts/build-theme-css.mjs
//
// Deadeye was built dark-only, with Tailwind's colour classes written straight
// into the components (text-zinc-400, bg-zinc-900...). Tailwind 4 turns each
// of those into a CSS variable, so a light theme does not need every
// component rewritten: it re-points the variables. The zinc scale is turned
// over (the page goes from near-black to light grey, cards to white, text to
// near-black), and the light accent shades used for text on a dark background
// (orange-400, emerald-300...) become the deep shades that read on a light one.
// The values come from Tailwind's own palette, so they stay exact.
//
// Run it again after upgrading Tailwind. See docs/design.md, "Light and dark".
import fs from 'node:fs';

const THEME = fs.readFileSync('node_modules/tailwindcss/theme.css', 'utf8');
const value = (name) => {
  const m = THEME.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  if (!m) throw new Error(`no --color-${name} in tailwindcss/theme.css`);
  return m[1].trim();
};

const HUES = ['orange', 'red', 'emerald', 'amber', 'cyan', 'sky', 'blue', 'purple', 'violet', 'pink', 'yellow', 'green', 'indigo', 'teal', 'lime', 'rose', 'fuchsia'];
const SHADES = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950'];

// Secondary text: Tailwind's zinc-500 is under 4.5:1 on Deadeye's cards
// (3.8:1). These pass in each theme (5.5:1 on a dark card, 5.8:1 on white).
const DARK_ZINC_500 = '#8b8b94';
const LIGHT_ZINC_500 = '#5f5f68';

// Light: page zinc-100, cards white, inner rows a grey on white, text near-black
const LIGHT_ZINC = {
  '950': value('zinc-100'),
  '900': '#ffffff',
  '800': value('zinc-200'),
  '700': value('zinc-300'),
  '600': value('zinc-400'),
  '500': LIGHT_ZINC_500,
  '400': value('zinc-600'),
  '300': value('zinc-700'),
  '200': value('zinc-800'),
  '100': value('zinc-900'),
  '50': value('zinc-950'),
};

// Light accents: shades for text on dark become shades for text on light, and
// the dark tints become light ones. 500 to 700 (buttons, bars) stay put.
const ACCENT_MAP = { '50': '950', '100': '800', '200': '800', '300': '700', '400': '700', '800': '200', '900': '100', '950': '50' };

const lines = [];
const block = (selector, decls) => lines.push(`${selector} {\n${decls.map((d) => `  ${d}`).join('\n')}\n}\n`);

const dark = [
  '--background: #09090b;',
  '--foreground: #f4f4f5;',
  'color-scheme: dark;',
  `--color-white: ${value('white')};`,
  ...SHADES.map((s) => `--color-zinc-${s}: ${s === '500' ? DARK_ZINC_500 : value(`zinc-${s}`)};`),
  ...HUES.flatMap((h) => Object.keys(ACCENT_MAP).map((s) => `--color-${h}-${s}: ${value(`${h}-${s}`)};`)),
];
const light = [
  `--background: ${value('zinc-100')};`,
  `--foreground: ${value('zinc-900')};`,
  'color-scheme: light;',
  // text-white is the app's main text colour, so in light it is near-black.
  // Text on a solid accent button keeps white: see the rule further down.
  `--color-white: ${value('zinc-950')};`,
  ...SHADES.map((s) => `--color-zinc-${s}: ${LIGHT_ZINC[s]};`),
  ...HUES.flatMap((h) => Object.entries(ACCENT_MAP).map(([from, to]) => `--color-${h}-${from}: ${value(`${h}-${to}`)};`)),
];

// Solid accent backgrounds, as whole class tokens (~=), so a tint like
// bg-orange-600/15 is not one of them
const solid = HUES.flatMap((h) => ['500', '600', '700'].flatMap((s) => [`[class~="bg-${h}-${s}"]`, `[class~="from-${h}-${s}"]`]));
// Light-coloured solids that carry dark text
const brightSolid = ['amber', 'yellow', 'lime'].flatMap((h) => ['300', '400', '500'].map((s) => `[class~="bg-${h}-${s}"]`));

lines.push(`/* src/app/theme.css - written by scripts/build-theme-css.mjs. Do not edit by hand. */\n`);
lines.push(`/* Dark is the default (Tailwind's own values, in globals.css). This restores it
   explicitly, and inside anything on black - the shot tracker's picture, video
   replays - which stays dark in the light theme, because its overlays sit on video. */`);
block(
  [':root[data-theme="dark"]', ':root[data-theme="light"] :is(.bg-black, [class*="bg-black/"], [data-theme="dark"])'].join(',\n'),
  dark
);
lines.push(`/* Light: picked in Settings, or the phone's own setting when left on System */`);
// :root[...] so it outranks the plain :root defaults in globals.css, which come later
block(':root[data-theme="light"]', light);
lines.push(`/* Text and icons on a solid accent button stay white in light */`);
block(
  [`[data-theme="light"] :is(${solid.join(', ')}):is(.text-white, .fill-white)`, `[data-theme="light"] :is(${solid.join(', ')}) :is(.text-white, .fill-white)`].join(',\n'),
  ['color: #ffffff;', 'fill: #ffffff;']
);
lines.push(`/* ...and dark text on a bright one stays dark */`);
block(
  `[data-theme="light"] :is(${brightSolid.join(', ')}):is(.text-zinc-950, .text-zinc-900, .text-black)`,
  ['color: #09090b;']
);

fs.writeFileSync('src/app/theme.css', lines.join('\n'));
console.log(`src/app/theme.css: ${dark.length} dark and ${light.length} light declarations`);
