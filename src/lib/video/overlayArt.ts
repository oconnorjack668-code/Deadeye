// src/lib/video/overlayArt.ts
// How the tracker's overlay is drawn on a canvas. Shared by the live picture
// (ShotTracker's draw) and a saved video (TrackerVideoExport), so what is
// saved looks like what the player saw.
//
// Sizes are in `u`: one CSS pixel on the live overlay. A saved video picks its
// own u from its size (hudUnit), so the overlay takes the same share of the
// picture as it does full screen on a phone.
//
// Everything that moves is a function of the time passed in, never of how many
// times it was drawn: a saved video is drawn frame by frame at the video's
// pace and has to come out the same however fast the phone is.
import { rimYAt, type Rim } from './shotDetector';
import { BANNER_MS, FLASH_MS, heatLevel, type Box, type OverlayState, type RimTone } from './overlayTimeline';
import { pct } from './shotStats';

type Ctx = CanvasRenderingContext2D;

const ORANGE = '#f97316';
const EMERALD = '#34d399';
const RED = '#f87171';

/** u for a saved video: the overlay sized as on a phone held sideways, full screen. */
export function hudUnit(width: number, height: number): number {
  return Math.min(width, height) / 360;
}

function rimEnds(rim: Rim, w: number, h: number): [[number, number], [number, number]] {
  const left = rim.x - rim.width / 2;
  const right = rim.x + rim.width / 2;
  return [
    [left * w, rimYAt(rim, left) * h],
    [right * w, rimYAt(rim, right) * h],
  ];
}

/**
 * The rim line the tracking is measured against: the span between the two
 * taps, following the rim's tilt. It takes the colour of a call for a moment
 * after one, so a make reads on the hoop itself.
 */
