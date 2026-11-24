// src/components/brand/OpeningSplash.tsx
// The opening animation: logo C locks on, with the visit's slogan, on a cold
// open of the app (docs/agent-os/design/2026-11-22-loading.md). Plain server
// HTML in the root layout, so it paints on the first frame with no
// JavaScript; it stays hidden unless the head script (src/lib/opening.ts)
// picked an opening for this load. The app renders underneath; this only
// covers it, and any tap or key skips it. Hidden from screen readers: it is
// decoration, and the page under it is already there.
import React from 'react';
import { BALL_LAYERS, CORNERS, WORDMARK } from './openingArt';
import { OpeningSplashRunner } from './OpeningSplashRunner';
import { SHORT_SLOGANS } from '@/lib/slogans';
import './opening.css';

const BRACKETS = ['tl', 'tr', 'bl', 'br'] as const;
const LAYERS = ['base', 'disc', 'dot', 'top'] as const;

// One rule per slogan: the head script's data-sl picks which line shows,
// before the first paint and before React runs
const SLOGAN_CSS = SHORT_SLOGANS.map((_, i) => `html[data-sl="${i}"] .dd-open-slogan [data-i="${i}"]{display:inline}`).join('');

const svg = (html: string) => ({ __html: html });
const EMPTY = { __html: '' };

export function OpeningSplash() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: SLOGAN_CSS }} />
      <div id="dd-open" aria-hidden="true">
        <div className="dd-open-box">
          <i className="dd-ln dd-ln-l" />
          <i className="dd-ln dd-ln-r" />
          <i className="dd-ln dd-ln-t" />
          <i className="dd-ln dd-ln-b" />
          {/* Opening B's hoop goes in these two (behind and in front of the
              ball), filled by /opening/swish.js, often before React hydrates:
              React leaves the inner HTML of a dangerouslySetInnerHTML element
              alone, so that is not a hydration mismatch */}
          <div className="dd-b-host dd-b-back" suppressHydrationWarning dangerouslySetInnerHTML={EMPTY} />
          <div className="dd-open-lock">
            <div className="dd-open-scope">
              <div className="dd-open-glow" />
              <div className="dd-open-bks">
                {BRACKETS.map((b, i) => (
                  <i key={b} className={`dd-bk dd-bk-${b}`} dangerouslySetInnerHTML={svg(CORNERS[i])} />
                ))}
              </div>
              <div className="dd-open-ballwrap">
                <div className="dd-open-ball">
                  {/* The disc and the seams turn in B's backspin; the lighting never moves */}
                  {LAYERS.map((l) => (
                    <div
                      key={l}
                      className={l === 'disc' || l === 'top' ? 'dd-lay dd-spin' : 'dd-lay'}
                      dangerouslySetInnerHTML={svg(BALL_LAYERS[l])}
                    />
                  ))}
                </div>
              </div>
              <div className="dd-open-ping" />
            </div>
            <div className="dd-open-word" dangerouslySetInnerHTML={svg(WORDMARK)} />
            <p className="dd-open-slogan">
              {SHORT_SLOGANS.map((s, i) => (
                <span key={s.text} data-i={i}>
                  {s.text}
                </span>
              ))}
            </p>
          </div>
          <div className="dd-b-host dd-b-front" suppressHydrationWarning dangerouslySetInnerHTML={EMPTY} />
        </div>
      </div>
      <OpeningSplashRunner />
    </>
  );
}
