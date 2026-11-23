// src/lib/shareCards.tsx
// Share card layouts (rendered to PNG by next/og in /api/share/[kind]).
// Brand round 2026-11-22 (docs/agent-os/design/2026-11-22-polish.md, share cards;
// mockups 2026-11-22-polish-share-*): 1080 x 1920 story and 1080 x 1350 feed,
// heavy white numbers with an orange glow, "AIM IS EARNED" in brand red, the
// player's own shot chart. The name is off unless the player turns it on. We
// never add a face, school or town; text the player typed (an opponent, an
// exercise) is drawn as typed, filtered by cardText().
// next/og only supports flexbox: every element with more than one child needs display: flex.
import React from 'react';
import { cardText } from '@/lib/shareCardFonts';
import { sessionCrop, shotChartLayout, shotChartSvg, type ChartZoneInput } from '@/lib/shotChart';

export type CardFormat = 'story' | 'feed';
export const CARD_WIDTH = 1080;
export const cardHeight = (format: CardFormat) => (format === 'feed' ? 1350 : 1920);
export const asCardFormat = (v: string | null | undefined): CardFormat => (v === 'feed' ? 'feed' : 'story');

const ORANGE = '#f97316';
const ORANGE_TEXT = '#fb923c';
const BRAND_RED = '#f87171';
const MUTED = '#d4d4d8';
const GLOW = '0 0 90px rgba(249,115,22,0.55), 0 0 30px rgba(249,115,22,0.25)';

/** Where things sit, by size. Story keeps everything inside y 270 to 1500 (the app chrome covers the rest). */
const POS = {
  story: { head: 300, pill: 415, num: 520, numPx: 345, pct: 832, pctPx: 124, sub: 968, court: 1030, courtW: 640, bottom: 1500 },
  feed: { head: 76, pill: 190, num: 292, numPx: 330, pct: 604, pctPx: 120, sub: 740, court: 800, courtW: 640, bottom: 1290 },
} as const;

export const pct = (m: number, a: number) => (a > 0 ? Math.round((m / a) * 100) : 0);
const shortDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IE', { day: 'numeric', month: 'short' });
const niceDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' });
export const titleCase = (s: string) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * The name printed on a card: nothing unless the player switched "Show my
 * name" on, and then only the first name (no surname, school or place).
 */
export function cardName(displayName: string | null | undefined, show: boolean): string | null {
  if (!show) return null;
  const first = cardText(displayName).split(' ')[0] ?? '';
  return first ? first.slice(0, 20) : null;
}

const abs = (top: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  position: 'absolute',
  left: 0,
  // Satori does not stretch an absolute box between left and right: give the width
  width: CARD_WIDTH,
  top,
  display: 'flex',
  justifyContent: 'center',
  ...extra,
});

export function Frame({
  icon,
  name,
  date,
  format,
  children,
}: {
  icon: string | null;
  /** First name, or null (the default) for no name. */
  name: string | null;
  /** yyyy-mm-dd */
  date: string;
  format: CardFormat;
  children: React.ReactNode;
}) {
  const h = cardHeight(format);
  const p = POS[format];
  const right = `${name ? `${name} · ` : ''}${shortDate(date)}`.toUpperCase();
  return (
    <div
      style={{
        width: CARD_WIDTH,
        height: h,
        display: 'flex',
        position: 'relative',
        backgroundColor: '#09090b',
        backgroundImage: `radial-gradient(80% 42% at 50% ${format === 'story' ? 38 : 40}%, rgba(249,115,22,0.30), rgba(9,9,11,0) 72%)`,
        color: '#fff',
        fontFamily: 'Geist, sans-serif',
      }}
    >
      <div style={{ position: 'absolute', left: 90, width: CARD_WIDTH - 180, top: p.head, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* next/image cannot be used here: Satori only understands plain img. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {icon ? <img src={icon} width={84} height={84} style={{ borderRadius: 9999 }} alt="" /> : null}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 54, fontWeight: 900, lineHeight: 1, letterSpacing: -1 }}>DEADEYE</div>
            <div style={{ fontSize: 26, fontWeight: 700, color: BRAND_RED, letterSpacing: 4.7, marginTop: 6 }}>AIM IS EARNED</div>
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, color: MUTED, letterSpacing: 1.5 }}>{right}</div>
      </div>
      {children}
    </div>
  );
}

