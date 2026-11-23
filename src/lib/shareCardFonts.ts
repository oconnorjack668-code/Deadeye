// src/lib/shareCardFonts.ts
// Geist Regular, Bold and Black for the share cards. next/og only bundles Geist
// Regular, so without these the big numbers came out thin (and passing any
// fonts replaces the bundled one, so Regular is fetched too). Fetched once per server
// instance from Google Fonts as TTF (Satori cannot read woff2) and kept in
// memory. The request carries a fixed character set and nothing about the
// player. All three or none: if any fails, the card renders in the bundled font.

/** Printable ASCII and Latin-1 (Irish and European names of drills, teams and exercises). Fixed: never the player's text. */
const CHARSET = [...Array.from({ length: 95 }, (_, i) => 32 + i), ...Array.from({ length: 95 }, (_, i) => 161 + i)]
  .map((c) => String.fromCharCode(c))
  .join('');

export interface CardFont {
  name: string;
  data: ArrayBuffer;
  weight: 400 | 700 | 900;
  style: 'normal';
}

let cached: Promise<CardFont[]> | null = null;

async function loadWeight(weight: CardFont['weight']): Promise<CardFont | null> {
  const css = await fetch(`https://fonts.googleapis.com/css2?family=Geist:wght@${weight}&text=${encodeURIComponent(CHARSET)}`, {
    signal: AbortSignal.timeout(3000),
  }).then((r) => (r.ok ? r.text() : ''));
  const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
  if (!url) return null;
  const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
  if (!res.ok) return null;
  return { name: 'Geist', data: await res.arrayBuffer(), weight, style: 'normal' };
}

export function cardFonts(): Promise<CardFont[]> {
  if (!cached) {
    cached = Promise.all([loadWeight(400), loadWeight(700), loadWeight(900)])
      .then((fonts) => (fonts.every((x) => x !== null) ? (fonts as CardFont[]) : []))
      .catch(() => []);
    // A failed fetch is tried again on the next card, not remembered for the instance's life
    void cached.then((fonts) => {
      if (fonts.length === 0) cached = null;
    });
  }
  return cached;
}
