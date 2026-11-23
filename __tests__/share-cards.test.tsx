// @vitest-environment node
// __tests__/share-cards.test.tsx
// Renders each share card to a real PNG with next/og, so layout mistakes (e.g. a
// multi-child element without display:flex) fail here instead of in production.
import React from 'react';
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { ImageResponse } from 'next/og';
import { cardFonts } from '@/lib/shareCardFonts';
import { CARD_WIDTH, Frame, GameCard, RankCard, SessionCard, WorkoutCard, asCardFormat, cardHeight, cardName, type CardFormat } from '@/lib/shareCards';

const icon = `data:image/png;base64,${readFileSync(path.join(__dirname, '../public/icon-192.png')).toString('base64')}`;
const OUT = process.env.SHARE_CARD_OUT; // set to a folder to save the PNGs for a visual check
// SHARE_CARD_FONTS=1 fetches Geist Bold and Black as the route does (needs the network)
const FONTS = process.env.SHARE_CARD_FONTS ? cardFonts() : Promise.resolve([]);

async function render(name: string, body: React.ReactNode, format: CardFormat = 'story', who: string | null = null) {
  const res = new ImageResponse(
    <Frame icon={icon} name={who} date="2026-11-20" format={format}>
      {body}
    </Frame>,
    { width: CARD_WIDTH, height: cardHeight(format), fonts: (await FONTS).length ? await FONTS : undefined }
  );
  const png = Buffer.from(await res.arrayBuffer());
  if (OUT) {
    mkdirSync(OUT, { recursive: true });
    writeFileSync(path.join(OUT, `${name}.png`), png);
  }
  return png;
}

const isPng = (b: Buffer) => b.subarray(1, 4).toString() === 'PNG';
const heightOf = (b: Buffer) => b.readUInt32BE(20);

const ZONES = [
  { zone: 'mid-center', makes: 4, attempts: 5 },
  { zone: 'mid-left-wing', makes: 2, attempts: 2 },
  { zone: 'mid-right-wing', makes: 2, attempts: 3 },
];

describe('share card name', () => {
  it('prints no name unless the player turned it on', () => {
    expect(cardName('Sam Byrne', false)).toBeNull();
    expect(cardName('Sam Byrne', true)).toBe('Sam');
    expect(cardName('  ', true)).toBeNull();
    expect(cardName(null, true)).toBeNull();
  });

  it('is the story size unless the feed size is asked for', () => {
    expect(asCardFormat(null)).toBe('story');
    expect(asCardFormat('nonsense')).toBe('story');
    expect(asCardFormat('feed')).toBe('feed');
    expect(cardHeight('story')).toBe(1920);
    expect(cardHeight('feed')).toBe(1350);
  });
});

describe('share cards', () => {
  it('session card with shots, story and feed', async () => {
    const story = await render('session-story', <SessionCard format="story" minutes={55} drills={3} zones={ZONES} personalBest />);
    expect(isPng(story)).toBe(true);
    expect(heightOf(story)).toBe(1920);
    expect(story.length).toBeGreaterThan(10_000);
    const feed = await render('session-feed', <SessionCard format="feed" minutes={55} drills={3} zones={ZONES} personalBest={false} />, 'feed', 'Sam');
    expect(heightOf(feed)).toBe(1350);
  }, 60_000);

  it('session card with corner threes and the paint', async () => {
    const zones = [
      { zone: 'three-left-corner', makes: 7, attempts: 12 },
      { zone: 'paint', makes: 9, attempts: 12 },
      { zone: 'mid-left-corner', makes: 2, attempts: 9 },
    ];
    expect(isPng(await render('session-corners', <SessionCard format="story" minutes={40} drills={2} zones={zones} personalBest={false} />))).toBe(true);
  }, 30_000);

  it('session card without shots', async () => {
    expect(isPng(await render('session-noshots', <SessionCard format="story" minutes={30} drills={4} zones={[]} personalBest={false} />))).toBe(true);
  }, 30_000);

  it('workout card', async () => {
    const png = await render(
      'workout',
      <WorkoutCard
        format="feed"
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
      />,
      'feed'
    );
    expect(isPng(png)).toBe(true);
  }, 30_000);

  it('game card', async () => {
    const png = await render(
      'game',
      <GameCard
        format="story"
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

  it('rank card with the level ring, story and feed', async () => {
    const props = { rank: 'Prospect', level: 5, progress: 0.37, toNext: 88, xp: 412, streak: 12, sessions: 27, badges: 9 };
    expect(isPng(await render('rank-story', <RankCard format="story" {...props} />))).toBe(true);
    expect(isPng(await render('rank-feed', <RankCard format="feed" {...props} />, 'feed'))).toBe(true);
    expect(isPng(await render('rank-top', <RankCard format="story" {...props} level={50} rank="GOAT" progress={1} toNext={0} />))).toBe(true);
  }, 60_000);
});