/** The space under the header, for the cards that flow rather than sit at fixed places. */
function Body({ format, children }: { format: CardFormat; children: React.ReactNode }) {
  const p = POS[format];
  return (
    <div
      style={{
        position: 'absolute',
        left: 90,
        width: CARD_WIDTH - 180,
        top: p.head + 140,
        height: p.bottom - p.head - 140,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      {children}
    </div>
  );
}

function Stat({ value, label, color = '#fff', size = 84 }: { value: string; label: string; color?: string; size?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1, flexBasis: 0 }}>
      <div style={{ display: 'flex', fontSize: size, fontWeight: 900, color, lineHeight: 1 }}>{value}</div>
      <div style={{ display: 'flex', fontSize: 28, fontWeight: 700, color: '#a1a1aa', letterSpacing: 4, marginTop: 10 }}>{label.toUpperCase()}</div>
    </div>
  );
}

/** The player's own shot chart: court and zones as an image, chips laid over it (Satori cannot draw SVG text). */
function CardChart({ zones, maxW, maxH }: { zones: ChartZoneInput[]; maxW: number; maxH: number }) {
  const crop = sessionCrop(zones);
  const [x0, x1] = crop.xRange ?? [-28, 528];
  const tall = ((crop.yMax ?? 47) - (crop.yMin ?? -3)) * 10;
  // As wide as it may be without running past the bottom of the safe area
  const width = Math.round(Math.min(maxW, (maxH * (x1 - x0)) / tall));
  const layout = shotChartLayout(zones, { id: 'card', renderW: width, pctPx: 38, subPx: 25, ...crop });
  const { x: vx, y: vy, h: vh } = layout.viewBox;
  const k = layout.k;
  const src = `data:image/svg+xml;base64,${Buffer.from(shotChartSvg(layout)).toString('base64')}`;
  return (
    <div style={{ display: 'flex', position: 'relative', width, height: Math.round(vh * k) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} width={width} height={Math.round(vh * k)} alt="" />
      {layout.chips.map((c) => {
        const left = (c.cx - c.w / 2 - vx) * k;
        const top = (c.cy - c.h / 2 - vy) * k;
        return (
          <div key={c.zone} style={{ display: 'flex', position: 'absolute', left, top, width: c.w * k, height: c.h * k }}>
            {c.pointer ? (
              // A diamond half under the chip reads as the pointer (Satori draws no border triangles)
              <div
                style={{
                  position: 'absolute',
                  left: (c.w * k) / 2 - 10,
                  top: -10,
                  width: 20,
                  height: 20,
                  backgroundColor: c.band.edge,
                  transform: 'rotate(45deg)',
                }}
              />
            ) : null}
            <div
              style={{
                display: 'flex',
                width: '100%',
                height: '100%',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                borderRadius: c.h * k * 0.32,
                backgroundColor: 'rgba(9,9,11,0.9)',
                border: `2px solid ${c.band.edge}`,
              }}
            >
              <div style={{ display: 'flex', fontSize: 38, fontWeight: 900, color: '#fff' }}>{`${c.pct}%`}</div>
              {c.solo ? null : <div style={{ display: 'flex', fontSize: 25, fontWeight: 700, color: MUTED }}>{`${c.makes}/${c.attempts}`}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export interface SessionCardData {
  format: CardFormat;
  minutes: number;
  drills: number;
  zones: ChartZoneInput[];
  /** True only when this session beat (or, with enough shots, set) the player's best %. */
  personalBest: boolean;
}

export function SessionCard({ format, minutes, drills, zones, personalBest }: SessionCardData) {
  const p = POS[format];
  const makes = zones.reduce((n, z) => n + z.makes, 0);
  const attempts = zones.reduce((n, z) => n + z.attempts, 0);
  const spots = zones.filter((z) => z.attempts > 0).length;
  // "8/10" is drawn at full size; longer scores shrink so "120/200" still fits the width
  const numPx = Math.round(p.numPx * Math.min(1, 4 / `${makes}/${attempts}`.length));
  if (attempts === 0) {
    return (
      <Body format={format}>
        <div style={{ display: 'flex' }}>
          <Stat value={`${minutes}`} label="minutes" size={200} />
          <Stat value={`${drills}`} label={drills === 1 ? 'drill' : 'drills'} size={200} />
        </div>
      </Body>
    );
  }
  return (
    <>
      {personalBest ? (
        <div style={abs(p.pill)}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              height: 84,
              padding: '0 44px',
              borderRadius: 9999,
              border: '2px solid rgba(251,146,60,0.5)',
              backgroundColor: 'rgba(249,115,22,0.15)',
              color: '#fdba74',
              fontSize: 36,
              fontWeight: 700,
              letterSpacing: 5,
            }}
          >
            NEW PERSONAL BEST
          </div>
        </div>
      ) : null}
      <div style={abs(p.num + (p.numPx - numPx) / 2, { fontSize: numPx, fontWeight: 900, lineHeight: 0.9, letterSpacing: -numPx * 0.035, textShadow: GLOW })}>
        <span>{makes}</span>
        <span style={{ color: '#71717a' }}>/</span>
        <span>{attempts}</span>
      </div>
      <div style={abs(p.pct, { fontSize: p.pctPx, fontWeight: 900, lineHeight: 1, color: ORANGE_TEXT })}>{`${pct(makes, attempts)}%`}</div>
      <div style={abs(p.sub, { fontSize: 40, fontWeight: 700, color: MUTED })}>
        {`${attempts} ${attempts === 1 ? 'shot' : 'shots'} from ${spots} ${spots === 1 ? 'spot' : 'spots'}`}
      </div>
      {spots > 0 ? (
        <div style={abs(p.court)}>
          <CardChart zones={zones} maxW={p.courtW} maxH={p.bottom - p.court} />
        </div>
      ) : null}
    </>
  );
}

export interface WorkoutCardData {
  format: CardFormat;
  date: string;
  type: string;
  minutes: number;
  sets: number;
  volume: number;
  unit: string;
  prs: number;
  /** reps: the reps, or a time or distance already formatted ("45s", "20 m"). */
  best: Array<{ exercise: string; weight: number | null; reps: number | string; pr: boolean }>;
}

export function WorkoutCard({ format, date, type, minutes, sets, volume, unit, prs, best }: WorkoutCardData) {
  return (
    <Body format={format}>
      <div style={{ display: 'flex', fontSize: 36, color: MUTED }}>{`${titleCase(cardText(type))} workout · ${niceDate(date)}`}</div>
      <div style={{ display: 'flex', marginTop: 40 }}>
        <Stat value={`${sets}`} label="sets" color={ORANGE} />
        <Stat value={`${minutes}`} label="minutes" />
        <Stat value={Math.round(volume).toLocaleString('en-IE')} label={`${unit} lifted`} />
      </div>
      {prs > 0 && (
        <div style={{ display: 'flex', marginTop: 36, fontSize: 40, fontWeight: 800, color: '#fbbf24' }}>
          {`${prs} personal ${prs === 1 ? 'record' : 'records'}!`}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 36 }}>
        {best.slice(0, 5).map((b) => (
          <div key={b.exercise} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 34, marginTop: 14 }}>
            <div style={{ display: 'flex' }}>{cardText(b.exercise)}</div>
            <div style={{ display: 'flex', color: b.pr ? '#fbbf24' : MUTED }}>
              {`${b.weight ? `${Math.round(b.weight)} ${unit} × ` : ''}${b.reps}${b.pr ? ' PR' : ''}`}
            </div>
          </div>
        ))}
      </div>
    </Body>
  );
}

export interface RankCardData {
  format: CardFormat;
  /** The tier name. */
  rank: string;
  level: number;
  /** 0 to 1 of the way to the next level */
  progress: number;
  /** XP to the next level, 0 at the top */
  toNext: number;
  xp: number;
  streak: number;
  sessions: number;
  badges: number;
}

function LevelRing({ size, progress }: { size: number; progress: number }) {
  const r = size / 2 - 30;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><defs><linearGradient id="rg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f97316"/><stop offset="1" stop-color="#fbbf24"/></linearGradient></defs><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#27272a" stroke-width="40"/>${
    p > 0
      ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#rg)" stroke-width="40" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - p)}" transform="rotate(-90 ${size / 2} ${size / 2})"/>`
      : ''
  }</svg>`;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`} width={size} height={size} alt="" />;
}

export function RankCard({ format, rank, level, progress, toNext, xp, streak, sessions, badges }: RankCardData) {
  const big = format === 'story';
  const D = big ? 600 : 500;
  const top = big ? 410 : 200;
  const statsTop = big ? 1285 : 1000;
  return (
    <>
      <div style={{ position: 'absolute', left: (CARD_WIDTH - D) / 2, top, width: D, height: D, display: 'flex' }}>
        <LevelRing size={D} progress={progress} />
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: D,
            height: D,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, color: '#a1a1aa', letterSpacing: 11 }}>LEVEL</div>
          <div style={{ display: 'flex', fontSize: big ? 310 : 260, fontWeight: 900, lineHeight: 0.9, textShadow: GLOW }}>{`${level}`}</div>
        </div>
      </div>
      <div style={abs(top + D - 50)}>
        <div
          style={{
            display: 'flex',
            fontSize: 38,
            fontWeight: 700,
            letterSpacing: 6,
            padding: '16px 50px',
            borderRadius: 9999,
            border: '2px solid rgba(251,146,60,0.5)',
            backgroundColor: '#09090b',
            color: '#fdba74',
          }}
        >
          {rank.toUpperCase()}
        </div>
      </div>
      <div style={abs(top + D + 55, { flexDirection: 'column', alignItems: 'center' })}>
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontSize: 80, fontWeight: 900 }}>{xp.toLocaleString('en-IE')}</span>
          <span style={{ fontSize: 44, fontWeight: 700, color: MUTED, marginLeft: 12 }}>XP</span>
        </div>
        {toNext > 0 ? (
          <div style={{ display: 'flex', fontSize: 38, fontWeight: 700, color: MUTED, marginTop: 8 }}>{`${toNext} XP to Level ${level + 1}`}</div>
        ) : null}
      </div>
      <div style={{ position: 'absolute', left: 90, width: CARD_WIDTH - 180, top: statsTop, display: 'flex' }}>
        <Stat value={`${streak}`} label="day streak" size={big ? 100 : 84} />
        <Stat value={`${sessions}`} label="sessions" size={big ? 100 : 84} />
        <Stat value={`${badges}`} label="badges" size={big ? 100 : 84} />
      </div>
    </>
  );
}

