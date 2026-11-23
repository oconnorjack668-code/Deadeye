// src/lib/shareCardFonts.ts
// Geist Regular, Bold and Black for the share cards. next/og only bundles Geist
// Regular, so without these the big numbers came out thin (and passing any
// fonts replaces the bundled one, so Regular is fetched too). Fetched once per server
// instance from Google Fonts as TTF (Satori cannot read woff2) and kept in
// memory. The request carries a fixed character set and nothing about the
// player. All three or none: if any fails, the card renders in the bundled font.
// next/og fetches any letter its fonts lack from Google Fonts by itself, so
// every piece of player text drawn on a card goes through cardText() first:
// letters outside CHARSET are dropped, and no typed letter ever leaves the server.

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/**
 * Printable ASCII, Latin-1 and Latin Extended-A (Irish and European names of
 * drills, teams and exercises), plus dashes, curly quotes and the ellipsis.
 * Fixed: never the player's text.
 */
export const CHARSET = [...range(32, 126), ...range(161, 255), ...range(0x100, 0x17f), 0x2013, 0x2014, ...range(0x2018, 0x201d), 0x2026]
  .map((c) => String.fromCharCode(c))
  .join('');

const ALLOWED = new Set(CHARSET);

/** Player text for a card, with any letter the loaded fonts don't cover removed. */
export function cardText(s: string | null | undefined): string {
  return [...(s ?? '')].filter((ch) => ALLOWED.has(ch)).join('').replace(/\s+/g, ' ').trim();
}

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
