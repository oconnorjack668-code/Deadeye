// src/data/plays/launch.ts
// The launch plays (phase F4 of docs/plans/film-and-plays.md, section 10),
// added to the ten starter plays in library.ts. Drawn for Deadeye, not copied
// (safety rule 8). Same shape and checks as library.ts; seeded by
// supabase/migrations/00063_launch_plays.sql, which the test in
// __tests__/plays-library.test.ts writes from this file.
//
// Every play here has at least three players who move, so the role quiz has
// something to ask, and is marked from the youngest grade Basketball Ireland
// allows it (src/lib/plays/ageRules.ts): no ball screens at U11 and under,
// zone offences from U15.
//
// Out of bounds plays: under your own basket the inbounder stands behind the
// baseline (y < 0); on the sideline, outside the right sideline (x > 50).
import { buildDiagram } from '@/lib/plays/build';
import { spot } from '@/lib/plays/spots';
import type { LibraryPlay } from './library';

export const LAUNCH_PLAYS: LibraryPlay[] = [
  // ---------------------------------------------------------------------------
  // Principles
  {
    slug: 'dribble-drive',
    title: 'Dribble-drive: drive and kick',
    category: 'principles',
    min_age: 'U10',
    tags: ['driving', 'spacing', 'kick-out'],
    description:
      'Drive into a gap, and everyone else moves to where the driver can see them. If a defender helps, pass to the player they left, who attacks again.',
    coaching_points: [
      'Drive hard into the gap between two defenders, with your head up.',
      'If the drive comes toward you, move away to a spot where the driver can see you.',
      'Someone always fills the spot behind the drive, so there is a pass back out.',
      'Driver: if a defender helps, pass to the teammate they left. If nobody helps, finish at the basket.',
      'Catch ready to shoot, drive or pass. Do not hold the ball.',
    ],
    is_free: true,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: spot('right-wing'), o3: spot('left-wing'), o4: spot('right-corner'), o5: spot('left-corner') },
        ball: 'o1',
      },
      [
        {
          moves: [
            { type: 'dribble', from: 'o1', at: { x: 29, y: 13 }, via: [{ x: 28, y: 24 }] },
            { type: 'cut', from: 'o3', at: spot('top') },
          ],
          note: '1 drives the gap; 3 fills the top behind the drive.',
        },
        {
          moves: [
            { type: 'pass', from: 'o1', to: 'o2' },
            { type: 'cut', from: 'o1', at: spot('left-wing'), via: [{ x: 20, y: 9 }] },
          ],
          note: "2's defender helped, so 1 passes out to 2, then clears to the open spot.",
        },
        {
          moves: [
            { type: 'dribble', from: 'o2', at: { x: 39.5, y: 6 }, via: [{ x: 44, y: 13 }] },
            { type: 'cut', from: 'o4', at: spot('right-wing') },
          ],
          note: '2 attacks the baseline; 4 lifts out of the corner to the wing.',
        },
        { moves: [{ type: 'pass', from: 'o2', to: 'o4' }], note: 'Pass out to 4 for the shot, or 2 finishes if nobody helps.' },
      ]
    ),
  },
  {
    slug: 'spacing-fill-the-spots',
    title: 'Spacing: fill the open spot',
    category: 'principles',
    min_age: 'U9',
    tags: ['spacing', 'cutting', 'motion'],
    description:
      'Good spacing gives the ball handler room. Here 1 dribbles toward 2, 2 cuts to the basket, and everyone moves so that each open spot is filled again.',
    coaching_points: [
      'Stand 12 to 15 feet from your nearest teammate, so one defender cannot guard two of you.',
      'If a teammate dribbles at you, cut to the basket.',
      'When a spot opens up, the nearest player fills it.',
      'Stay out of the paint unless you are cutting through it.',
      'Keep the corners filled: a player there pulls a defender away from the basket.',
    ],
    is_free: true,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: spot('right-wing'), o3: spot('left-wing'), o4: spot('right-corner'), o5: spot('left-corner') },
        ball: 'o1',
      },
      [
        {
          moves: [
            { type: 'dribble', from: 'o1', at: spot('right-slot') },
            { type: 'cut', from: 'o2', at: { x: 26, y: 7 }, via: [{ x: 41, y: 14 }] },
          ],
          note: '1 dribbles at 2, so 2 cuts to the basket.',
        },
        {
          moves: [
            { type: 'cut', from: 'o4', at: spot('right-wing') },
            { type: 'cut', from: 'o2', at: spot('right-corner'), via: [{ x: 36, y: 5 }] },
          ],
          note: '4 fills the wing 2 left; 2 clears to the corner 4 left.',
        },
        {
          moves: [
            { type: 'cut', from: 'o3', at: spot('left-slot') },
            { type: 'cut', from: 'o5', at: spot('left-wing') },
          ],
          note: 'The other side moves up one spot each, so no spot stays empty.',
        },
        { moves: [{ type: 'pass', from: 'o1', to: 'o3' }], note: 'Now the ball can swing to the other side.' },
      ]
    ),
  },

  // ---------------------------------------------------------------------------
  // Half-court sets
  {
    slug: 'horns-flare',
    title: 'Horns: flare for the shooter',
    category: 'half_court',
    min_age: 'U11',
    tags: ['horns', 'flare screen', 'shooter'],
    description:
      'A Horns set without a ball screen. 1 passes to 4, then fades away from the ball off a screen from 5 for an open shot on the wing.',
    coaching_points: [
      'Start in Horns: bigs at the elbows, shooters in the corners.',
      '4 pops out to catch. The pass to 4 starts the play.',
      '5 screens and holds still. 1 waits for the screen, then fades to the wing.',
      '1 catches with feet set, ready to shoot.',
      'After the screen, 5 slips to the basket. If the defence helps on 1, 5 is open.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: spot('right-corner'), o3: spot('left-corner'), o4: spot('left-elbow'), o5: spot('right-elbow') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'cut', from: 'o4', at: spot('left-slot') }], note: '4 pops out of the elbow to catch.' },
        { moves: [{ type: 'pass', from: 'o1', to: 'o4' }] },
        { moves: [{ type: 'screen', from: 'o5', to: 'o1', at: { x: 29, y: 27 } }], note: '5 steps up and screens for 1.' },
        { moves: [{ type: 'cut', from: 'o1', at: spot('right-wing'), via: [{ x: 31.5, y: 30.5 }] }], note: '1 fades away from the ball, off the screen, to the wing.' },
        {
          moves: [
            { type: 'pass', from: 'o4', to: 'o1' },
            { type: 'cut', from: 'o5', at: { x: 27, y: 8 } },
          ],
          note: 'Catch and shoot. 5 slips to the basket in case the defence helps.',
        },
      ]
    ),
  },
  {
    slug: 'horns-down',
    title: 'Horns: down screens for the corners',
    category: 'half_court',
    min_age: 'U11',
    tags: ['horns', 'down screen', 'post'],
    description:
      'From Horns, the two bigs go down and screen for the shooters in the corners. The shooters come up to the wings, and the bigs step in toward the ball.',
    coaching_points: [
      'Screeners: go down to the corner player, stop, and hold still.',
      "Corner players: wait for the screen, then come up hard past the screener's shoulder.",
      'After screening, the big steps toward the ball. The screener is often the one left open.',
      '2 catches on the wing facing the basket: shoot, pass inside, or drive.',
      'Feed the post with a bounce pass, away from the defender.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: spot('right-corner'), o3: spot('left-corner'), o4: spot('left-elbow'), o5: spot('right-elbow') },
        ball: 'o1',
      },
      [
        {
          moves: [
            { type: 'screen', from: 'o4', to: 'o3', at: { x: 5, y: 9 } },
            { type: 'screen', from: 'o5', to: 'o2', at: { x: 45, y: 9 } },
          ],
          note: '4 and 5 go down and screen for the corners.',
        },
        {
          moves: [
            { type: 'cut', from: 'o3', at: spot('left-wing'), via: [{ x: 3, y: 12 }] },
            { type: 'cut', from: 'o2', at: spot('right-wing'), via: [{ x: 47, y: 12 }] },
          ],
          note: '3 and 2 come up off the screens to the wings.',
        },
        { moves: [{ type: 'pass', from: 'o1', to: 'o2' }] },
        {
          moves: [
            { type: 'cut', from: 'o5', at: spot('right-block') },
            { type: 'cut', from: 'o4', at: spot('high-post') },
          ],
          note: '5 steps in to the ball-side block; 4 flashes to the high post.',
        },
        { moves: [{ type: 'pass', from: 'o2', to: 'o5' }], note: 'Pass inside to 5, or to 4 at the high post.' },
      ]
    ),
  },
  {
    slug: 'spain-pick-and-roll',
    title: 'Spain pick-and-roll',
    category: 'half_court',
    min_age: 'U15',
    tags: ['spain', 'ball screen', 'back screen'],
    description:
      "A pick-and-roll with a twist: as 5 rolls to the basket, 2 sets a back screen on 5's defender, then pops out for a shot. Two good passes for 1 to choose from.",
    coaching_points: [
      'Learn the basic pick-and-roll first. Spain adds a back screen to free the roller.',
      "2 waits at the free throw line, then screens 5's defender as 5 rolls.",
      '5 rolls hard to the basket with a hand up.',
      'After screening, 2 pops out to the three-point line. The defence often loses 2.',
      '1 reads it: pass to 5 rolling, to 2 popping, or shoot.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: spot('high-post'), o3: spot('left-corner'), o4: spot('right-corner'), o5: spot('right-elbow') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'screen', from: 'o5', to: 'o1', at: { x: 28, y: 28.5 } }], note: '5 screens for 1.' },
        {
          moves: [
            { type: 'dribble', from: 'o1', at: { x: 37, y: 22 }, via: [{ x: 31.5, y: 30.5 }] },
            { type: 'screen', from: 'o2', to: 'o5', at: { x: 28, y: 23.5 } },
          ],
          note: "1 comes off the screen; 2 steps up to screen 5's defender.",
        },
        { moves: [{ type: 'cut', from: 'o5', at: { x: 27, y: 8 }, via: [{ x: 30.5, y: 22 }] }], note: "5 rolls to the basket past 2's screen." },
        { moves: [{ type: 'cut', from: 'o2', at: spot('top') }], note: '2 pops out to the top for a shot.' },
        { moves: [{ type: 'pass', from: 'o1', to: 'o5' }], note: 'Pass to 5 rolling, or to 2 at the top if the defence covers 5.' },
      ]
    ),
  },
  {
    slug: 'chin',
    title: 'Chin: back screen, then ball screen',
    category: 'half_court',
    min_age: 'U13',
    tags: ['chin', 'back screen', 'ball screen'],
    description:
      'Two screens from the same player. 4 back screens for 1 to cut to the basket, then goes out and sets a ball screen for 2 on the wing.',
    coaching_points: [
      'The first pass to the wing starts Chin.',
      '4 back screens for 1, who cuts hard to the basket. Look for 1 first.',
      '1 is not open? Keep going to the ball-side corner.',
      '4 then screens for 2. 2 waits for it, then goes over the top toward the middle.',
      '4 rolls to the basket. 2 passes to 4, to 1 in the corner, or shoots.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: spot('right-wing'), o3: spot('left-corner'), o4: spot('right-elbow'), o5: spot('left-block') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'pass', from: 'o1', to: 'o2' }], note: 'Pass to the wing.' },
        { moves: [{ type: 'screen', from: 'o4', to: 'o1', at: { x: 28, y: 25.5 } }], note: '4 steps up to back screen for 1.' },
        { moves: [{ type: 'cut', from: 'o1', at: { x: 26, y: 8 }, via: [{ x: 30, y: 23 }] }], note: '1 cuts off 4 to the basket. Pass if 1 is open.' },
        {
          moves: [
            { type: 'cut', from: 'o1', at: spot('right-corner'), via: [{ x: 38, y: 5 }] },
            { type: 'screen', from: 'o4', to: 'o2', at: { x: 42, y: 23.5 } },
          ],
          note: '1 clears to the corner. 4 goes out to screen for 2.',
        },
        { moves: [{ type: 'dribble', from: 'o2', at: { x: 32, y: 19 }, via: [{ x: 41, y: 26.5 }] }], note: '2 goes over the screen toward the middle.' },
        { moves: [{ type: 'cut', from: 'o4', at: { x: 28, y: 8 } }], note: '4 rolls to the basket.' },
        { moves: [{ type: 'pass', from: 'o2', to: 'o4' }], note: 'Pass to 4 rolling, or to 1 in the corner.' },
      ]
    ),
  },
  {
    slug: 'ucla-cut',
    title: 'UCLA cut',
    category: 'half_court',
    min_age: 'U10',
    tags: ['ucla', 'back screen', 'cutting'],
    description:
      'The guard passes to the wing and cuts to the basket off a screen at the high post. Named after the UCLA college teams that made it famous.',
    coaching_points: [
      'Pass to the wing, then cut off the screen to the basket.',
      "Walk your defender away first, then cut close to the screener's shoulder.",
      '5: set the screen with your back to the basket and hold still.',
      'Not open? 1 posts up on the block, and 5 pops out to the top.',
      'Then swing the ball to the other side.',
    ],
    is_free: true,
    diagram: buildDiagram(
      {
        positions: { o1: spot('right-slot'), o2: spot('right-wing'), o3: spot('left-corner'), o4: spot('left-block'), o5: spot('high-post') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'pass', from: 'o1', to: 'o2' }] },
        { moves: [{ type: 'screen', from: 'o5', to: 'o1', at: { x: 31.5, y: 22.5 } }], note: '5 steps out to screen for 1.' },
        {
          moves: [
            { type: 'cut', from: 'o1', at: { x: 27, y: 7.5 }, via: [{ x: 31, y: 19 }] },
            { type: 'cut', from: 'o3', at: spot('left-wing') },
          ],
          note: '1 cuts off 5 to the basket; 3 lifts to the wing.',
        },
        {
          moves: [
            { type: 'cut', from: 'o1', at: spot('right-block') },
            { type: 'cut', from: 'o5', at: spot('top') },
          ],
          note: '1 posts up on the block; 5 pops out to the top.',
        },
        { moves: [{ type: 'pass', from: 'o2', to: 'o5' }] },
        { moves: [{ type: 'pass', from: 'o5', to: 'o3' }], note: 'Swing the ball to the other side.' },
      ]
    ),
  },
  {
    slug: 'flex',
    title: 'Flex: flex cut, then down screen',
    category: 'half_court',
    min_age: 'U11',
    tags: ['flex', 'continuity', 'down screen'],
    description:
      'A pattern that keeps going: swing the ball, a baseline cut off a screen, then a down screen for the screener. The same moves repeat on the other side.',
    coaching_points: [
      'Every pass from one side to the other starts the next flex cut.',
      'Cutter: walk your defender up, then cut close to the screener, along the baseline.',
      'Screen the screener: after the flex cut, the passer goes down and screens for 5.',
      '5 comes up ready to catch and shoot.',
      'Repeat it on the other side. The same moves keep going round.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: spot('right-slot'), o2: spot('left-wing'), o3: spot('right-corner'), o4: spot('left-slot'), o5: spot('right-block') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'pass', from: 'o1', to: 'o4' }], note: 'Swing the ball to start.' },
        { moves: [{ type: 'screen', from: 'o5', to: 'o3', at: { x: 37.5, y: 6 } }], note: '5 screens for 3 in the corner.' },
        {
          moves: [
            { type: 'cut', from: 'o3', at: spot('left-block'), via: [{ x: 36, y: 3.5 }, { x: 26, y: 5 }] },
            { type: 'screen', from: 'o1', to: 'o5', at: { x: 35, y: 13 } },
          ],
          note: '3 cuts along the baseline to the ball side. 1 goes down to screen for 5.',
        },
        {
          moves: [{ type: 'cut', from: 'o5', at: spot('right-slot'), via: [{ x: 36, y: 18 }] }],
          note: '5 comes up off the screen. If 3 is open on the block, 4 passes for the layup.',
        },
        {
          moves: [
            { type: 'pass', from: 'o4', to: 'o5' },
            { type: 'cut', from: 'o1', at: spot('right-corner') },
          ],
          note: '4 swings it back to 5. 1 steps out to the corner, ready for the next flex cut.',
        },
      ]
    ),
  },
  {
    slug: 'stack',
    title: 'Stack: pop out, then cross screen',
    category: 'half_court',
    min_age: 'U10',
    tags: ['stack', 'cross screen', 'post'],
    description:
      'Two stacks of two on the blocks. The top players pop out to the wings, then a screen across the lane frees 5 on the ball-side block.',
    coaching_points: [
      'Two players line up on each block. The players on top pop out to the wings.',
      'Pop out hard and show your hands: you are the first pass.',
      '4 screens across the lane for 5, then steps up to the high post.',
      '5 waits for the screen, then cuts under it to the ball-side block.',
      'Feed 5 with a bounce pass, or pass to 4 at the high post.',
    ],
    is_free: true,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: { x: 14.5, y: 13 }, o3: { x: 35.5, y: 13 }, o4: spot('left-block'), o5: spot('right-block') },
        ball: 'o1',
      },
      [
        {
          moves: [
            { type: 'cut', from: 'o2', at: spot('left-wing') },
            { type: 'cut', from: 'o3', at: spot('right-wing') },
          ],
          note: '2 and 3 pop out of the stacks to the wings.',
        },
        { moves: [{ type: 'pass', from: 'o1', to: 'o2' }] },
        { moves: [{ type: 'screen', from: 'o4', to: 'o5', at: { x: 29, y: 8 } }], note: '4 screens across the lane for 5.' },
        { moves: [{ type: 'cut', from: 'o5', at: spot('left-block'), via: [{ x: 28, y: 5 }] }], note: '5 cuts under the screen to the ball-side block.' },
        {
          moves: [
            { type: 'pass', from: 'o2', to: 'o5' },
            { type: 'cut', from: 'o4', at: spot('high-post') },
          ],
          note: 'Pass inside to 5. 4 steps up to the high post.',
        },
      ]
    ),
  },

  // ---------------------------------------------------------------------------
  // Pick-and-roll
  {
    slug: 'side-pick-and-roll',
    title: 'Side pick-and-roll',
    category: 'pick_and_roll',
    min_age: 'U12',
    tags: ['ball screen', 'wing', 'two-player'],
    description: 'A pick-and-roll from the wing. 5 screens on the top side so 1 can attack the middle, then rolls to the basket.',
    coaching_points: [
      "Screen on the top side of 1's defender, so 1 can go toward the middle.",
      '1: wait for the screen, then go past it shoulder to shoulder.',
      '5 rolls to the basket as soon as 1 is past.',
      '2 stays in the corner: if their defender helps, 2 is open.',
      '3 lifts to the top so 1 always has a pass back out.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: spot('right-wing'), o2: spot('right-corner'), o3: spot('left-wing'), o4: spot('left-corner'), o5: spot('right-block') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'screen', from: 'o5', to: 'o1', at: { x: 42, y: 23.5 } }], note: '5 comes up to screen on the top side.' },
        { moves: [{ type: 'dribble', from: 'o1', at: { x: 32, y: 20 }, via: [{ x: 41, y: 26.5 }] }], note: '1 goes over the screen toward the middle.' },
        {
          moves: [
            { type: 'cut', from: 'o5', at: { x: 28, y: 8 } },
            { type: 'cut', from: 'o3', at: spot('top') },
          ],
          note: '5 rolls to the basket; 3 lifts to the top for the pass back out.',
        },
        { moves: [{ type: 'pass', from: 'o1', to: 'o5' }], note: 'Pass to 5, or to 3 at the top, or keep driving.' },
      ]
    ),
  },
  {
    slug: 'pick-and-pop',
    title: 'Pick-and-pop',
    category: 'pick_and_roll',
    min_age: 'U12',
    tags: ['ball screen', 'pop', 'shooter'],
    description: '4 screens for 1, then steps back out to the top for a shot while 1 drives. Good for a screener who can shoot.',
    coaching_points: [
      'A pick-and-pop is a pick-and-roll where the screener steps out for a shot instead of rolling.',
      '4 sets the screen, then pops out behind the three-point line.',
      "1 drives hard so 4's defender has to help, then passes back to 4.",
      '5 clears to the other side to keep the lane empty.',
      'Use it when your screener can shoot.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: spot('right-corner'), o3: spot('left-corner'), o4: spot('left-elbow'), o5: spot('left-block') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'screen', from: 'o4', to: 'o1', at: { x: 21.5, y: 28.5 } }], note: '4 screens for 1.' },
        {
          moves: [
            { type: 'dribble', from: 'o1', at: { x: 16, y: 21 }, via: [{ x: 18.5, y: 31 }] },
            { type: 'cut', from: 'o5', at: spot('right-block') },
          ],
          note: '1 comes off the screen; 5 clears to the other block.',
        },
        { moves: [{ type: 'cut', from: 'o4', at: spot('top') }], note: '4 pops back out to the top instead of rolling.' },
        { moves: [{ type: 'pass', from: 'o1', to: 'o4' }], note: '4 catches ready to shoot.' },
      ]
    ),
  },

  // ---------------------------------------------------------------------------
  // Baseline out of bounds
  {
    slug: 'blob-stack',
    title: 'Stack: baseline out of bounds',
    category: 'blob',
    min_age: 'U10',
    tags: ['out of bounds', 'stack', 'screens'],
    description:
      'Two stacks of two on the blocks, with the ball out under your own basket. A screen sends a shooter to the corner, then a cutter goes to the basket.',
    coaching_points: [
      'Line up in two stacks of two on the blocks. Your best passer takes it out.',
      'The inbounder slaps the ball to start everyone at once.',
      '5 turns and screens; 3 pops to the corner ready to shoot.',
      '4 cuts to the basket while the defence watches the corner.',
      '2 is the safe pass at the top. Never throw a pass you are not sure of.',
    ],
    is_free: true,
    diagram: buildDiagram(
      {
        positions: { o1: { x: 31, y: -2.5 }, o2: { x: 14.5, y: 13 }, o3: { x: 35.5, y: 13 }, o4: spot('left-block'), o5: spot('right-block') },
        ball: 'o1',
      },
      [
        {
          moves: [
            { type: 'screen', from: 'o5', to: 'o3', at: { x: 37.5, y: 10 } },
            { type: 'cut', from: 'o2', at: spot('top') },
          ],
          note: '5 screens for 3; 2 goes out to the top as the safe pass.',
        },
        { moves: [{ type: 'cut', from: 'o3', at: spot('right-corner'), via: [{ x: 40, y: 8 }] }], note: '3 pops off the screen to the corner.' },
        { moves: [{ type: 'cut', from: 'o4', at: { x: 23, y: 6.5 } }], note: '4 cuts to the basket while the defence watches the corner.' },
        { moves: [{ type: 'pass', from: 'o1', to: 'o4' }], note: 'Pass to 4 at the basket, 3 in the corner, or 2 at the top.' },
      ]
    ),
  },
  {
    slug: 'blob-line',
    title: 'Line: baseline out of bounds',
    category: 'blob',
    min_age: 'U10',
    tags: ['out of bounds', 'line', 'screens'],
    description:
      'Four players in a line across the free throw line. On the slap they all go: one to the corner, one to the top, and a screen frees 4 at the basket.',
    coaching_points: [
      'Line up across the free throw line, everyone facing the ball.',
      'Everyone moves on the slap, at the same time.',
      '5 screens for 4 and holds still; 4 cuts to the basket with a hand up.',
      '2 goes to the ball-side corner; 3 goes out to the top as the safe pass.',
      'After the screen, 5 pops to the high post as another target.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: { x: 31, y: -2.5 }, o2: { x: 44, y: 19 }, o3: { x: 6, y: 19 }, o4: spot('left-elbow'), o5: spot('right-elbow') },
        ball: 'o1',
      },
      [
        {
          moves: [
            { type: 'cut', from: 'o2', at: spot('right-corner'), via: [{ x: 46, y: 10 }] },
            { type: 'cut', from: 'o3', at: spot('top') },
            { type: 'screen', from: 'o5', to: 'o4', at: { x: 21, y: 16 } },
          ],
          note: '2 goes to the corner, 3 to the top as the safe pass. 5 screens for 4.',
        },
        { moves: [{ type: 'cut', from: 'o4', at: { x: 23.5, y: 7 }, via: [{ x: 21, y: 12 }] }], note: '4 cuts off the screen to the basket.' },
        { moves: [{ type: 'cut', from: 'o5', at: spot('high-post') }], note: '5 pops back up to the high post.' },
        { moves: [{ type: 'pass', from: 'o1', to: 'o4' }], note: 'Pass to 4 at the basket, 2 in the corner, or 5 at the high post.' },
      ]
    ),
  },
  {
    slug: 'blob-screen-the-screener',
    title: 'Box: screen the screener',
    category: 'blob',
    min_age: 'U11',
    tags: ['out of bounds', 'box', 'screen the screener'],
    description:
      'From a box under your own basket: 3 screens for 2, then 5 screens for 3. The defence watches the first cut, so the screener is often open at the basket.',
    coaching_points: [
      'Set up in a box. Two screens in a row: the first screener gets screened too.',
      "3 screens for 2, then waits for 5's screen.",
      'The defence watches 2 cut, so 3 is often open at the basket.',
      'Every screener holds still with a wide base. No moving screens.',
      '4 pops to the corner, so there is room near the basket.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: { x: 31, y: -2.5 }, o2: spot('left-elbow'), o3: spot('right-elbow'), o4: spot('left-block'), o5: spot('right-block') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'screen', from: 'o3', to: 'o2', at: { x: 20.5, y: 17.5 } }], note: '3 screens across for 2.' },
        {
          moves: [
            { type: 'cut', from: 'o2', at: spot('right-short-corner'), via: [{ x: 28, y: 11 }] },
            { type: 'screen', from: 'o5', to: 'o3', at: { x: 22, y: 14 } },
          ],
          note: '2 cuts off the screen to the ball side. 5 screens for the screener, 3.',
        },
        {
          moves: [
            { type: 'cut', from: 'o3', at: { x: 25.5, y: 7.5 }, via: [{ x: 23.5, y: 11 }] },
            { type: 'cut', from: 'o4', at: spot('left-corner') },
          ],
          note: '3 cuts off 5 to the basket; 4 pops to the corner.',
        },
        { moves: [{ type: 'pass', from: 'o1', to: 'o3' }], note: 'Pass to 3 at the basket, or to 2 on the ball side.' },
      ]
    ),
  },
  {
    slug: 'blob-inbounder-cut',
    title: 'Box: the inbounder cuts in',
    category: 'blob',
    min_age: 'U10',
    tags: ['out of bounds', 'box', 'inbounder'],
    description:
      'Get the ball in to the corner, then screen for the player who passed it in. Defenders often forget the inbounder once the ball is in.',
    coaching_points: [
      'Once the ball is in, the inbounder is a player again. Defenders often forget them.',
      '3 pops out to the corner to catch the inbound pass.',
      '5 screens for 1 straight after the pass.',
      '1 steps in and cuts to the basket with a hand up.',
      '2 stays at the top as the safe pass if nothing is open.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: { x: 31, y: -2.5 }, o2: spot('left-elbow'), o3: spot('right-elbow'), o4: spot('left-block'), o5: spot('right-block') },
        ball: 'o1',
      },
      [
        {
          moves: [
            { type: 'cut', from: 'o3', at: spot('right-corner'), via: [{ x: 40, y: 10 }] },
            { type: 'cut', from: 'o2', at: spot('top') },
          ],
          note: '3 pops out to the corner; 2 goes out to the top.',
        },
        { moves: [{ type: 'pass', from: 'o1', to: 'o3' }], note: 'Inbound to 3 in the corner.' },
        { moves: [{ type: 'screen', from: 'o5', to: 'o1', at: { x: 33, y: 3 } }], note: '5 screens for 1, who has just passed the ball in.' },
        {
          moves: [
            { type: 'cut', from: 'o1', at: { x: 26, y: 6 }, via: [{ x: 30, y: 1 }] },
            { type: 'cut', from: 'o4', at: spot('left-corner') },
          ],
          note: '1 steps in and cuts off 5 to the basket; 4 clears to the corner.',
        },
        { moves: [{ type: 'pass', from: 'o3', to: 'o1' }], note: 'Pass to 1 for the layup.' },
      ]
    ),
  },

  // ---------------------------------------------------------------------------
  // Sideline out of bounds
  {
    slug: 'slob-box',
    title: 'Box: sideline out of bounds',
    category: 'slob',
    min_age: 'U10',
    tags: ['out of bounds', 'sideline', 'down screen'],
    description:
      'The ball is out on the sideline. 5 screens down for 1 to come and get it, then turns and goes to the basket.',
    coaching_points: [
      'Get the ball in safely first. Then run the play.',
      '5 screens for 1, then turns and goes to the basket.',
      '1 comes up hard to the wing to catch, then faces the basket.',
      '2 goes to the top as the safe pass.',
      'The inbounder steps in to the corner after passing, so the floor stays spread.',
    ],
    is_free: true,
    diagram: buildDiagram(
      {
        positions: { o1: spot('right-block'), o2: spot('left-elbow'), o3: { x: 52.5, y: 26 }, o4: spot('left-block'), o5: spot('right-elbow') },
        ball: 'o3',
      },
      [
        { moves: [{ type: 'screen', from: 'o5', to: 'o1', at: { x: 35, y: 12.5 } }], note: '5 goes down to screen for 1.' },
        {
          moves: [
            { type: 'cut', from: 'o1', at: spot('right-wing'), via: [{ x: 38, y: 14 }] },
            { type: 'cut', from: 'o2', at: spot('top') },
          ],
          note: '1 comes up off the screen to the wing; 2 goes out to the top.',
        },
        { moves: [{ type: 'pass', from: 'o3', to: 'o1' }], note: 'Inbound to 1 on the wing.' },
        {
          moves: [
            { type: 'cut', from: 'o5', at: { x: 28, y: 8 } },
            { type: 'cut', from: 'o3', at: spot('right-corner'), via: [{ x: 49.5, y: 14 }] },
          ],
          note: '5 turns and goes to the basket; 3 steps in to the corner.',
        },
        { moves: [{ type: 'pass', from: 'o1', to: 'o5' }], note: 'Pass inside to 5, or to 3 in the corner.' },
      ]
    ),
  },
  {
    slug: 'slob-stack',
    title: 'Stack: sideline out of bounds',
    category: 'slob',
    min_age: 'U10',
    tags: ['out of bounds', 'sideline', 'stack'],
    description:
      'Three players stacked near the ball break three ways on the slap, then 4 steps down to the block once the defence has spread out.',
    coaching_points: [
      'Line up in a stack near the ball. Everyone breaks on the slap.',
      '1 goes to the wing, 5 to the corner, 2 to the top: three ways to get the ball in.',
      '4 waits, then steps down to the block once the defence has spread out.',
      'Catch, face the basket, and look inside to 4.',
      'Inbounder: after passing, step back onto the court for a pass back.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: { x: 34.5, y: 20 }, o2: spot('left-slot'), o3: { x: 52.5, y: 26 }, o4: { x: 34.5, y: 16 }, o5: { x: 34.5, y: 12 } },
        ball: 'o3',
      },
      [
        {
          moves: [
            { type: 'cut', from: 'o1', at: spot('right-wing') },
            { type: 'cut', from: 'o5', at: spot('right-corner'), via: [{ x: 40, y: 8 }] },
            { type: 'cut', from: 'o2', at: spot('top') },
          ],
          note: '1 breaks to the wing, 5 to the corner, 2 to the top.',
        },
        { moves: [{ type: 'cut', from: 'o4', at: spot('right-block') }], note: '4 steps down to the block.' },
        { moves: [{ type: 'pass', from: 'o3', to: 'o1' }], note: 'Inbound to 1 on the wing.' },
        {
          moves: [
            { type: 'pass', from: 'o1', to: 'o4' },
            { type: 'cut', from: 'o3', at: spot('right-slot') },
          ],
          note: 'Pass inside to 4. 3 steps in for a pass back.',
        },
      ]
    ),
  },
  {
    slug: 'slob-back-screen',
    title: 'Sideline: screen for the inbounder',
    category: 'slob',
    min_age: 'U11',
    tags: ['out of bounds', 'sideline', 'back screen'],
    description:
      'Get it in to 1, then 5 sets a back screen for the inbounder, who cuts to the basket. Defenders often relax once the ball is in.',
    coaching_points: [
      'Get the ball in to 1 first.',
      'The inbounder steps onto the wing after passing. Defenders often relax here.',
      "5 sets the screen behind 3's defender and holds still.",
      "3 cuts to the basket past the screener's shoulder, hand up.",
      '4 lifts to the top so the ball can swing if 3 is covered.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: spot('left-wing'), o3: { x: 52.5, y: 26 }, o4: spot('high-post'), o5: spot('right-elbow') },
        ball: 'o3',
      },
      [
        { moves: [{ type: 'cut', from: 'o1', at: spot('right-slot') }], note: '1 comes toward the ball.' },
        { moves: [{ type: 'pass', from: 'o3', to: 'o1' }] },
        {
          moves: [
            { type: 'cut', from: 'o3', at: spot('right-wing') },
            { type: 'screen', from: 'o5', to: 'o3', at: { x: 41, y: 17.5 } },
          ],
          note: "3 steps in to the wing; 5 sets a back screen behind 3's defender.",
        },
        {
          moves: [
            { type: 'cut', from: 'o3', at: { x: 28, y: 7.5 }, via: [{ x: 39, y: 13 }] },
            { type: 'cut', from: 'o4', at: spot('top') },
          ],
          note: '3 cuts to the basket off the screen; 4 lifts to the top.',
        },
        { moves: [{ type: 'pass', from: 'o1', to: 'o3' }], note: 'Bounce pass to 3. If 3 is covered, swing it to 4 at the top.' },
      ]
    ),
  },
  {
    slug: 'slob-ball-screen',
    title: 'Sideline: get it in, then pick-and-roll',
    category: 'slob',
    min_age: 'U12',
    tags: ['out of bounds', 'sideline', 'ball screen'],
    description: '1 cuts out to catch the inbound pass, and 5 runs up for a pick-and-roll straight away, before the defence is set.',
    coaching_points: [
      'Get it in first: 1 cuts hard out to the ball.',
      '5 runs up and screens as soon as 1 catches.',
      '1 waits for the screen, then attacks the middle.',
      '5 rolls to the basket with a hand up.',
      '2 steps in to the corner after the pass. A defender who helps leaves 2 open.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: spot('high-post'), o2: { x: 52.5, y: 30 }, o3: spot('left-wing'), o4: spot('left-corner'), o5: spot('right-block') },
        ball: 'o2',
      },
      [
        { moves: [{ type: 'cut', from: 'o1', at: spot('right-slot'), via: [{ x: 30, y: 23 }] }], note: '1 cuts out to the ball.' },
        { moves: [{ type: 'pass', from: 'o2', to: 'o1' }] },
        {
          moves: [
            { type: 'screen', from: 'o5', to: 'o1', at: { x: 31.5, y: 27 } },
            { type: 'cut', from: 'o2', at: spot('right-corner'), via: [{ x: 49.5, y: 16 }] },
          ],
          note: '5 runs up to screen for 1; 2 steps in to the corner.',
        },
        { moves: [{ type: 'dribble', from: 'o1', at: { x: 25, y: 21 }, via: [{ x: 31, y: 30.5 }] }], note: '1 comes off the screen toward the middle.' },
        {
          moves: [
            { type: 'cut', from: 'o5', at: { x: 27, y: 8 } },
            { type: 'cut', from: 'o3', at: spot('left-slot') },
          ],
          note: '5 rolls to the basket; 3 lifts for the pass back out.',
        },
        { moves: [{ type: 'pass', from: 'o1', to: 'o5' }], note: 'Pass to 5 rolling, or to 2 in the corner.' },
      ]
    ),
  },

  // ---------------------------------------------------------------------------
  // Press breaks
  {
    slug: 'press-break-reverse',
    title: 'Press break: swing it back',
    category: 'press_break',
    min_age: 'U12',
    tags: ['press break', 'full court', 'reversal'],
    description:
      'When the press traps the first pass, swing the ball back to the inbounder and up the other side. The hoop in the picture is the one you defend.',
    coaching_points: [
      'The inbounder steps in after the pass, behind the ball, ready for a pass back.',
      'In a trap, do not panic: pivot, keep the ball high, and look for the pass back.',
      'Swing the ball away from the trap. The press cannot cover both sides.',
      'Pass ahead whenever you can. A pass beats the press faster than a dribble.',
      'Someone is always ahead of the ball, so there is a pass up the floor.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: { x: 15, y: 12 }, o2: { x: 35, y: 12 }, o3: { x: 44, y: 40 }, o4: { x: 20, y: -2.5 }, o5: { x: 25, y: 30 } },
        ball: 'o4',
      },
      [
        { moves: [{ type: 'cut', from: 'o1', at: spot('left-wing') }], note: '1 cuts out to the free throw line extended.' },
        { moves: [{ type: 'pass', from: 'o4', to: 'o1' }], note: 'Inbound to 1.' },
        {
          moves: [
            { type: 'cut', from: 'o4', at: { x: 20, y: 2 } },
            { type: 'cut', from: 'o2', at: spot('right-wing') },
            { type: 'cut', from: 'o5', at: spot('high-post') },
          ],
          note: 'The press traps 1. 4 steps in behind the ball; 2 gets open on the far side; 5 comes back to the middle.',
        },
        { moves: [{ type: 'pass', from: 'o1', to: 'o4' }], note: 'Pass back to 4, away from the trap.' },
        {
          moves: [
            { type: 'pass', from: 'o4', to: 'o2' },
            { type: 'cut', from: 'o3', at: { x: 30, y: 49 } },
          ],
          note: '4 swings it up to 2. 3 runs ahead past half court.',
        },
        {
          moves: [
            { type: 'dribble', from: 'o2', at: { x: 40, y: 46 } },
            { type: 'cut', from: 'o5', at: { x: 27, y: 38 } },
          ],
          note: '2 dribbles over half court; 5 follows in the middle.',
        },
      ]
    ),
  },

  // ---------------------------------------------------------------------------
  // Zone offence (U15 and up: man-to-man only at U14 and under)
  {
    slug: 'zone-2-3-high-post',
    title: 'vs 2-3 zone: high post and short corner',
    category: 'zone_offence',
    min_age: 'U15',
    tags: ['2-3 zone', 'high post', 'short corner'],
    description:
      'Beat a 2-3 zone through the middle. 5 flashes to the high post, passes to 4 in the short corner behind the zone, then dives to the basket.',
    coaching_points: [
      'Against a 2-3 zone, start with one player at the top: it splits the two front defenders.',
      'Get the ball to the high post. The zone has to squeeze in to guard it.',
      '5 catches, turns and faces the basket before deciding.',
      'The short corner is behind the zone. When the middle defender steps up, 4 is open there.',
      'Zones are only allowed from U15 in Basketball Ireland underage games.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: spot('right-wing'), o3: spot('left-wing'), o4: spot('right-block'), o5: spot('left-block') },
        ball: 'o1',
      },
      [
        {
          moves: [
            { type: 'cut', from: 'o5', at: spot('high-post') },
            { type: 'cut', from: 'o4', at: spot('right-short-corner') },
          ],
          note: '5 flashes to the middle of the zone; 4 slides to the short corner.',
        },
        {
          moves: [
            { type: 'pass', from: 'o1', to: 'o5' },
            { type: 'cut', from: 'o3', at: spot('left-corner') },
          ],
          note: '5 catches facing the basket. 3 drops to the corner.',
        },
        { moves: [{ type: 'pass', from: 'o5', to: 'o4' }], note: 'The middle defender steps up to 5, so 4 is open in the short corner.' },
        { moves: [{ type: 'cut', from: 'o5', at: { x: 26, y: 7 } }], note: '5 dives to the basket behind the defence.' },
        { moves: [{ type: 'pass', from: 'o4', to: 'o5' }], note: 'Shoot, or pass to 5 at the basket.' },
      ]
    ),
  },
  {
    slug: 'zone-2-3-overload',
    title: 'vs 2-3 zone: overload one side',
    category: 'zone_offence',
    min_age: 'U15',
    tags: ['2-3 zone', 'overload', 'baseline cut'],
    description:
      'Put more attackers on one side than the zone can guard. 3 runs the baseline to the far corner, and a pass there pulls a defender out and opens the block.',
    coaching_points: [
      'Overload: put more attackers on one side than the zone has defenders there.',
      '3 runs the baseline to make the overload. Go fast, behind the defence.',
      'A pass to the corner pulls the back defender out, which opens the block.',
      'Fake before you pass: zone defenders follow your eyes.',
      '4 slides to the far side for a rebound or a pass across.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: spot('top'), o2: spot('right-wing'), o3: spot('left-wing'), o4: spot('high-post'), o5: spot('left-block') },
        ball: 'o1',
      },
      [
        {
          moves: [{ type: 'cut', from: 'o3', at: spot('right-corner'), via: [{ x: 18, y: 3 }, { x: 34, y: 2 }] }],
          note: '3 runs along the baseline to the right corner.',
        },
        {
          moves: [
            { type: 'pass', from: 'o1', to: 'o2' },
            { type: 'cut', from: 'o5', at: spot('right-block') },
          ],
          note: '5 follows to the ball side: now three players are on the right.',
        },
        {
          moves: [
            { type: 'pass', from: 'o2', to: 'o3' },
            { type: 'cut', from: 'o4', at: spot('left-block') },
          ],
          note: 'The corner pass pulls a back defender out. 4 slides to the far side.',
        },
        { moves: [{ type: 'pass', from: 'o3', to: 'o5' }], note: '5 is open on the block the defender left. If the zone covers 5, pass back out.' },
      ]
    ),
  },
  {
    slug: 'zone-3-2-gaps',
    title: 'vs 3-2 zone: two at the top',
    category: 'zone_offence',
    min_age: 'U15',
    tags: ['3-2 zone', 'gaps', 'high post'],
    description:
      'Against a zone with three defenders at the top, start with two guards in the gaps. A pass to the corner makes a back defender run out, and 5 dives in behind them.',
    coaching_points: [
      'Against three at the top, start with two guards, each standing in a gap.',
      'In a gap, two defenders have to decide who guards you.',
      'The corners are hard for a 3-2 to cover. A pass there makes the back defenders run.',
      '5 flashes to the middle, then dives to the block the defender left.',
      'Move after every pass. A zone is easier to beat when it has to keep shifting.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: spot('left-slot'), o2: spot('right-slot'), o3: spot('left-corner'), o4: spot('right-corner'), o5: spot('left-block') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'cut', from: 'o5', at: spot('high-post') }], note: '5 flashes into the middle, behind the top three defenders.' },
        { moves: [{ type: 'pass', from: 'o1', to: 'o3' }], note: 'Pass to the corner: a back defender has to run out.' },
        {
          moves: [
            { type: 'cut', from: 'o5', at: spot('left-block') },
            { type: 'cut', from: 'o1', at: spot('left-wing') },
            { type: 'cut', from: 'o2', at: spot('top') },
          ],
          note: '5 dives to the block that defender left. 1 slides to the wing; 2 slides to the top.',
        },
        { moves: [{ type: 'pass', from: 'o3', to: 'o5' }], note: 'Pass inside to 5, or back out to 1 for a shot.' },
      ]
    ),
  },
  {
    slug: 'zone-1-3-1-corners',
    title: 'vs 1-3-1 zone: use the corners',
    category: 'zone_offence',
    min_age: 'U15',
    tags: ['1-3-1 zone', 'corners', 'baseline'],
    description:
      'A 1-3-1 zone has one defender along the baseline, so fill both corners. A pass to one corner pulls that defender out, and 5 slides in behind.',
    coaching_points: [
      'The 1-3-1 has only one defender along the baseline. The corners are its weak spot.',
      'Start with two at the top, in the gaps beside the top defender.',
      'Fill both corners. The back defender cannot guard both.',
      'After a corner pass, 5 slides to the block behind the defence.',
      'Look for the pass across to the far corner too.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: spot('left-slot'), o2: spot('right-slot'), o3: spot('left-wing'), o4: spot('right-wing'), o5: spot('right-block') },
        ball: 'o1',
      },
      [
        {
          moves: [
            { type: 'cut', from: 'o3', at: spot('left-corner') },
            { type: 'cut', from: 'o4', at: spot('right-corner') },
          ],
          note: '3 and 4 drop to the corners, where the 1-3-1 is weakest.',
        },
        { moves: [{ type: 'pass', from: 'o1', to: 'o3' }], note: 'Pass to the corner: the one back defender has to run out.' },
        { moves: [{ type: 'cut', from: 'o5', at: spot('left-block'), via: [{ x: 25, y: 6 }] }], note: '5 slides to the ball-side block behind the defence.' },
        { moves: [{ type: 'pass', from: 'o3', to: 'o5' }], note: 'Pass inside to 5. If the zone sinks, swing it back out to 1.' },
      ]
    ),
  },

  // ---------------------------------------------------------------------------
  // End of quarter
  {
    slug: 'last-shot-spread',
    title: 'Last shot: spread the floor and drive',
    category: 'end_of_quarter',
    min_age: 'U10',
    tags: ['end of quarter', 'last shot', 'driving'],
    description:
      'For the last attack of a quarter, when less time is left on the game clock than the shot clock. Everyone clears out and 1 drives with about 7 seconds to go.',
    coaching_points: [
      'Hold the ball near half court until it is time to go. Do not let the clock run out.',
      'Start with about 7 seconds left: enough time to score, too little for the other team to reply.',
      'Everyone else spreads out, so 1 has room to drive.',
      'If a defender helps, pass to the player they left.',
      'Everyone crashes for the rebound once the shot goes up.',
    ],
    is_free: true,
    diagram: buildDiagram(
      {
        positions: { o1: { x: 25, y: 38 }, o2: spot('right-wing'), o3: spot('left-wing'), o4: spot('high-post'), o5: spot('right-block') },
        ball: 'o1',
      },
      [
        {
          moves: [
            { type: 'cut', from: 'o4', at: spot('left-corner'), via: [{ x: 12, y: 8 }] },
            { type: 'cut', from: 'o5', at: spot('right-corner') },
          ],
          note: 'With about 10 seconds left, the bigs clear to the corners.',
        },
        { moves: [{ type: 'dribble', from: 'o1', at: spot('top') }], note: 'At about 7 seconds, 1 starts.' },
        { moves: [{ type: 'dribble', from: 'o1', at: { x: 21.5, y: 12 } }], note: '1 drives hard to the basket.' },
        { moves: [{ type: 'pass', from: 'o1', to: 'o3' }], note: "If 3's defender helps, pass to 3 for the shot. If nobody helps, 1 finishes." },
      ]
    ),
  },
  {
    slug: 'last-shot-ball-screen',
    title: 'Last shot: high ball screen',
    category: 'end_of_quarter',
    min_age: 'U12',
    tags: ['end of quarter', 'last shot', 'ball screen'],
    description:
      'For the last attack of a quarter: 1 waits near half court, then 5 sets a ball screen at the top with about 8 seconds left.',
    coaching_points: [
      'Start with about 8 seconds left. A pick-and-roll takes a little longer than a drive.',
      '5 screens at the top and holds still; 1 waits for it.',
      '1 attacks: shoot, pass to 5 rolling, or pass to the open corner.',
      'Get the shot up before the buzzer. A good shot with 2 seconds left beats a rushed one at the end.',
      'Everyone crashes for the rebound.',
    ],
    is_free: false,
    diagram: buildDiagram(
      {
        positions: { o1: { x: 25, y: 38 }, o2: spot('right-corner'), o3: spot('left-corner'), o4: spot('left-wing'), o5: spot('high-post') },
        ball: 'o1',
      },
      [
        { moves: [{ type: 'dribble', from: 'o1', at: spot('top') }], note: 'At about 8 seconds, 1 dribbles to the top.' },
        { moves: [{ type: 'screen', from: 'o5', to: 'o1', at: { x: 28, y: 28.5 } }], note: '5 runs up to screen.' },
        {
          moves: [
            { type: 'dribble', from: 'o1', at: { x: 36, y: 21 }, via: [{ x: 31.5, y: 30.5 }] },
            { type: 'cut', from: 'o4', at: spot('left-slot') },
          ],
          note: '1 comes off the screen; 4 lifts behind the play as the safe pass.',
        },
        { moves: [{ type: 'cut', from: 'o5', at: { x: 27, y: 8 } }], note: '5 rolls to the basket.' },
        { moves: [{ type: 'pass', from: 'o1', to: 'o5' }], note: 'Pass to 5, shoot, or pass to 2 in the corner if their defender helps.' },
      ]
    ),
  },
];