export interface GameCardData {
  format: CardFormat;
  date: string;
  opponent: string | null;
  result: string | null;
  score: string | null;
  points: number;
  rebounds: number;
  assists: number;
  line: Array<{ label: string; value: string }>;
}

export function GameCard({ format, date, opponent, result, score, points, rebounds, assists, line }: GameCardData) {
  const tag = result === 'win' ? 'WIN' : result === 'loss' ? 'LOSS' : result === 'draw' ? 'DRAW' : null;
  return (
    <Body format={format}>
      <div style={{ display: 'flex', fontSize: 36, color: MUTED }}>{`${cardText(opponent) ? `vs ${cardText(opponent)}` : 'Game day'} · ${niceDate(date)}`}</div>
      {tag && (
        <div style={{ display: 'flex', marginTop: 16, fontSize: 34, fontWeight: 800, color: result === 'win' ? '#34d399' : '#a1a1aa' }}>
          {`${tag}${score ? ` ${score}` : ''}`}
        </div>
      )}
      <div style={{ display: 'flex', marginTop: 40 }}>
        <Stat value={`${points}`} label="points" color={ORANGE} />
        <Stat value={`${rebounds}`} label="rebounds" />
        <Stat value={`${assists}`} label="assists" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', marginTop: 48 }}>
        {line.map((l) => (
          <div key={l.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 34, marginTop: 14 }}>
            <div style={{ display: 'flex', color: '#a1a1aa' }}>{l.label}</div>
            <div style={{ display: 'flex' }}>{l.value}</div>
          </div>
        ))}
      </div>
    </Body>
  );
}
