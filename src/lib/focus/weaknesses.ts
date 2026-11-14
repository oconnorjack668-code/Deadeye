// src/lib/focus/weaknesses.ts
// The weaknesses a player or coach can name, and where each one points in the
// content Deadeye already has: drill sub-skills (drills table), IQ lessons
// (study_items: a curated film clip plus quiz questions) and guides.
//
// This is the part of Focus Finder that works with no AI key at all. The AI
// plan (ai.ts) is a layer on top: it can only choose from the same content,
// never invent a drill or a video, so the free answer and the AI answer can
// never disagree about what exists.
//
// Lessons are referenced by topic slug plus a word from the lesson title
// rather than by id, because ids differ between databases and slugs do not.
// Every reference here is checked against the live titles (13 Nov 2026) in
// __tests__/focus.test.ts.

export type WeaknessGroup =
  | 'shooting'
  | 'finishing'
  | 'handling'
  | 'decisions'
  | 'off_ball'
  | 'defense'
  | 'rebounding'
  | 'post'
  | 'athletic'
  | 'mental';

export const GROUP_LABELS: Record<WeaknessGroup, string> = {
  shooting: 'Shooting',
  finishing: 'Finishing',
  handling: 'Ball handling',
  decisions: 'Decisions & IQ',
  off_ball: 'Off the ball',
  defense: 'Defence',
  rebounding: 'Rebounding',
  post: 'Post play',
  athletic: 'Body & fitness',
  mental: 'Mental game',
};

export interface DrillRef {
  skill: string;
  /** Sub-skills that fit best. Empty means any drill of the skill fits a little. */
  subs: string[];
}

export interface LessonRef {
  /** study_topics.slug */
  topic: string;
  /** A lowercase word or phrase in the lesson title. Missing means every lesson in the topic. */
  title?: string;
}

export interface Weakness {
  id: string;
  group: WeaknessGroup;
  /** What the chip says, in a player's words */
  label: string;
  /**
   * Regex sources (case-insensitive, matched on whole words) that mean this
   * weakness when they turn up in free text. Stems end in \w* on purpose, so
   * "pass" does not match "passive".
   */
  phrases: string[];
  /**
   * Vaguer words ("defence", "finishing", "shooting") that only count when
   * nothing more specific in the same group matched, so "transition defence"
   * does not also pull in on-ball defence.
   */
  broad?: string[];
  drills: DrillRef[];
  lessons: LessonRef[];
  guides: string[];
  /** A decision weakness: worth filming a game and asking the coach about a moment (film_questions). */
  ownFilm?: boolean;
}