export function drawRim(ctx: Ctx, w: number, h: number, rim: Rim, u: number, tone: RimTone = null) {
  const colour = tone === 'make' ? EMERALD : tone === 'miss' ? RED : ORANGE;
  const ends = rimEnds(rim, w, h);
  ctx.save();
  ctx.lineCap = 'round';
  // A wide soft line under the sharp one keeps it visible on a busy gym wall
  ctx.strokeStyle = tone ? `${colour}66` : 'rgba(0,0,0,0.45)';
  ctx.lineWidth = (tone ? 9 : 6) * u;
  ctx.beginPath();
  ctx.moveTo(ends[0][0], ends[0][1]);
  ctx.lineTo(ends[1][0], ends[1][1]);
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3 * u;
  ctx.beginPath();
  ctx.moveTo(ends[0][0], ends[0][1]);
  ctx.lineTo(ends[1][0], ends[1][1]);
  ctx.stroke();
  ctx.fillStyle = colour;
  for (const [ex, ey] of ends) {
    ctx.beginPath();
    ctx.arc(ex, ey, 4 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * The ball and the path it just took, as a comet: a tail that thickens toward
 * the ball, and a ring round the ball itself. On a hot streak the tail burns.
 */
export function drawBall(ctx: Ctx, w: number, h: number, trail: ReadonlyArray<{ x: number; y: number }>, ball: Box | null, u: number, heat = 0) {
  ctx.save();
  ctx.lineCap = 'round';
  for (let i = 1; i < trail.length; i++) {
    const age = i / (trail.length - 1 || 1);
    ctx.strokeStyle = heat
      ? `rgba(${255}, ${Math.round(220 - 130 * age)}, ${Math.round(80 - 60 * age)}, ${0.25 + 0.6 * age})`
      : `rgba(255, ${Math.round(255 - 110 * age)}, ${Math.round(255 - 200 * age)}, ${0.15 + 0.6 * age})`;
    ctx.lineWidth = (1.5 + (heat ? 6 : 4) * age) * u;
    ctx.beginPath();
    ctx.moveTo(trail[i - 1].x * w, trail[i - 1].y * h);
    ctx.lineTo(trail[i].x * w, trail[i].y * h);
    ctx.stroke();
  }
  if (ball) {
    const cx = (ball.x + ball.w / 2) * w;
    const cy = (ball.y + ball.h / 2) * h;
    const r = Math.max((ball.w * w) / 2, (ball.h * h) / 2, 6 * u) + 2 * u;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 4 * u;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = heat ? '#fbbf24' : '#ffffff';
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/** One tongue of flame: a teardrop from a base on the ground to a swaying tip. */
function tongue(ctx: Ctx, x: number, baseY: number, width: number, height: number, sway: number) {
  const half = width / 2;
  ctx.beginPath();
  ctx.moveTo(x - half, baseY);
  ctx.bezierCurveTo(x - half, baseY - height * 0.45, x + sway * 0.4 - half * 0.25, baseY - height * 0.75, x + sway, baseY - height);
  ctx.bezierCurveTo(x + sway * 0.4 + half * 0.25, baseY - height * 0.75, x + half, baseY - height * 0.45, x + half, baseY);
  ctx.quadraticCurveTo(x, baseY + width * 0.35, x - half, baseY);
  ctx.closePath();
  ctx.fill();
}

/**
 * A flame standing on (cx, baseY), drawn for the moment `t` ms. `heat` 1 to 3
 * from heatLevel: taller and busier the longer the streak. Pass a fixed t for
 * a still flame (reduced motion).
 */
export function drawFlame(ctx: Ctx, cx: number, baseY: number, width: number, height: number, t: number, heat: number) {
  if (heat <= 0) return;
  const tongues = 3 + heat;
  const tall = height * (0.75 + 0.125 * heat);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const layers: Array<[number, string, string, number]> = [
    // scale, base colour, tip colour, alpha
    [1, '#dc2626', '#f97316', 0.75],
    [0.72, '#f97316', '#fbbf24', 0.8],
    [0.42, '#fde68a', '#fffbeb', 0.85],
  ];
  for (const [scale, base, tip, alpha] of layers) {
    const g = ctx.createLinearGradient(0, baseY, 0, baseY - tall * scale);
    g.addColorStop(0, base);
    g.addColorStop(1, `${tip}00`);
    ctx.fillStyle = g;
    ctx.globalAlpha = alpha;
    for (let i = 0; i < tongues; i++) {
      const rel = tongues === 1 ? 0 : i / (tongues - 1) - 0.5;
      const phase = i * 1.7 + scale * 3;
      const flicker = 0.78 + 0.14 * Math.sin(t / 90 + phase) + 0.08 * Math.sin(t / 37 + phase * 2.3);
      const h = tall * scale * (1 - Math.abs(rel) * 0.55) * flicker;
      const sway = width * 0.1 * Math.sin(t / 140 + phase);
      tongue(ctx, cx + rel * width * 0.62 * scale, baseY, width * 0.42 * scale, h, sway);
    }
  }
  // Embers: each rises and fades over its own life, placed by its index
  ctx.globalAlpha = 1;
  const embers = 3 + heat * 2;
  for (let i = 0; i < embers; i++) {
    const life = 800 + (i % 3) * 180;
    const p = (((t + i * 397) % life) + life) % life / life;
    const x = cx + Math.sin(i * 12.9898) * width * 0.38 + Math.sin(t / 210 + i) * width * 0.06;
    const y = baseY - tall * (0.35 + p * 0.95);
    ctx.fillStyle = `rgba(253, ${Math.round(186 - 90 * p)}, 60, ${(1 - p) * 0.9})`;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.5, width * 0.035 * (1 - p)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/** The streak's name on the HUD, from heatLevel. */
export function heatLabel(streak: number): string | null {
  const heat = heatLevel(streak);
  if (!heat) return null;
  return `${heat === 1 ? 'Heating up' : 'On fire'} · ${streak}`;
}

function clock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function pill(ctx: Ctx, x: number, y: number, h: number, text: string, bg: string, fg: string, u: number, align: 'left' | 'right', dot = false) {
  // Measured in the font the caller set
  const pad = 10 * u;
  const dotW = dot ? 12 * u : 0;
  const w = ctx.measureText(text).width + pad * 2 + dotW;
  const left = align === 'left' ? x : x - w;
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.roundRect(left, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  if (dot) {
    ctx.beginPath();
    ctx.arc(left + pad + 4 * u, y + h / 2, 4 * u, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, left + pad + dotW, y + h / 2 + 0.5 * u);
  return w;
}

/**
 * The HUD for a saved video, laid out as TrackerHud lays it out on the phone:
 * the score top left, whether the ball is tracked top right, the last calls
 * bottom left, a make or miss across the middle. The buttons and the amber
 * warnings are left out - they are for the player at the time, not for anyone
 * watching afterwards. `t` drives the flame; `family` is the page's font.
 *
 * `area` is where the HUD goes on the canvas (the whole of it unless a
 * vertical video sets it, verticalLayout). A `replay` frame shows only that it
 * is a replay, the call and the mark: the score as it stood back then would
 * read as the score going backwards.
 */
export function drawHud(
  ctx: Ctx,
  canvasW: number,
  canvasH: number,
  s: OverlayState,
  t: number,
  family: string,
  { area, replay = false }: { area?: Rect; replay?: boolean } = {}
) {
  const a = area ?? { x: 0, y: 0, w: canvasW, h: canvasH };
  const w = a.w;
  const h = a.h;
  const u = hudUnit(w, h);
  const font = (px: number, weight: number) => `${weight} ${px * u}px ${family}`;
  const heat = heatLevel(s.streak);
  ctx.save();
  ctx.translate(a.x, a.y);

  if (replay) {
    ctx.font = font(14, 900);
    pill(ctx, 12 * u, 12 * u, 28 * u, 'SLOW-MO REPLAY', ORANGE, '#ffffff', u, 'left', true);
  } else {
  // Scrim so the readout stays legible against a bright gym or sky. From the
  // top of the frame, not of the HUD, so a vertical video gets no hard edge.
  const scrim = ctx.createLinearGradient(0, -a.y, 0, 128 * u);
  scrim.addColorStop(0, 'rgba(0,0,0,0.8)');
  scrim.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(-a.x, -a.y, canvasW, a.y + 128 * u);

  // Score: makes, /attempts, %
  const left = 12 * u;
  const base = 52 * u;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  ctx.font = font(48, 900);
  const makesText = String(s.makes);
  const makesW = ctx.measureText(makesText).width;
  // Sized as StreakFlame is behind the live score: 1.7 times the digits, base just under them
  if (heat) drawFlame(ctx, left + makesW / 2, base + 6 * u, Math.max(makesW * 1.7 * 0.9, 58 * u), 82 * u * 0.85, t, heat);
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 8 * u;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(makesText, left, base);
  ctx.font = font(30, 900);
  ctx.fillStyle = '#d4d4d8';
  const attemptsText = `/${s.attempts}`;
  ctx.fillText(attemptsText, left + makesW, base);
  const attemptsW = ctx.measureText(attemptsText).width;
  ctx.font = font(24, 900);
  ctx.fillStyle = '#fb923c';
  ctx.fillText(`${pct(s.makes, s.attempts)}%`, left + makesW + attemptsW + 8 * u, base - 3 * u);
  ctx.shadowBlur = 0;

  // Clock, and the streak once it is hot
  ctx.font = font(14, 600);
  ctx.fillStyle = '#d4d4d8';
  ctx.textBaseline = 'middle';
  const clockText = clock(s.shootingMs);
  ctx.fillText(clockText, left, base + 18 * u);
  const label = heatLabel(s.streak);
  if (label) {
    ctx.font = font(12, 800);
    pill(ctx, left + ctx.measureText(clockText).width + 10 * u, base + 8 * u, 21 * u, label.toUpperCase(), heat > 1 ? '#dc2626' : '#ea580c', '#ffffff', u, 'left');
  }

  // Is it working?
  ctx.font = font(12, 700);
  pill(
    ctx,
    w - 12 * u,
    12 * u,
    24 * u,
    s.ballInView ? 'Ball tracked' : 'Watching the hoop',
    s.ballInView ? 'rgba(16,185,129,0.9)' : 'rgba(0,0,0,0.55)',
    s.ballInView ? '#ffffff' : '#f4f4f5',
    u,
    'right',
    true
  );

  // Drill progress
  if (s.drill) {
    ctx.font = font(18, 900);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 8 * u;
    ctx.fillText(s.drill.label, w / 2, h - 46 * u);
    ctx.shadowBlur = 0;
    const barX = 12 * u;
    const barW = w - 24 * u - 52 * u;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.beginPath();
    ctx.roundRect(barX, h - 38 * u, barW, 6 * u, 3 * u);
    ctx.fill();
    ctx.fillStyle = ORANGE;
    ctx.beginPath();
    ctx.roundRect(barX, h - 38 * u, Math.max(6 * u, barW * s.drill.fraction), 6 * u, 3 * u);
    ctx.fill();
  }

  // Last 8 results, newest on the right
  s.recent.forEach((made, i) => {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.arc(17 * u + i * 16 * u, h - 17 * u, 6 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = made ? EMERALD : RED;
    ctx.beginPath();
    ctx.arc(17 * u + i * 16 * u, h - 17 * u, 5 * u, 0, Math.PI * 2);
    ctx.fill();
  });

  if (s.banner) drawBanner(ctx, s.banner.label, s.banner.age, u, family);
  }

  drawMark(ctx, w, h, u, family);
  if (s.flash) drawFlash(ctx, w, h, s.flash, u, family);
  ctx.restore();
}

/** Opacity and scale of a milestone banner `age` ms in: pops in, holds, fades (the .deadeye-banner keyframes). */
export function bannerCurve(age: number): { opacity: number; scale: number } {
  if (age < 0 || age > BANNER_MS) return { opacity: 0, scale: 1 };
  if (age < 180) return { opacity: age / 180, scale: 0.9 + (0.13 * age) / 180 };
  if (age < 300) return { opacity: 1, scale: 1.03 - (0.03 * (age - 180)) / 120 };
  if (age > BANNER_MS - 400) return { opacity: (BANNER_MS - age) / 400, scale: 1 };
  return { opacity: 1, scale: 1 };
}

/** A milestone, under the score where the live HUD shows it. */
function drawBanner(ctx: Ctx, label: string, age: number, u: number, family: string) {
  const { opacity, scale } = bannerCurve(age);
  if (opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  const x = 12 * u;
  const y = 84 * u;
  const hgt = 30 * u;
  ctx.translate(x, y + hgt / 2);
  ctx.scale(scale, scale);
  ctx.translate(-x, -(y + hgt / 2));
  ctx.font = `900 ${15 * u}px ${family}`;
  pill(ctx, x, y, hgt, label.toUpperCase(), '#ffffff', '#09090b', u, 'left', true);
  // The dot in brand orange rather than the text colour
  ctx.fillStyle = ORANGE;
  ctx.beginPath();
  ctx.arc(x + 14 * u, y + hgt / 2, 4 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A vertical video's size: 1080 x 1920, what TikTok, Reels and Shorts show full screen. */
export const VERTICAL = { w: 1080, h: 1920 } as const;

/**
 * Where the picture and the HUD go in a 9:16 frame. Sideways footage is shown
 * whole, across the width, over a blurred copy of itself: a crop tall enough
 * to fill 9:16 keeps about a quarter of a sideways picture and would cut the
 * shooter out. Upright footage fills the frame. The HUD stays out of the top
 * tenth and the bottom fifth or so, where TikTok and Reels put their tabs and
 * caption.
 */
export function verticalLayout(srcW: number, srcH: number, W: number = VERTICAL.w, H: number = VERTICAL.h): { picture: Rect; area: Rect; backdrop: boolean } {
  const area = { x: 0, y: Math.round(H * 0.1), w: W, h: Math.round(H * 0.68) };
  const srcAspect = srcW / srcH;
  if (srcAspect <= (W / H) * 1.15) {
    const scale = Math.max(W / srcW, H / srcH);
    const w = srcW * scale;
    const h = srcH * scale;
    return { picture: { x: (W - w) / 2, y: (H - h) / 2, w, h }, area, backdrop: false };
  }
  const h = W / srcAspect;
  return { picture: { x: 0, y: area.y + (area.h - h) / 2, w: W, h }, area, backdrop: true };
}

/**
 * The blurred copy of the picture behind a sideways video in a vertical frame.
 * Blurred by drawing it tiny and stretching it back up, which every browser
 * does quickly; the canvas filter property is missing from older Safari.
 */
export function drawBackdrop(ctx: Ctx, source: CanvasImageSource, srcW: number, srcH: number, W: number, H: number, scratch: HTMLCanvasElement) {
  const sw = 27;
  const sh = 48;
  if (scratch.width !== sw) scratch.width = sw;
  if (scratch.height !== sh) scratch.height = sh;
  const sctx = scratch.getContext('2d');
  if (!sctx) return;
  // Cover: the middle of the picture, cut to the frame's shape
  const scale = Math.max(sw / srcW, sh / srcH);
  const cw = sw / scale;
  const ch = sh / scale;
  sctx.drawImage(source, (srcW - cw) / 2, (srcH - ch) / 2, cw, ch, 0, 0, sw, sh);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(scratch, 0, 0, W, H);
  ctx.fillStyle = 'rgba(9,9,11,0.55)';
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

/** The Deadeye name in the corner, where the full-screen button sits live. */
export function drawMark(ctx: Ctx, w: number, h: number, u: number, family: string) {
  ctx.save();
  ctx.font = `900 ${15 * u}px ${family}`;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.7)';
  ctx.shadowBlur = 6 * u;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  const x = w - 12 * u;
  const y = h - 14 * u;
  ctx.fillText('DEADEYE', x, y);
  const tw = ctx.measureText('DEADEYE').width;
  ctx.shadowBlur = 0;
  ctx.fillStyle = ORANGE;
  ctx.fillRect(x - tw, y + 3 * u, tw * 0.35, 2.5 * u);
  ctx.restore();
}

/** Opacity and scale of the make/miss call `age` ms in, following the .deadeye-flash keyframes. */
export function flashCurve(age: number): { opacity: number; scale: number } {
  const p = Math.min(1, Math.max(0, age / FLASH_MS));
  if (p < 0.18) return { opacity: p / 0.18, scale: 0.85 + (0.19 * p) / 0.18 };
  const opacity = 1 - (p - 0.18) / 0.82;
  if (p < 0.32) return { opacity, scale: 1.04 - (0.04 * (p - 0.18)) / 0.14 };
  return { opacity, scale: 1 };
}

function drawFlash(ctx: Ctx, w: number, h: number, f: NonNullable<OverlayState['flash']>, u: number, family: string) {
  const { opacity, scale } = flashCurve(f.age);
  if (opacity <= 0) return;
  ctx.save();
  ctx.globalAlpha = opacity;
  // The wash covers the whole frame, also when the HUD has only part of it
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = f.made ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.2)';
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
  ctx.translate(w / 2, h / 2);
  ctx.scale(scale, scale);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 12 * u;
  ctx.font = `900 ${60 * u}px ${family}`;
  ctx.fillStyle = f.made ? '#6ee7b7' : '#fca5a5';
  ctx.fillText(f.made ? 'MAKE' : 'MISS', 0, 0);
  ctx.font = `900 ${24 * u}px ${family}`;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${f.makes}/${f.attempts}`, 0, 32 * u);
  ctx.shadowBlur = 0;
  if (f.made && f.streak >= 3) {
    ctx.font = `900 ${16 * u}px ${family}`;
    ctx.fillStyle = '#fdba74';
    ctx.fillText(`${f.streak} IN A ROW`, 0, 58 * u);
  } else if (!f.confident) {
    ctx.font = `800 ${12 * u}px ${family}`;
    const label = 'CHECK THIS ONE';
    const tw = ctx.measureText(label).width + 20 * u;
    ctx.fillStyle = 'rgba(245,158,11,0.9)';
    ctx.beginPath();
    ctx.roundRect(-tw / 2, 42 * u, tw, 20 * u, 10 * u);
    ctx.fill();
    ctx.fillStyle = '#09090b';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 52.5 * u);
  }
  ctx.restore();
}

export interface EndCardStats {
  makes: number;
  attempts: number;
  bestRun: number;
  /** The session beat the player's best % (personalBest.ts). */
  personalBest?: boolean;
}

/** The last seconds of a saved video: the session's numbers on the app's own background. `p` 0..1 fades it in. */
export function drawEndCard(ctx: Ctx, w: number, h: number, stats: EndCardStats, p: number, family: string) {
  const u = hudUnit(w, h);
  ctx.save();
  ctx.globalAlpha = Math.min(1, p * 3);
  ctx.fillStyle = '#09090b';
  ctx.fillRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const cy = h / 2;
  if (stats.personalBest) {
    ctx.font = `900 ${16 * u}px ${family}`;
    const label = 'NEW PERSONAL BEST';
    const tw = ctx.measureText(label).width + 28 * u;
    ctx.fillStyle = '#10b981';
    ctx.beginPath();
    ctx.roundRect(w / 2 - tw / 2, cy - 104 * u, tw, 30 * u, 15 * u);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, w / 2, cy - 88.5 * u);
    ctx.textBaseline = 'alphabetic';
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${64 * u}px ${family}`;
  ctx.fillText(`${stats.makes}/${stats.attempts}`, w / 2, cy - 4 * u);
  ctx.fillStyle = '#fb923c';
  ctx.font = `900 ${28 * u}px ${family}`;
  const line = stats.bestRun >= 2 ? `${pct(stats.makes, stats.attempts)}%  ·  best run ${stats.bestRun}` : `${pct(stats.makes, stats.attempts)}%`;
  ctx.fillText(line, w / 2, cy + 36 * u);
  ctx.fillStyle = '#a1a1aa';
  ctx.font = `600 ${14 * u}px ${family}`;
  ctx.fillText('Tracked live by', w / 2, cy + 78 * u);
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${26 * u}px ${family}`;
  ctx.fillText('DEADEYE', w / 2, cy + 108 * u);
  const tw = ctx.measureText('DEADEYE').width;
  ctx.fillStyle = ORANGE;
  ctx.fillRect(w / 2 - tw / 2, cy + 114 * u, tw * 0.35, 3 * u);
  ctx.restore();
}
