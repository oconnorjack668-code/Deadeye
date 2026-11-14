// src/data/plays/library.ts
// The library plays, drawn for Deadeye (not copied from a book or FastModel;
// safety rule 8 in docs/plans/film-and-plays.md): the ten starter plays below
// (F1) and the launch plays in launch.ts (F4). Each play is written as moves
// and turned into a diagram by buildDiagram, then:
//   - validated by parseDiagram and checked against the age rules in
//     __tests__/plays-library.test.ts;
//   - written into its migration (PLAY_SEEDS below) by the same test
//     (WRITE_PLAYS_SEED=1 npx vitest run __tests__/plays-library.test.ts).
// Change a play here, never in the SQL.
//
// Offence only: o1 point guard, o2 shooting guard, o3 small forward, o4 power
// forward, o5 centre. Coordinates are feet (src/lib/plays/spots.ts).
import { buildDiagram } from '@/lib/plays/build';
import { spot } from '@/lib/plays/spots';
import type { AgeGrade, PlayCategory } from '@/lib/plays/catalog';
import type { Diagram } from '@/lib/plays/diagram';
import { LAUNCH_PLAYS } from './launch';

export interface LibraryPlay {
  slug: string;
  title: string;
  category: PlayCategory;
  min_age: AgeGrade;
  tags: string[];
  description: string;
  coaching_points: string[];
  is_free: boolean;
  diagram: Diagram;
}

const BASKET = { x: 25, y: 7 };

