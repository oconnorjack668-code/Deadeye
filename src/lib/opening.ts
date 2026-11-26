// src/lib/opening.ts
// Which opening animation plays, and the visit's slogan, decided before the
// first paint (docs/agent-os/design/2026-11-22-loading.md, founder's decisions
// of 22-23 Nov 2026).
//
// - Openings A (Lock on), B (Swish, B2) and C (Reticle) take turns, one per
//   cold open: a counter in localStorage (`dd-open-n`) goes 0, 1, 2, 0...; 0 is
//   A, so a brand-new device sees A first. If localStorage is blocked, the
//   pick is random.
// - Every time the app is opened from fully closed (founder, 25 Nov 2026).
//   A sessionStorage flag (`dd-opened`) is set as the opening is picked.
//   Fully closing the app (or the tab) clears sessionStorage, so the next open
//   plays it; coming back to the app from the background does not reload the
//   page, so it does not play, and a reload while the app is open keeps the
//   flag, so it does not play either. Page changes never run this script. If
//   sessionStorage is blocked, nothing plays (better none than one per load).
// - Not on the website's own pages (the landing page, legal pages, clubs,
//   competition, install): a visitor from a link gets the page, not a splash.
// - The slogan: a new one each time the app is opened, never the last one
//   shown (src/lib/slogans.ts).
//
// It sets <html data-open="a|b|c"> and <html data-sl="n">; CSS in
// src/components/brand/opening.css shows the matching scene. B's hoop and net
// are drawn by /opening/swish.js, fetched only when B is picked and motion is
// allowed. Tap or any key skips (html.dd-open-skip).

import { SHORT_SLOGANS } from './slogans';

export const OPENINGS = ['a', 'b', 'c'] as const;
export type Opening = (typeof OPENINGS)[number];

export const OPEN_COUNT_KEY = 'dd-open-n';
export const OPENED_KEY = 'dd-opened';
export const SLOGAN_KEY = 'dd-sl';
export const SLOGAN_LAST_KEY = 'dd-sl-last';
export const SWISH_SRC = '/opening/swish.js';
export const RUN_CLASS = 'dd-open-run';
export const RUN_EVENT = 'dd-open-run';
/** If the app never hydrates (a script error), the opening starts anyway after this. */
export const RUN_FALLBACK_MS = 6000;

/** Paths that are the website rather than the app: no opening there. */
// /clubs itself is the website's clubs page; /clubs/<id> is a club in the app.
export const NO_OPENING_PATH = /^\/(?:(?:privacy|terms|parents|parent-approval|competition|install|account-deletion|auth)(?:\/|$)|clubs\/?$)/;

/**
 * The shortest time the opening stays up once it starts: its whole length, so
 * the app never cuts it short (founder, 25 Nov 2026: "the user doesn't have
 * the chance to see it"). It only starts once the app is on screen
 * (html.dd-open-run, OpeningSplashRunner), so the whole of it is seen. The exit starts when the app is ready, but never sooner than this
 * and never later than the opening's own end.
 */
export const MIN_SHOW_MS: Record<Opening, number> = { a: 2000, b: 2600, c: 2000 };


export function isOpening(v: unknown): v is Opening {
  return v === 'a' || v === 'b' || v === 'c';
}

/**
 * How long to wait before ending the opening early, now that the app is
 * ready: elapsed is how long it has run, ownEnd when its exit would start on
 * its own. null means let it finish by itself (the minimum is already past
 * its own end, or it has reached the end).
 */
export function earlyExitDelay(minMs: number, elapsedMs: number, ownEndMs: number): number | null {
  const at = Math.max(minMs, elapsedMs);
  return at < ownEndMs ? at - elapsedMs : null;
}

/**
 * Plain ES5, self-contained and inlined as text in the head, after
 * THEME_SCRIPT. Keep it tiny: it runs before anything paints.
 */
export const OPENING_SCRIPT = `(function(){var d=document.documentElement,w=window,ss=null,ls=null,M=${SHORT_SLOGANS.length};
try{ss=w.sessionStorage;ss.getItem('${OPENED_KEY}')}catch(e){ss=null}
try{ls=w.localStorage;ls.getItem('${OPEN_COUNT_KEY}')}catch(e){ls=null}
function g(s,k){try{return s?s.getItem(k):null}catch(e){return null}}
function p(s,k,v){try{if(s)s.setItem(k,String(v))}catch(e){}}
var path=location.pathname;
if(path==='/'||${NO_OPENING_PATH.toString()}.test(path))return;
var fresh=!!ss&&!g(ss,'${OPENED_KEY}');
var k=parseInt(g(ss,'${SLOGAN_KEY}'),10);
if(fresh||!(k>=0&&k<M)){var l=parseInt(g(ls,'${SLOGAN_LAST_KEY}'),10),a=M>1&&l>=0&&l<M;k=Math.floor(Math.random()*(a?M-1:M));if(a&&k>=l)k++;p(ss,'${SLOGAN_KEY}',k);p(ls,'${SLOGAN_LAST_KEY}',k)}
d.setAttribute('data-sl',k);
if(!fresh)return;
p(ss,'${OPENED_KEY}',1);
var n;try{var r=ls.getItem('${OPEN_COUNT_KEY}');n=r===null?0:(parseInt(r,10)+1)%3;if(!(n>=0))n=0;ls.setItem('${OPEN_COUNT_KEY}',String(n))}catch(e){n=Math.floor(Math.random()*3)}
d.setAttribute('data-open','abc'.charAt(n));
function skip(){d.classList.add('dd-open-skip');document.removeEventListener('pointerdown',skip,true);document.removeEventListener('keydown',skip,true)}
document.addEventListener('pointerdown',skip,true);document.addEventListener('keydown',skip,true);
setTimeout(function(){if(d.getAttribute('data-open')&&!d.classList.contains('${RUN_CLASS}')){d.classList.add('${RUN_CLASS}');document.dispatchEvent(new Event('${RUN_EVENT}'))}},${RUN_FALLBACK_MS});
if(n===1){var s=document.createElement('script');s.src='${SWISH_SRC}';s.async=true;s.onerror=function(){d.setAttribute('data-open','a')};document.head.appendChild(s)}
})();`;