export const WEAKNESSES: Weakness[] = [
  // Shooting
  {
    id: 'shot_form',
    group: 'shooting',
    label: 'Shooting form is inconsistent',
    phrases: ['form', 'mechanics?', 'release', 'flat shot', 'arc', 'follow[ -]?through', 'guide hand', 'elbow', 'shot pocket', 'shooting technique'],
    drills: [{ skill: 'shooting', subs: ['form', 'close_range'] }],
    lessons: [{ topic: 'shooting-mechanics', title: 'dip' }, { topic: 'shooting-mechanics', title: 'pocket' }],
    guides: [],
  },
  {
    id: 'catch_shoot',
    group: 'shooting',
    label: 'Missing open catch-and-shoot shots',
    phrases: ['catch[ -]and[ -]shoot', 'spot[ -]?ups?', 'open shots?', 'threes', 'three[ -]pointers?', '3[ -]?pointers?', '3s', '3pt', 'outside shot\\w*', 'long range'],
    broad: ['shoot\\w*', 'shots?', 'can\\W?t shoot', 'bad shooter'],
    drills: [{ skill: 'shooting', subs: ['catch_and_shoot', 'movement', 'relocation'] }],
    lessons: [{ topic: 'shooting-mechanics', title: 'hop' }],
    guides: [],
  },
  {
    id: 'off_dribble',
    group: 'shooting',
    label: 'Shooting off the dribble',
    phrases: ['pull[ -]?ups?', 'off the dribble', 'step[ -]?backs?', 'mid[ -]?range', 'jumpers?', 'jump shots?'],
    drills: [{ skill: 'shooting', subs: ['off_the_dribble'] }],
    lessons: [{ topic: 'shooting-mechanics', title: 'hop' }, { topic: 'pnr-reads', title: 'drop' }],
    guides: [],
  },
  {
    id: 'free_throws',
    group: 'shooting',
    label: 'Free throws',
    phrases: ['free[ -]?throws?', 'foul shots?', 'fts?', 'from the line'],
    drills: [{ skill: 'shooting', subs: ['free_throws'] }],
    lessons: [{ topic: 'mental-game', title: 'pre-shot' }],
    guides: ['pre-shot-free-throw-routines'],
  },
  {
    id: 'shooting_pressure',
    group: 'shooting',
    label: 'Shots go in at practice, not in games',
    phrases: ['in games?', 'game shots?', 'contested', 'under pressure', 'choke\\w*', 'go cold', 'cold streaks?', 'practice shooter', 'hand in my face'],
    drills: [{ skill: 'shooting', subs: ['pressure', 'competitive', 'game_speed'] }],
    lessons: [{ topic: 'mental-game', title: 'confidence' }],
    guides: ['building-shooter-confidence'],
  },

  // Finishing
  {
    id: 'finishing_contact',
    group: 'finishing',
    label: 'Finishing through contact',
    phrases: ['contact', 'lay[ -]?ups?', 'physical', 'bigger players?', 'get blocked', 'getting blocked', 'blocked', 'and[ -]?ones?', 'at the rim'],
    broad: ['finish\\w*'],
    drills: [
      { skill: 'finishing', subs: ['through_contact', 'layups', 'close_range'] },
      { skill: 'post_play', subs: ['through_contact'] },
    ],
    lessons: [{ topic: 'finishing-footwork', title: 'veer' }],
    guides: [],
  },
  {
    id: 'touch_finishes',
    group: 'finishing',
    label: 'Touch finishes over taller players',
    phrases: ['floaters?', 'runners?', 'touch', 'over (bigs|length|tall\\w*)', 'tall players?', 'euro[ -]?steps?', 'pro hop'],
    drills: [{ skill: 'finishing', subs: ['floaters', 'euro_step', 'pro_hop', 'off_foot'] }],
    lessons: [{ topic: 'finishing-footwork', title: 'floaters' }, { topic: 'finishing-footwork', title: 'euro' }],
    guides: [],
  },
  {
    id: 'weak_hand',
    group: 'finishing',
    label: 'Weak hand (finishing and dribbling)',
    phrases: ['weak hand', 'off[ -]hand', 'left hand\\w*', 'right hand\\w*', 'wrong hand', 'one hand\\w*', 'only go (left|right)'],
    drills: [
      { skill: 'ball_handling', subs: ['weak_hand', 'two_ball'] },
      { skill: 'finishing', subs: ['layups', 'off_foot'] },
    ],
    lessons: [{ topic: 'ball-handling', title: 'protecting' }],
    guides: [],
  },

  // Ball handling
  {
    id: 'loose_handle',
    group: 'handling',
    label: 'Loose handle, too many turnovers',
    phrases: ['turnovers?', 'turn (it|the ball) over', 'lose the ball', 'losing the ball', 'loose handle', 'loose dribble', 'stripped', 'steals?', 'ball security'],
    broad: ['handles?', 'handling', 'dribbl\\w*', 'ball[ -]handling'],
    drills: [{ skill: 'ball_handling', subs: ['ball_security', 'stationary', 'two_ball'] }],
    lessons: [{ topic: 'ball-handling', title: 'protecting' }],
    guides: [],
  },
  {
    id: 'beat_defender',
    group: 'handling',
    label: "Can't get past my defender",
    phrases: ['get past', 'get by', 'blow[ -]?by', 'create (my own|a) shot', 'first step', 'beat my (man|defender|player)', 'isolations?', 'isos?', 'crossovers?', 'one[ -]on[ -]one', '1v1', '1 on 1', 'attack(ing)? the basket', 'drive\\w*'],
    drills: [
      { skill: 'ball_handling', subs: ['change_of_direction', 'change_of_pace'] },
      { skill: 'footwork', subs: ['jab_series', 'triple_threat', 'closeout_attacks'] },
    ],
    lessons: [{ topic: 'ball-handling', title: 'change of pace' }],
    guides: [],
  },
  {
    id: 'pressure_handling',
    group: 'handling',
    label: 'Struggling against pressure and traps',
    phrases: ['press(es|ed|ing)?', 'traps?', 'trapped', 'full[ -]court', 'double[ -]?team\\w*', 'pressure defen\\w*', 'ball pressure', 'press break'],
    drills: [
      { skill: 'ball_handling', subs: ['reaction', 'on_the_move'] },
      { skill: 'passing', subs: ['passing_pressure', 'outlet'] },
    ],
    lessons: [{ topic: 'ball-handling', title: 'pressure' }, { topic: 'post-play', title: 'double' }],
    guides: [],
  },

  // Decisions and IQ
  {
    id: 'reading_defense',
    group: 'decisions',
    label: 'Slow or wrong decisions',
    phrases: ['decisions?', 'decision[ -]making', 'reads?', 'reading the (game|defen\\w*)', 'hesitat\\w*', 'freeze\\w*', 'panic\\w*', 'iq', 'basketball iq', 'zone defen\\w*', 'against (a )?zone', 'forced shots?', 'bad shots?', 'shot selection'],
    drills: [
      { skill: 'iq', subs: ['advantage'] },
      { skill: 'passing', subs: ['reads'] },
      { skill: 'footwork', subs: ['triple_threat'] },
    ],
    lessons: [{ topic: 'film-study', title: 'reading the defense' }, { topic: 'film-study', title: 'studying yourself' }],
    guides: [],
    ownFilm: true,
  },
  {
    id: 'passing_reads',
    group: 'decisions',
    label: 'Not seeing the open player',
    phrases: ['pass(es|ing)?', 'assists?', 'vision', 'see the (floor|court|open)', 'tunnel vision', 'ball[ -]?hog\\w*', 'selfish', 'open (man|teammate|player)'],
    drills: [{ skill: 'passing', subs: ['reads', 'skip_passes', 'team_passing', 'bounce_passes', 'pocket_passes'] }],
    lessons: [{ topic: 'film-study', title: 'reading the defense' }, { topic: 'post-play', title: 'passing' }],
    guides: [],
    ownFilm: true,
  },
  {
    id: 'pnr_reads',
    group: 'decisions',
    label: 'Pick and roll reads',
    phrases: ['pick[ -]and[ -]rolls?', 'pick ?& ?rolls?', 'pnr', 'p&r', 'ball screens?', 'hedg\\w*', 'blitz\\w*', 'drop coverage', 'using (a |the )?screens?'],
    drills: [
      { skill: 'iq', subs: ['advantage'] },
      { skill: 'passing', subs: ['pocket_passes', 'reads'] },
      { skill: 'off_ball', subs: ['screening'] },
    ],
    lessons: [{ topic: 'pnr-reads' }],
    guides: [],
    ownFilm: true,
  },
  {
    id: 'game_situations',
    group: 'decisions',
    label: 'End of games and the clock',
    phrases: ['close games?', 'end of (the )?(game|quarter)', 'late (in )?games?', 'clock', 'shot clock', 'clutch', 'last (shot|possession)', 'inbounds?', 'timeouts?', 'fouls? to give'],
    drills: [{ skill: 'shooting', subs: ['pressure', 'competitive'] }],
    lessons: [{ topic: 'game-situations' }],
    guides: ['game-day-routine'],
    ownFilm: true,
  },
  {
    id: 'transition_offense',
    group: 'decisions',
    label: 'Fast breaks and numbers advantages',
    phrases: ['fast[ -]?breaks?', 'transition offen\\w*', 'run the floor', 'running the floor', '2[ -]on[ -]1', '3[ -]on[ -]2', '2v1', '3v2', 'numbers advantage', 'outlet'],
    drills: [
      { skill: 'conditioning', subs: ['transition', 'full_court_layups'] },
      { skill: 'off_ball', subs: ['transition'] },
      { skill: 'passing', subs: ['outlet'] },
    ],
    lessons: [{ topic: 'transition', title: 'running the floor' }, { topic: 'transition', title: 'numbers' }],
    guides: [],
  },

  // Off the ball
  {
    id: 'off_ball_movement',
    group: 'off_ball',
    label: 'Standing still off the ball',
    phrases: ['off[ -]the[ -]ball', 'off[ -]ball', 'standing (still|around)', 'cuts?', 'cutting', 'backdoors?', 'spacing', 'move without the ball', 'get open', 'getting open', 'screens? away', 'set(ting)? screens?'],
    drills: [{ skill: 'off_ball', subs: ['cutting', 'spacing', 'screening'] }],
    lessons: [{ topic: 'spacing-off-ball' }],
    guides: [],
  },

  // Defence
  {
    id: 'on_ball_defense',
    group: 'defense',
    label: 'Getting beaten off the dribble on defence',
    phrases: ['get(ting)? beat(en)?', 'blown by', 'on[ -]ball', 'stance', 'slid(e|es|ing)', 'stay(ing)? in front', 'guard(ing)? the ball', 'lockdown', 'perimeter defen\\w*'],
    broad: ['defen[cs]e', 'defending', 'defensive', 'on d'],
    drills: [
      { skill: 'defense', subs: ['on_ball', 'slides', 'stance'] },
      { skill: 'conditioning', subs: ['slides'] },
    ],
    lessons: [{ topic: 'defense-rotations', title: 'on-ball' }],
    guides: [],
  },
  {
    id: 'closeouts_help',
    group: 'defense',
    label: 'Help defence and closeouts',
    phrases: ['close ?outs?', 'closing out', 'help (side|defen\\w*)', 'rotat\\w*', 'open (threes|shooters?|corner)', 'give up (open )?threes', 'giving up (open )?threes', 'ball watching', 'talk(ing)? on defen\\w*', 'communicat\\w*'],
    drills: [{ skill: 'defense', subs: ['closeouts', 'help_recover', 'deny'] }],
    lessons: [{ topic: 'defense-rotations', title: 'closeouts' }],
    guides: [],
  },
  {
    id: 'pnr_defense',
    group: 'defense',
    label: 'Defending ball screens',
    phrases: ['defend(ing)? (the )?(pick|screens?|ball screens?)', 'guard(ing)? (the )?(pick|screens?)', 'screen defen\\w*', 'switch(es|ing)?', 'fight(ing)? over screens?', 'get(ting)? screened'],
    drills: [{ skill: 'defense', subs: ['help_recover', 'on_ball'] }],
    lessons: [{ topic: 'defense-rotations', title: 'pick' }],
    guides: [],
  },
  {
    id: 'transition_defense',
    group: 'defense',
    label: 'Getting back on defence',
    phrases: ['get(ting)? back', 'transition defen\\w*', 'back on defen\\w*', 'easy (baskets|buckets|layups|points)', 'run back', 'running back'],
    drills: [{ skill: 'conditioning', subs: ['sprints', 'transition'] }],
    lessons: [{ topic: 'transition', title: 'transition defense' }],
    guides: [],
  },

  // Rebounding
  {
    id: 'boxing_out',
    group: 'rebounding',
    label: 'Boxing out and defensive rebounds',
    phrases: ['box(ing)? ?outs?', 'rebound\\w*', 'boards', 'second[ -]chance\\w*', 'outrebounded', 'out[ -]rebounded'],
    drills: [{ skill: 'rebounding', subs: ['boxing_out', 'securing'] }],
    lessons: [{ topic: 'rebounding', title: 'box out' }, { topic: 'rebounding', title: 'team' }],
    guides: [],
  },
  {
    id: 'offensive_rebounding',
    group: 'rebounding',
    label: 'Offensive rebounds and putbacks',
    phrases: ['offensive rebound\\w*', 'crash(ing)? the (glass|boards)', 'putbacks?', 'tip[ -]?ins?', 'second efforts?'],
    drills: [{ skill: 'rebounding', subs: ['offensive_rebounding', 'putbacks', 'tipping'] }],
    lessons: [{ topic: 'rebounding', title: 'offensive' }],
    guides: [],
  },

  // Post
  {
    id: 'post_play',
    group: 'post',
    label: 'Post moves and position',
    phrases: ['post(ing)?( up| moves?| play)?', 'back to the basket', 'low post', 'big m[ae]n', 'bigs', 'seal\\w*', 'hook shots?', 'drop steps?', 'up[ -]and[ -]unders?'],
    drills: [{ skill: 'post_play', subs: ['post_moves', 'sealing', 'entry_passes'] }],
    lessons: [{ topic: 'post-play' }],
    guides: [],
  },

  // Body and fitness
  {
    id: 'footwork',
    group: 'athletic',
    label: 'Footwork and travelling',
    phrases: ['footwork', 'travel\\w*', 'pivot\\w*', 'jump stops?', 'feet'],
    drills: [{ skill: 'footwork', subs: ['pivots', 'jump_stops', 'catch_footwork'] }],
    lessons: [{ topic: 'shooting-mechanics', title: 'hop' }],
    guides: [],
  },
  {
    id: 'conditioning',
    group: 'athletic',
    label: 'Running out of energy',
    phrases: ['tired', 'fitness', 'conditioning', 'gassed', 'stamina', 'out of breath', 'fade\\w*', 'energy', 'unfit'],
    drills: [{ skill: 'conditioning', subs: ['sprints', 'game_speed', 'dribble_sprints'] }],
    lessons: [],
    guides: ['fueling-for-training-and-games', 'hydration-for-basketball', 'sleep-for-athletes'],
  },
  {
    id: 'explosiveness',
    group: 'athletic',
    label: 'Speed and jumping',
    phrases: ['jump\\w*', 'vertical', 'explosive\\w*', 'quickness', 'slow feet', 'speed', 'athletic\\w*', 'dunk\\w*'],
    drills: [
      { skill: 'conditioning', subs: ['agility'] },
      { skill: 'footwork', subs: ['agility'] },
    ],
    lessons: [],
    guides: ['how-to-jump-higher', 'knee-health-jumping-landing'],
  },

  // Mental
  {
    id: 'confidence',
    group: 'mental',
    label: 'Confidence and playing scared',
    phrases: ['confiden\\w*', 'scared', 'afraid', 'nervous', 'nerves', 'anxious', 'anxiety', 'shy', 'timid', 'passive', 'not aggressive', 'hide', 'hiding'],
    drills: [{ skill: 'shooting', subs: ['competitive'] }],
    lessons: [{ topic: 'mental-game', title: 'confidence' }],
    guides: ['building-shooter-confidence', 'visualization-for-hoopers'],
  },
  {
    id: 'mistakes',
    group: 'mental',
    label: 'Dwelling on mistakes',
    phrases: ['mistakes?', 'frustrat\\w*', 'angry', 'temper', 'head (goes )?down', 'dwell\\w*', 'bad games?', 'tilt\\w*', 'bounce back'],
    drills: [],
    lessons: [{ topic: 'mental-game', title: 'mistakes' }],
    guides: ['bouncing-back-from-mistakes', 'visualization-for-hoopers'],
  },
];

