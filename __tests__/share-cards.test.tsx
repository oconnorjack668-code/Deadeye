// @vitest-environment node
// __tests__/share-cards.test.tsx
// Renders each share card to a real PNG with next/og, so layout mistakes (e.g. a
// multi-child element without display:flex) fail here instead of in production.
import React from 'react';
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';
import { CARD_HEIGHT, CARD_WIDTH, Frame, GameCard, RankCard, SessionCard, WorkoutCard } from '@/lib/shareCards';

const icon = `data:image/png;base64,${readFileSync(path.join(__dirname, '../public/icon-192.png')).toString('base64')}`;
const OUT = process.env.SHARE_CARD_OUT; // set to a folder to save the PNGs for a visual check

async function render(name: string, body: React.ReactNode) {
  const res = new ImageResponse(<Frame icon={icon} name="Jack">{body}</Frame>, { width: CARD_WIDTH, height: CARD_HEIGHT });
  const png = Buffer.from(await res.arrayBuffer());
  if (OUT) {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(path.join(OUT, `${name}.png`), png);
  }
  return png;
}

const isPng = (b: Buffer) => b.subarray(1, 4).toString() === 'PNG';

describe('share cards', () => {
  it('session card with shots', async () => {
    const png = await render(
      'session',
      <SessionCard
        date="2026-09-25"
        type="shooting"
        minutes={55}
        drills={3}
        zones={[
          { label: 'Top of the key three', makes: 18, attempts: 30 },
          { label: 'Left corner three', makes: 9, attempts: 20 },
          { label: 'Free throw', makes: 17, attempts: 20 },
          { label: 'Paint', makes: 6, attempts: 10 },
        ]}
      />
    );
    expect(isPng(png)).toBe(true);
    expect(png.length).toBeGreaterThan(10_000);
  }, 30_000);

  it('session card without shots', async () => {
    expect(isPng(await render('session-noshots', <SessionCard date="2026-09-25" type="ball-handling" minutes={30} drills={4} zones={[]} />))).toBe(true);
  }, 30_000);

  it('workout card', async () => {
    const png = await render(
      'workout',
      <WorkoutCard
        date="2026-09-24"
        type="strength"
        minutes={50}
        sets={18}
        volume={8450}
        unit="kg"
        prs={2}
        best={[
          { exercise: 'Back Squat', weight: 100, reps: 5, pr: true },
          { exercise: 'Romanian Deadlift', weight: 80, reps: 8, pr: false },
          { exercise: 'Box Jump', weight: null, reps: 5, pr: false },
        ]}
      />
    );
    expect(isPng(png)).toBe(true);
  }, 30_000);

  it('game card', async () => {
    const png = await render(
      'game',
      <GameCard
        date="2026-09-26"
        opponent="Dublin Lions"
        result="win"
        score="68-61"
        points={24}
        rebounds={9}
        assists={5}
        line={[
          { label: 'Field goals', value: '9/16 (56%)' },
          { label: 'Three-pointers', value: '3/7 (43%)' },
          { label: 'Free throws', value: '3/4 (75%)' },
        ]}
      />
    );
    expect(isPng(png)).toBe(true);
  }, 30_000);

  it('rank card', async () => {
    expect(isPng(await render('rank', <RankCard rank="All-Star" xp={5230} streak={6} sessions={48} badges={9} makes={3120} />))).toBe(true);
    expect(isPng(await render('level', <RankCard rank="Hall of Famer" level={42} xp={19830} streak={23} sessions={310} badges={21} makes={18200} />))).toBe(true);
  }, 30_000);
});
