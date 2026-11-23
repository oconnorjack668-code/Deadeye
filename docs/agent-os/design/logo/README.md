# Deadeye logo files (22 Nov 2026)

**Decided 2026-11-22 (founder): improved C is the Deadeye logo.** The builder replaces the app icon and logo files later; the designer does not. Done on branch `exp/D9-logo-c` (23 Nov 2026): `node scripts/build-app-icons.mjs` rebuilds every `public/` icon, `src/app/favicon.ico`, `public/logo.svg`, `public/logo-mark.svg` and the two SVGs in `docs/brand/` from this folder's `2026-11-22-logo-lib.mjs`; `__tests__/app-icons.test.ts` fails if they fall out of step with it.

Chosen: `2026-11-22-deadeye-logo-improved-c.svg` (lockup with wordmark), `2026-11-22-deadeye-logo-improved-c-mark.svg` (brackets and ball only), and the PNGs `-dark-1024.png` and `-light-1024.png`. The other versions (`faithful`, `improved-a`, `improved-b`) stay here for reference. Board: `2026-11-22-deadeye-logo-comparison.png`.

What C changes from the original (`public/icon-store-1024.png`): brackets 32 units thick and bars 42 (the originals are 21 and 32, about 1 px at 48 px), brackets tucked closer and cut at 45 degrees, a bigger ball, a lit red face with a soft top highlight, a bevelled ring, a dark disc with an edge so it reads against the red, and a tapered seam. Same shape, same red, same wordmark placement.

For the builder, to replace later (check each is still in use): `public/logo.png`, `public/logo.webp` (192 px, used by `src/components/Logo.tsx`), `public/icon-192.png`, `public/icon-512.png`, `public/icon-maskable-512.png` (needs the mark inside the safe zone: use the `-mark.svg`), `public/icon-store-1024.png`, `public/icon-play-512.png`, `public/apple-touch-icon.png`, and the files in `docs/brand/`. Export PNGs from the SVG; do not trace the old PNGs again.

The wordmark is Anton outlines (SIL OFL), sized to the original letters; the original typeface is not on file. `2026-11-22-logo-lib.mjs` holds the measurements and `2026-11-22-logo-build.mjs` regenerates every file (`node 2026-11-22-logo-build.mjs`, needs Chrome).