const BY_ID = new Map(WEAKNESSES.map((w) => [w.id, w]));

export function weaknessById(id: string): Weakness | undefined {
  return BY_ID.get(id);
}

/** Keeps only known ids, in order, without repeats. Anything from a URL or a request goes through here. */
export function cleanWeaknessIds(ids: unknown, max = 6): string[] {
  const list = Array.isArray(ids) ? ids : typeof ids === 'string' ? ids.split(',') : [];
  const out: string[] = [];
  for (const raw of list) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (BY_ID.has(id) && !out.includes(id)) out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

/** Lowercase, "&" to "and", curly apostrophes straightened, everything else that is not a word to a space. */
export function normaliseText(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9'\- ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()} `;
}

const wordPattern = (p: string) => new RegExp(`(?<![a-z0-9])(?:${p})(?![a-z0-9])`, 'i');

const COMPILED = WEAKNESSES.map((w) => ({
  id: w.id,
  group: w.group,
  patterns: w.phrases.map(wordPattern),
  broad: (w.broad || []).map(wordPattern),
}));

function firstHits(t: string, patterns: RegExp[]): { hits: number; first: number } {
  let hits = 0;
  let first = Infinity;
  for (const re of patterns) {
    const m = re.exec(t);
    if (m) {
      hits++;
      first = Math.min(first, m.index);
    }
  }
  return { hits, first };
}

/**
 * A clause about what the OTHER team does to you: "we give up open threes",
 * "we allow offensive rebounds", "they get past us", "teams run on us". In such
 * a clause "threes" is a defensive problem, not a shooting one. Found on the
 * first live team test (14 Nov 2026): "we give up open corner threes" also
 * picked "Missing open catch-and-shoot shots".
 */
const DEFENSIVE_CLAUSE = new RegExp(
  [
    // "give up" a shot, not "give up when I miss" (giving up as a mindset)
    '(give|gives|giving|gave) up(?! (on|when|after|if|easily|too easily|too early))',
    '(allow|allows|allowing|allowed|concede|concedes|conceding|conceded|leak|leaks|leaking)',
    "let(ting)? (them|teams|opponents|other teams|the other team|guards|bigs|shooters|players|people)",
    "(they|they're|opponents|other teams|the other team|teams|guards|bigs|shooters) (keep |always |just |easily |all )?(hit|hits|make|makes|get|gets|score|scores|drain|drains|blow|blows|go|goes|beat|beats|cut|cuts|shoot|shoots|run|runs|kill|kills|torch|torches)",
    'against us',
    'on us',
  ]
    .map((p) => `(?<![a-z0-9])(?:${p})(?![a-z0-9])`)
    .join('|'),
  'i'
);

/** In a defensive clause, an attacking weakness is really its defensive side. */
export const DEFENSIVE_SIDE: Record<string, string> = {
  catch_shoot: 'closeouts_help',
  off_dribble: 'on_ball_defense',
  shooting_pressure: 'closeouts_help',
  finishing_contact: 'closeouts_help',
  touch_finishes: 'closeouts_help',
  beat_defender: 'on_ball_defense',
  offensive_rebounding: 'boxing_out',
  transition_offense: 'transition_defense',
  pnr_reads: 'pnr_defense',
  post_play: 'closeouts_help',
  passing_reads: 'closeouts_help',
  free_throws: 'on_ball_defense',
};

/** Raw text into clauses, before punctuation is stripped: ".", ",", ";", "!", "?", new lines and "but". */
export function clauses(text: string): string[] {
  return text
    .split(/[.,;!?\n]+|(?<![a-z])but(?![a-z])/i)
    .map((c) => c.trim())
    .filter(Boolean);
}

/**
 * The weaknesses free text talks about, most mentioned first.
 *
 * Deliberately simple and visible: what it picks up is shown as chips the
 * player can remove, so a wrong match ("I'm not bad at free throws") costs one
 * tap, and nothing is decided behind their back.
 */
export function matchWeaknesses(text: string, max = 6): string[] {
  if (normaliseText(text).trim().length < 2) return [];
  const byId = new Map<string, { id: string; group: WeaknessGroup; hits: number; first: number }>();
  const add = (id: string, hits: number, first: number) => {
    const w = BY_ID.get(id);
    if (!w) return;
    const s = byId.get(id);
    if (s) {
      s.hits += hits;
      s.first = Math.min(s.first, first);
    } else byId.set(id, { id, group: w.group, hits, first });
  };

  const parts = clauses(text).map((c) => normaliseText(c));
  // Each clause's matches, its defensive side when the clause is about the other team
  parts.forEach((t, ci) => {
    const defensive = DEFENSIVE_CLAUSE.test(t);
    for (const { id, patterns } of COMPILED) {
      const { hits, first } = firstHits(t, patterns);
      if (hits > 0) add(defensive ? (DEFENSIVE_SIDE[id] ?? id) : id, hits, ci * 10_000 + first);
    }
  });

  // Broad words only where their group has nothing more specific
  const groupsHit = new Set([...byId.values()].map((s) => s.group));
  parts.forEach((t, ci) => {
    const defensive = DEFENSIVE_CLAUSE.test(t);
    for (const { id, group, broad } of COMPILED) {
      if (!broad.length || groupsHit.has(group)) continue;
      const { hits, first } = firstHits(t, broad);
      if (hits > 0) add(defensive ? (DEFENSIVE_SIDE[id] ?? id) : id, 0.5, ci * 10_000 + first);
    }
  });

  return [...byId.values()]
    .sort((a, b) => b.hits - a.hits || a.first - b.first)
    .slice(0, max)
    .map((s) => s.id);
}
