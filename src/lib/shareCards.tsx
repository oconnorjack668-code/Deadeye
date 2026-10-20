// src/lib/shareCards.tsx
// Share card layouts (rendered to PNG by next/og in /api/share/[kind]).
// next/og only supports flexbox: every element with more than one child needs display: flex.
import React from 'react';

export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1350;
const ORANGE = '#f97316';

export const pct = (m: number, a: number) => (a > 0 ? Math.round((m / a) * 100) : 0);
const niceDate = (d: string) =>
  new Date(`${d}T00:00:00`).toLocaleDateString('en-IE', { weekday: 'short', day: 'numeric', month: 'short' });
export const titleCase = (s: string) => s.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function Frame({ icon, name, children }: { icon: string | null; name: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#09090b',
        backgroundImage: 'radial-gradient(circle at 20% 15%, rgba(234,88,12,0.45), #09090b 55%)',
        color: '#fff',
        padding: 72,
        fontFamily: 'sans-serif',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* next/image cannot be used here: these cards are rendered by Satori
            inside next/og's ImageResponse, which only understands plain img. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {icon ? <img src={icon} width={96} height={96} style={{ borderRadius: 24 }} alt="" /> : null}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 52, fontWeight: 900 }}>Deadeye</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: ORANGE, letterSpacing: 3 }}>AI BASKETBALL TRAINER</div>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>{children}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 30, color: '#a1a1aa' }}>
        <div style={{ display: 'flex', fontWeight: 700, color: '#fff' }}>{name}</div>
        <div style={{ display: 'flex' }}>Train with Deadeye</div>
      </div>
    </div>
  );
}

function Bar({ label, value, sub }: { label: string; value: number; sub: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', marginTop: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 32 }}>
        <div style={{ display: 'flex' }}>{label}</div>
        <div style={{ display: 'flex', color: '#d4d4d8' }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', height: 18, borderRadius: 9, backgroundColor: '#27272a', marginTop: 10 }}>
        <div style={{ display: 'flex', width: `${Math.max(3, value)}%`, height: 18, borderRadius: 9, backgroundColor: ORANGE }} />
      </div>
    </div>
  );
}

function Stat({ value, label, color = '#fff' }: { value: string; label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexGrow: 1 }}>
      <div style={{ fontSize: 72, fontWeight: 900, color }}>{value}</div>
      <div style={{ fontSize: 26, color: '#a1a1aa', letterSpacing: 2 }}>{label.toUpperCase()}</div>
    </div>
  );
}

export interface SessionCardData {
  date: string;
  type: string;
  minutes: number;
  drills: number;
  zones: Array<{ label: string; makes: number; attempts: number }>;
}

export function SessionCard({ date, type, minutes, drills, zones }: SessionCardData) {
  const makes = zones.reduce((n, z) => n + z.makes, 0);
  const attempts = zones.reduce((n, z) => n + z.attempts, 0);
  const top = [...zones].sort((a, b) => b.attempts - a.attempts).slice(0, 4);
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', fontSize: 36, color: '#d4d4d8' }}>
        {`${titleCase(type)} session · ${niceDate(date)} · ${minutes} min`}
      </div>
      {attempts > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 28, marginTop: 20 }}>
            <div style={{ display: 'flex', fontSize: 220, fontWeight: 900, color: ORANGE, lineHeight: 1 }}>{`${pct(makes, attempts)}%`}</div>
            <div style={{ display: 'flex', fontSize: 56, fontWeight: 800, marginBottom: 30 }}>{`${makes}/${attempts}`}</div>
          </div>
          <div style={{ display: 'flex', fontSize: 30, color: '#a1a1aa', marginTop: 4 }}>shots made</div>
          <div style={{ display: 'flex', flexDirection: 'column', marginTop: 36 }}>
            {top.map((z) => (
              <Bar key={z.label} label={z.label} value={pct(z.makes, z.attempts)} sub={`${z.makes}/${z.attempts} · ${pct(z.makes, z.attempts)}%`} />
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', marginTop: 40 }}>
          <Stat value={`${minutes}`} label="minutes" color={ORANGE} />
          <Stat value={`${drills}`} label="drills" />
        </div>
      )}
    </div>
  );
}

export interface WorkoutCardData {
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

export function WorkoutCard({ date, type, minutes, sets, volume, unit, prs, best }: WorkoutCardData) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', fontSize: 36, color: '#d4d4d8' }}>{`${titleCase(type)} workout · ${niceDate(date)}`}</div>
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
            <div style={{ display: 'flex' }}>{b.exercise}</div>
            <div style={{ display: 'flex', color: b.pr ? '#fbbf24' : '#d4d4d8' }}>
              {`${b.weight ? `${Math.round(b.weight)} ${unit} × ` : ''}${b.reps}${b.pr ? ' PR' : ''}`}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface RankCardData {
  /** The tier name. */
  rank: string;
  /** Shown large above the tier when given. */
  level?: number;
  xp: number;
  streak: number;
  sessions: number;
  badges: number;
  makes: number;
}

export function RankCard({ rank, level, xp, streak, sessions, badges, makes }: RankCardData) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ display: 'flex', fontSize: 34, color: '#a1a1aa', letterSpacing: 4 }}>{level ? 'MY LEVEL' : 'MY RANK'}</div>
      {level ? (
        <>
          <div style={{ display: 'flex', fontSize: 170, fontWeight: 900, color: ORANGE, lineHeight: 1.05 }}>{`Level ${level}`}</div>
          <div style={{ display: 'flex', fontSize: 64, fontWeight: 800, color: '#e4e4e7' }}>{rank}</div>
        </>
      ) : (
        <div style={{ display: 'flex', fontSize: 150, fontWeight: 900, color: ORANGE, lineHeight: 1.1 }}>{rank}</div>
      )}
      <div style={{ display: 'flex', fontSize: 44, fontWeight: 800 }}>{`${xp.toLocaleString('en-IE')} XP`}</div>
      <div style={{ display: 'flex', width: '100%', marginTop: 64 }}>
        <Stat value={`${streak}`} label="day streak" color={ORANGE} />
        <Stat value={`${sessions}`} label="sessions" />
        <Stat value={`${badges}`} label="badges" color="#fbbf24" />
      </div>
      <div style={{ display: 'flex', marginTop: 48, fontSize: 34, color: '#d4d4d8' }}>{`${makes.toLocaleString('en-IE')} shots made`}</div>
    </div>
  );
}

export interface GameCardData {
  date: string;
  opponent: string | null;
  result: string | null;
  score: string | null;
  points: number;
  rebounds: number;
  assists: number;
  line: Array<{ label: string; value: string }>;
}

export function GameCard({ date, opponent, result, score, points, rebounds, assists, line }: GameCardData) {
  const tag = result === 'win' ? 'WIN' : result === 'loss' ? 'LOSS' : result === 'draw' ? 'DRAW' : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', fontSize: 36, color: '#d4d4d8' }}>
        {`${opponent ? `vs ${opponent}` : 'Game day'} · ${niceDate(date)}`}
      </div>
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
    </div>
  );
}