/** The F1 starter plays, seeded by 00060_plays.sql. */
export const STARTER_PLAYS: LibraryPlay[] = [
  {
    slug: 'four-out-one-in',
    title: '4-out 1-in: pass and cut',
    category: 'principles',
    min_age: 'U10',
    tags: ['motion', 'spacing', 'cutting'],
    description:
      'Four players outside the three-point line, one in the post. Every time you pass, you cut to the basket, and everyone fills the spot that just opened.',
    coaching_points: [
      'Pass, then cut hard to the basket. If you are open, you get it straight back.',
      'Fill the spot that just opened, so there are always four out and one in.',
      'Keep 12 to 15 feet from the nearest teammate, so one defender cannot guard two of you.',
      'The post player (5) moves to the side the ball is on.',
      'Catch, face the basket, then decide: shoot, drive or pass.',
    ],
    is_free: true,
    diagram: buildDiagram(
      {
        positions: { o1: spot('left-slot'), o2: spot('right-slot'), o3: spot('left-wing'), o4: spot('right-wing'), o5: spot('right-block') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'pass', from: 'o1', to: 'o3' }] },
        {
          moves: [
            { type: 'cut', from: 'o1', at: BASKET },
            { type: 'cut', from: 'o2', at: spot('left-slot') },
            { type: 'cut', from: 'o4', at: spot('right-slot') },
          ],
          note: 'The passer cuts to the basket; the next player along fills their spot.',
        },
        {
          moves: [
            { type: 'cut', from: 'o1', at: spot('right-wing'), via: [{ x: 33, y: 13 }] },
            { type: 'cut', from: 'o5', at: spot('left-block') },
          ],
          note: 'Not open? Keep going out to the open spot. 5 follows the ball.',
        },
        { moves: [{ type: 'pass', from: 'o3', to: 'o2' }] },
        { moves: [{ type: 'pass', from: 'o2', to: 'o4' }], note: 'Swing the ball to the other side.' },
        {
          moves: [
            { type: 'cut', from: 'o2', at: BASKET },
            { type: 'cut', from: 'o3', at: spot('left-slot') },
          ],
          note: 'Same again: pass, cut, fill.',
        },
      ]
    ),
  },
  {
    slug: 'five-out-pass-cut-fill',
    title: '5-out: pass, cut, fill',
    category: 'principles',
    min_age: 'U9',
    tags: ['motion', 'spacing', 'cutting'],
    description:
      'All five outside the three-point line, so the paint is empty for cutters. Pass, cut to the basket, then clear out to the open spot while everyone moves up one.',
    coaching_points: [
      'After you pass, cut to the basket. Every time.',
      'The cutter clears out to the open spot; everyone else moves up one spot toward the ball.',
      'With five out, the paint stays empty for cutters and drivers.',
      'Show your hands as you cut: you are a target.',
      'If your defender stops you cutting in front, cut behind them (back door).',
    ],
    is_free: true,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: spot('right-wing'), o3: spot('left-wing'), o4: spot('right-corner'), o5: spot('left-corner') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'pass', from: 'o1', to: 'o2' }] },
        {
          moves: [
            { type: 'cut', from: 'o1', at: BASKET },
            { type: 'cut', from: 'o3', at: spot('top') },
            { type: 'cut', from: 'o5', at: spot('left-wing') },
          ],
          note: '1 cuts; 3 and 5 each move up one spot.',
        },
        { moves: [{ type: 'cut', from: 'o1', at: spot('left-corner'), via: [{ x: 14, y: 5 }] }], note: '1 clears out to the open corner.' },
        { moves: [{ type: 'pass', from: 'o2', to: 'o3' }] },
        {
          moves: [
            { type: 'cut', from: 'o2', at: BASKET },
            { type: 'cut', from: 'o4', at: spot('right-wing') },
          ],
        },
        { moves: [{ type: 'cut', from: 'o2', at: spot('right-corner'), via: [{ x: 36, y: 5 }] }] },
      ]
    ),
  },
  {
    slug: 'give-and-go',
    title: 'Give-and-go',
    category: 'principles',
    min_age: 'U9',
    tags: ['cutting', 'passing', 'two-player'],
    description: 'The oldest play in basketball: give the ball to a teammate, then go to the basket for the return pass.',
    coaching_points: [
      'Give (pass), then go (cut) straight away.',
      'Take one step away first, then cut in front of your defender.',
      'Cut with your hand up as a target.',
      '2: make the return pass early, before help arrives.',
      'If your defender jumps toward the ball, cut behind them instead.',
    ],
    is_free: true,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: spot('right-wing'), o3: spot('left-wing'), o4: spot('left-corner'), o5: spot('left-block') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'pass', from: 'o1', to: 'o2' }], note: 'Give.' },
        { moves: [{ type: 'cut', from: 'o1', at: { x: 21, y: 29 } }], note: 'Step away to set your defender up.' },
        { moves: [{ type: 'cut', from: 'o1', at: { x: 28, y: 8 } }], note: 'Go: cut in front of your defender.' },
        { moves: [{ type: 'pass', from: 'o2', to: 'o1' }], note: 'Return pass for the layup.' },
      ]
    ),
  },
  {
    slug: 'back-door-high-post',
    title: 'Back door from the high post',
    category: 'principles',
    min_age: 'U10',
    tags: ['cutting', 'back door', 'high post'],
    description:
      'When a defender stops the wing getting the ball, the wing cuts behind them. A pass to the high post is the signal.',
    coaching_points: [
      'If your defender is between you and the ball, cut behind them.',
      'Walk your defender up the floor first, then plant your outside foot and go.',
      'The pass to 5 at the high post is the signal to cut.',
      'Use a bounce pass on a back-door cut, so it gets under the defender.',
      'Keep the paint empty: 5 flashes up out of it.',
    ],
    is_free: true,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: spot('right-wing'), o3: spot('left-wing'), o4: spot('left-corner'), o5: spot('left-block') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'cut', from: 'o5', at: spot('high-post') }], note: '5 flashes to the high post.' },
        {
          moves: [
            { type: 'pass', from: 'o1', to: 'o5' },
            { type: 'cut', from: 'o2', at: { x: 43, y: 25 } },
          ],
          note: '2 takes the defender up the floor.',
        },
        { moves: [{ type: 'cut', from: 'o2', at: { x: 29, y: 7 }, via: [{ x: 38, y: 13 }] }], note: '2 plants and cuts back door.' },
        { moves: [{ type: 'pass', from: 'o5', to: 'o2' }], note: 'Bounce pass.' },
      ]
    ),
  },
  {
    slug: 'blob-box',
    title: 'Box: baseline out of bounds',
    category: 'blob',
    min_age: 'U10',
    tags: ['out of bounds', 'box', 'screens'],
    description:
      'A set for the ball out of bounds under your own basket. Two players on the blocks, two at the elbows, and a screen to free a cutter at the rim.',
    coaching_points: [
      'Set up in a box: two on the blocks, two at the elbows. Your best passer takes it out.',
      'The inbounder slaps the ball to start everyone at once.',
      '5 sets the screen with a wide base and holds still.',
      '4 waits for the screen, then cuts hard to the ball side of the basket with a hand up.',
      '3 pops to the corner and 2 goes out to the top as the safe pass.',
      'After screening, 5 steps toward the basket. The screener is often the one left open.',
    ],
    is_free: true,
    diagram: buildDiagram(
      {
        positions: {
          o1: { x: 31, y: -2.5 },
          o2: spot('left-elbow'),
          o3: spot('right-elbow'),
          o4: spot('left-block'),
          o5: spot('right-block'),
        },
        ball: 'o1',
      },
      [
        {
          moves: [
            { type: 'screen', from: 'o5', to: 'o4', at: { x: 21, y: 8 } },
            { type: 'cut', from: 'o2', at: spot('top') },
          ],
          note: '5 screens across for 4; 2 goes out as the safe pass.',
        },
        {
          moves: [
            { type: 'cut', from: 'o4', at: { x: 30, y: 6 }, via: [{ x: 21, y: 4 }] },
            { type: 'cut', from: 'o3', at: spot('right-corner') },
          ],
          note: '4 cuts under the screen to the ball side; 3 pops to the corner.',
        },
        { moves: [{ type: 'cut', from: 'o5', at: { x: 22, y: 6.5 } }], note: '5 seals and steps to the rim after screening.' },
        { moves: [{ type: 'pass', from: 'o1', to: 'o4' }], note: 'Inbound to 4 at the rim, or to 3 or 2 if 4 is covered.' },
      ]
    ),
  },
  {
    slug: 'horns-high-low',
    title: 'Horns: ball screen and high-low',
    category: 'half_court',
    min_age: 'U12',
    tags: ['horns', 'ball screen', 'high-low'],
    description:
      'Bigs at both elbows, shooters in both corners. One big screens for the guard and rolls; the other pops to the top and looks inside.',
    coaching_points: [
      'Set up wide: bigs at the elbows, shooters in the corners.',
      '5 sprints to screen and stops. 1 waits for the screen, then goes shoulder to shoulder past it.',
      '5 rolls to the basket with a hand up; 4 pops back to the top.',
      '1 reads it: pass to 5 if open; if 5 is covered, pass to 4 at the top.',
      '4 looks inside first: the high-low pass to 5.',
      'Corners stay wide and ready to shoot.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: spot('right-corner'), o3: spot('left-corner'), o4: spot('left-elbow'), o5: spot('right-elbow') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'screen', from: 'o5', to: 'o1', at: { x: 28, y: 28.5 } }], note: '5 screens for 1.' },
        {
          moves: [
            { type: 'dribble', from: 'o1', at: { x: 38, y: 23 }, via: [{ x: 31, y: 30.5 }] },
            { type: 'cut', from: 'o5', at: { x: 27, y: 9 } },
            { type: 'cut', from: 'o4', at: { x: 24, y: 30 } },
          ],
          note: '1 uses the screen; 5 rolls, 4 pops to the top.',
        },
        { moves: [{ type: 'pass', from: 'o1', to: 'o4' }], note: '5 is covered, so 1 passes to 4.' },
        { moves: [{ type: 'pass', from: 'o4', to: 'o5' }], note: 'High-low: 4 passes inside to 5.' },
      ]
    ),
  },
  {
    slug: 'floppy',
    title: 'Floppy',
    category: 'half_court',
    min_age: 'U13',
    tags: ['off-ball screens', 'shooter'],
    description:
      'The shooter starts under the basket with a screen on each side: one screener on the left, two on the right. Read your defender and come off the side that is open.',
    coaching_points: [
      '2 starts under the basket and picks the side that is open.',
      'Walk your defender toward one side, then sprint off the screens to the other.',
      'Screeners stand still, feet wide, arms in. No moving screens.',
      '2 catches ready to shoot: feet set, hands ready, facing the basket.',
      'After the screen, a screener goes to the basket. The defence often forgets them.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: { x: 25, y: 6 }, o3: spot('left-block'), o4: spot('right-block'), o5: { x: 34.5, y: 12 } },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'cut', from: 'o2', at: { x: 21, y: 6 } }], note: '2 walks the defender toward the single screen.' },
        {
          moves: [
            { type: 'screen', from: 'o4', to: 'o2', at: { x: 32.5, y: 9 } },
            { type: 'screen', from: 'o5', to: 'o2', at: { x: 32.5, y: 13 } },
            { type: 'cut', from: 'o2', at: spot('right-wing'), via: [{ x: 29, y: 10 }, { x: 30.5, y: 16.5 }] },
          ],
          note: '4 and 5 screen; 2 sprints off them to the wing.',
        },
        { moves: [{ type: 'pass', from: 'o1', to: 'o2' }], note: 'Catch and shoot.' },
        {
          moves: [
            { type: 'cut', from: 'o5', at: { x: 28, y: 8 } },
            { type: 'cut', from: 'o3', at: spot('left-wing') },
          ],
          note: '5 goes to the basket; 3 lifts to the wing to keep the floor spaced.',
        },
      ]
    ),
  },
  {
    slug: 'one-four-high',
    title: '1-4 high: back door, then high-low',
    category: 'half_court',
    min_age: 'U12',
    tags: ['1-4 high', 'back door', 'high-low', 'high post'],
    description:
      'Four players across the free throw line extended, the guard at the top. The entry to the elbow starts two looks: the wing back door, then the other big diving in.',
    coaching_points: [
      'Line up flat: wings at the free throw line extended, bigs at the elbows.',
      'The pass to 5 at the elbow starts the play.',
      'First look: 2 cuts back door the moment 5 catches.',
      'Not open? 2 keeps going out to the far corner, which pulls a defender away.',
      'Second look: 4 dives to the basket for the high-low pass from 5.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: { x: 25, y: 33 }, o2: { x: 44, y: 23 }, o3: { x: 6, y: 23 }, o4: spot('left-elbow'), o5: spot('right-elbow') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'pass', from: 'o1', to: 'o5' }], note: 'Entry pass to 5 at the elbow.' },
        { moves: [{ type: 'cut', from: 'o2', at: { x: 28, y: 7 }, via: [{ x: 39, y: 13 }] }], note: 'First look: 2 back door.' },
        { moves: [{ type: 'cut', from: 'o2', at: spot('left-corner'), via: [{ x: 14, y: 4 }] }], note: '2 clears to the far corner.' },
        { moves: [{ type: 'cut', from: 'o4', at: { x: 23, y: 8 } }], note: 'Second look: 4 dives to the basket.' },
        { moves: [{ type: 'pass', from: 'o5', to: 'o4' }], note: 'High-low pass.' },
      ]
    ),
  },
  {
    slug: 'pick-and-roll-basic',
    title: 'Pick-and-roll: the basics',
    category: 'pick_and_roll',
    min_age: 'U12',
    tags: ['ball screen', 'two-player'],
    description:
      'The big sets a screen for the ball handler, then rolls to the basket. The ball handler reads the big defender and makes the pass or the shot.',
    coaching_points: [
      '5: sprint to the screen and stop with a wide base before 1 moves.',
      '1: wait for the screen, then go shoulder to shoulder so your defender cannot slip through.',
      '5 rolls to the basket with a hand up as soon as 1 is past.',
      "1 reads 5's defender: if they step up to you, pass to 5; if they stay back, shoot or keep driving.",
      'Everyone else spaces out; 4 lifts to the top for the pass back out.',
      'Ball screens are not allowed at U11 and under.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: spot('right-corner'), o3: spot('left-corner'), o4: spot('left-wing'), o5: spot('high-post') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'screen', from: 'o5', to: 'o1', at: { x: 28, y: 28.5 } }], note: '5 sprints up to screen.' },
        { moves: [{ type: 'dribble', from: 'o1', at: { x: 37, y: 22 }, via: [{ x: 31.5, y: 30.5 }] }], note: '1 comes off the screen.' },
        {
          moves: [
            { type: 'cut', from: 'o5', at: { x: 27, y: 9 } },
            { type: 'cut', from: 'o4', at: spot('left-slot') },
          ],
          note: '5 rolls to the basket; 4 lifts for the pass back out.',
        },
        { moves: [{ type: 'pass', from: 'o1', to: 'o5' }], note: 'Bounce pass to the roller.' },
      ]
    ),
  },
  {
    slug: 'press-break-middle',
    title: 'Press break: hit the middle',
    category: 'press_break',
    min_age: 'U12',
    tags: ['press break', 'full court'],
    description:
      'Beating a full-court press from your own baseline. Get it in, find the player flashing to the middle, and pass ahead. The hoop in the picture is the one you defend.',
    coaching_points: [
      'Get the ball in within 5 seconds: everyone is moving before the whistle.',
      'Meet the pass. Never wait in a corner, where the press traps you.',
      'The middle is the gap in most presses: 5 flashes to it, catches, turns and looks up the floor.',
      'Pass first, dribble second. A pass beats the press faster than a dribble.',
      'The inbounder steps in behind the ball as the safe pass back.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o4: { x: 30, y: -2.5 }, o1: { x: 18, y: 13 }, o2: { x: 32, y: 13 }, o5: { x: 25, y: 33 }, o3: { x: 45, y: 42 } },
        ball: 'o4',
      },
      [
        {
          moves: [
            { type: 'cut', from: 'o2', at: { x: 42, y: 10 } },
            { type: 'cut', from: 'o1', at: { x: 8, y: 12 } },
          ],
          note: '1 and 2 cut hard to get open.',
        },
        { moves: [{ type: 'pass', from: 'o4', to: 'o2' }], note: 'Inbound to 2.' },
        {
          moves: [
            { type: 'cut', from: 'o5', at: { x: 25, y: 22 } },
            { type: 'cut', from: 'o4', at: { x: 33, y: 3 } },
            { type: 'cut', from: 'o1', at: { x: 7, y: 34 } },
          ],
          note: '5 flashes to the middle; 4 steps in as the safe pass; 1 runs up the far side.',
        },
        { moves: [{ type: 'pass', from: 'o2', to: 'o5' }], note: 'Hit the middle.' },
        {
          moves: [
            { type: 'pass', from: 'o5', to: 'o1' },
            { type: 'cut', from: 'o3', at: { x: 40, y: 49 } },
          ],
          note: '5 turns and passes ahead; 3 runs on toward the other basket.',
        },
        { moves: [{ type: 'dribble', from: 'o1', at: { x: 10, y: 48 } }], note: '1 dribbles over half court.' },
      ]
    ),
  },
];

/** Every library play: the starter plays, then the launch plays. */
export const LIBRARY_PLAYS: LibraryPlay[] = [...STARTER_PLAYS, ...LAUNCH_PLAYS];

/**
 * Which migration seeds which plays. A migration that has been run is never
 * changed to add plays: new plays get a new migration and a new entry here.
 */
export const PLAY_SEEDS: ReadonlyArray<{ migration: string; plays: readonly LibraryPlay[] }> = [
  { migration: '00060_plays.sql', plays: STARTER_PLAYS },
  { migration: '00063_launch_plays.sql', plays: LAUNCH_PLAYS },
];
