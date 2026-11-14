import { describe, it, expect } from 'vitest';
import { WEAKNESSES, matchWeaknesses, cleanWeaknessIds, weaknessById } from '@/lib/focus/weaknesses';
import { buildFocusPlan, drillScore, focusLink, lessonsFor, drillLevelFor, type FocusDrill, type FocusLesson, type FocusContent } from '@/lib/focus/plan';
import { dataSignals, TOPIC_WEAKNESS, SETUP_WEAKNESS } from '@/lib/focus/signals';

// The live content on 13 Nov 2026 (study_topics/study_items titles, drill
// sub-skills, guide slugs). If a lesson is renamed or a sub-skill removed,
// the catalogue tests below fail and say which reference broke.
const LIVE_LESSONS: Array<[string, string]> = [
  ['shooting-mechanics', 'The One-Motion Shooting Dip & Kinetic Chain'],
  ['shooting-mechanics', 'Shot Pocket Alignment & Guide Hand Discipline'],
  ['shooting-mechanics', 'Shot Prep Footwork: The Hop vs. the 1-2 Step'],
  ['finishing-footwork', 'The Veer Finish: Contact Absorption and Rim Protection'],
  ['finishing-footwork', 'The Euro Step & Change-of-Direction Finishes'],
  ['finishing-footwork', 'Floaters, Runners & Touch Finishes Over Length'],
  ['pnr-reads', 'Reading Drop Coverage: Snaking & Mid-Range Floaters'],
  ['pnr-reads', 'Beating Hedges & Blitzes: Playing 4-on-3'],
  ['pnr-reads', 'Attacking Switches & Slipping Screens'],
  ['defense-rotations', 'Closeouts and Help-Side Positioning'],
  ['defense-rotations', 'On-Ball Defense: Stance, Slides & Keeping the Ball in Front'],
  ['defense-rotations', 'Defending the Pick & Roll: Communication & Coverages'],
  ['ball-handling', 'Protecting the Ball: Dribble Height, Off Arm & Eyes Up'],
  ['ball-handling', 'Change of Pace & Direction: Beating Your Defender'],
  ['ball-handling', 'Handling Pressure & Traps'],
  ['spacing-off-ball', 'Floor Spacing Fundamentals: The Spots & Staying Spaced'],
  ['spacing-off-ball', 'Cutting: Backdoors, Basket Cuts & Reading Your Defender'],
  ['spacing-off-ball', 'Off-Ball Screens: Setting & Using Screens Away'],
  ['transition', 'Running the Floor: Lanes, Rim Runs & Early Offense'],
  ['transition', 'Transition Defense: Getting Back & Stopping the Ball'],
  ['transition', 'Numbers Advantages: 2-on-1, 3-on-2 & Finishing the Break'],
  ['film-study', 'How to Watch Film: Studying Yourself'],
  ['film-study', 'Scouting an Opponent: Tendencies & Personnel'],
  ['film-study', 'Reading the Defense in Real Time'],
  ['rebounding', 'Box Out Fundamentals: Find, Hit, Get'],
  ['rebounding', 'Offensive Rebounding: Angles & Second Efforts'],
  ['rebounding', 'Team Rebounding & Finishing the Defensive Possession'],
  ['post-play', 'Establishing Post Position: Sealing & Posting Up'],
  ['post-play', 'Post Moves & Counters: Drop Steps, Hooks & Up-and-Unders'],
  ['post-play', 'Passing Out of the Post & Beating Double Teams'],
  ['game-situations', 'End-of-Quarter & End-of-Game Possessions'],
  ['game-situations', 'Shot Clock Awareness & Possession Value'],
  ['game-situations', 'Fouls, Timeouts & Inbounds Plays'],
  ['mental-game', 'Confidence & Self-Talk'],
  ['mental-game', 'Pre-Shot Routines & Free-Throw Focus'],
  ['mental-game', 'Handling Mistakes & Visualization'],
];

const LIVE_SUBS: Record<string, string[]> = {
  ball_handling: ['ball_security', 'change_of_direction', 'change_of_pace', 'on_the_move', 'reaction', 'stationary', 'two_ball', 'weak_hand'],
  conditioning: ['agility', 'dribble_sprints', 'full_court_layups', 'game_speed', 'slides', 'sprints', 'transition'],
  defense: ['closeouts', 'deny', 'help_recover', 'on_ball', 'slides', 'stance'],
  finishing: ['close_range', 'euro_step', 'floaters', 'layups', 'off_foot', 'pro_hop', 'through_contact'],
  footwork: ['agility', 'catch_footwork', 'closeout_attacks', 'jab_series', 'jump_stops', 'pivots', 'triple_threat'],
  iq: ['advantage'],
  off_ball: ['cutting', 'screening', 'spacing', 'transition'],
  passing: ['bounce_passes', 'outlet', 'partner_passing', 'passing_pressure', 'pocket_passes', 'reads', 'skip_passes', 'team_passing', 'wall_passing'],
  post_play: ['entry_passes', 'post_moves', 'sealing', 'through_contact'],
  rebounding: ['boxing_out', 'offensive_rebounding', 'putbacks', 'securing', 'tipping'],
  shooting: ['catch_and_shoot', 'close_range', 'competitive', 'form', 'free_throws', 'game_speed', 'movement', 'off_the_dribble', 'pressure', 'relocation'],
};

const LIVE_GUIDES = [
  'building-shooter-confidence', 'pre-shot-free-throw-routines', 'bouncing-back-from-mistakes', 'visualization-for-hoopers',
  'sleep-for-athletes', 'recovery-days-done-right', 'managing-soreness-training-load', 'fueling-for-training-and-games',
  'hydration-for-basketball', 'ankle-sprain-prevention', 'knee-health-jumping-landing', 'warm-up-that-actually-works',
  'how-to-jump-higher', 'game-day-routine', 'growth-spurts-sore-knees-heels',
];

const lessons: FocusLesson[] = LIVE_LESSONS.map(([topicSlug, title], i) => ({
  id: `l${i}`,
  title,
  topicId: `t-${topicSlug}`,
  topicSlug,
  topicTitle: topicSlug,
  channel: 'Channel',
  durationMinutes: 8,
  questionCount: 7,
  hasVideo: true,
  canOpen: true,
}));

function drill(over: Partial<FocusDrill> & Pick<FocusDrill, 'skill' | 'sub_skill'>): FocusDrill {
  const id = over.id ?? `${over.skill}-${over.sub_skill}-${over.players ?? 'solo'}-${over.level ?? 'intermediate'}`;
  return { id, slug: id, name: id, level: 'intermediate', players: 'solo', duration_minutes: 10, demo_video_id: null, ...over };
}

const drills: FocusDrill[] = Object.entries(LIVE_SUBS).flatMap(([skill, subs]) =>
  subs.flatMap((sub_skill) => [drill({ skill, sub_skill }), drill({ skill, sub_skill, players: 'team' })])
);

const content: FocusContent = {
  drills,
  lessons,
  guides: LIVE_GUIDES.map((slug) => ({ slug, title: slug, category: 'x', readingMinutes: 5 })),
};

describe('weakness catalogue against the live content', () => {
  it('has unique ids', () => {
    expect(new Set(WEAKNESSES.map((w) => w.id)).size).toBe(WEAKNESSES.length);
  });

  it.each(WEAKNESSES.map((w) => [w.id, w]))('%s: every lesson reference finds a lesson', (_id, w) => {
    for (const ref of w.lessons) {
      const found = lessonsFor({ ...w, lessons: [ref] }, lessons);
      expect(found.length, `${w.id} -> ${ref.topic}:${ref.title ?? '*'}`).toBeGreaterThan(0);
    }
  });

  it.each(WEAKNESSES.map((w) => [w.id, w]))('%s: every drill sub-skill exists', (_id, w) => {
    for (const ref of w.drills) {
      expect(LIVE_SUBS[ref.skill], ref.skill).toBeDefined();
      for (const sub of ref.subs) expect(LIVE_SUBS[ref.skill], `${ref.skill}/${sub}`).toContain(sub);
    }
  });

  it.each(WEAKNESSES.map((w) => [w.id, w]))('%s: every guide exists and something is suggested', (_id, w) => {
    for (const g of w.guides) expect(LIVE_GUIDES).toContain(g);
    expect(w.drills.length + w.lessons.length + w.guides.length).toBeGreaterThan(0);
  });

  it('every phrase compiles', () => {
    for (const w of WEAKNESSES) for (const p of [...w.phrases, ...(w.broad || [])]) expect(() => new RegExp(p)).not.toThrow();
  });

  it('points each IQ section and setup choice at a real weakness', () => {
    for (const id of [...Object.values(TOPIC_WEAKNESS), ...Object.values(SETUP_WEAKNESS)]) expect(weaknessById(id), id).toBeDefined();
  });
});

describe('matchWeaknesses', () => {
  it.each([
    ['we keep giving up open threes', 'closeouts_help'],
    ['my left hand is terrible', 'weak_hand'],
    ["can't hit free throws", 'free_throws'],
    ['too many turnovers when they press us', 'loose_handle'],
    ['too many turnovers when they press us', 'pressure_handling'],
    ['we never box out', 'boxing_out'],
    ['I freeze and make bad decisions', 'reading_defense'],
    ['struggles with the pick & roll', 'pnr_reads'],
    ['gets blocked at the rim by bigger players', 'finishing_contact'],
    ['she gets nervous and plays scared', 'confidence'],
    ['we stand around on offense, no cutting', 'off_ball_movement'],
    ['we lose close games at the end', 'game_situations'],
    ['gassed by the 3rd quarter', 'conditioning'],
  ])('"%s" -> %s', (text, id) => {
    expect(matchWeaknesses(text)).toContain(id);
  });

  it('does not read "passive" as passing or "pressure" as a press', () => {
    const ids = matchWeaknesses('he is passive and misses shots under pressure');
    expect(ids).toContain('confidence');
    expect(ids).toContain('shooting_pressure');
    expect(ids).not.toContain('passing_reads');
    expect(ids).not.toContain('pressure_handling');
  });

  it('uses a broad word only when nothing more specific in its group matched', () => {
    expect(matchWeaknesses('my defence is bad')).toEqual(['on_ball_defense']);
    const transition = matchWeaknesses('our transition defence is awful');
    expect(transition).toContain('transition_defense');
    expect(transition).not.toContain('on_ball_defense');
  });

  it('returns nothing for empty or unrelated text', () => {
    expect(matchWeaknesses('')).toEqual([]);
    expect(matchWeaknesses('hello there')).toEqual([]);
  });

  it('caps the number of matches', () => {
    const everything = 'threes free throws turnovers box out post moves pick and roll closeouts fast break confidence footwork';
    expect(matchWeaknesses(everything, 4)).toHaveLength(4);
  });
});

describe('cleanWeaknessIds', () => {
  it('keeps known ids in order, once, from a list or a comma string', () => {
    expect(cleanWeaknessIds('free_throws,nope,free_throws,boxing_out')).toEqual(['free_throws', 'boxing_out']);
    expect(cleanWeaknessIds(['boxing_out', 3, 'post_play'])).toEqual(['boxing_out', 'post_play']);
    expect(cleanWeaknessIds(null)).toEqual([]);
  });
  it('caps at the max', () => {
    expect(cleanWeaknessIds(WEAKNESSES.map((w) => w.id), 6)).toHaveLength(6);
  });
});

describe('drillScore', () => {
  const closeouts = weaknessById('closeouts_help')!;
  it('scores a listed sub-skill above an unlisted one in the same skill', () => {
    const listed = drillScore(drill({ skill: 'defense', sub_skill: 'closeouts' }), closeouts, { mode: 'player' });
    const other = drillScore(drill({ skill: 'defense', sub_skill: 'stance' }), closeouts, { mode: 'player' });
    expect(listed).toBeGreaterThan(0);
    expect(other).toBe(0);
  });
  it('pushes team drills down for a solo player and up for a coach', () => {
    const solo = drill({ skill: 'defense', sub_skill: 'closeouts' });
    const team = drill({ skill: 'defense', sub_skill: 'closeouts', players: 'team' });
    expect(drillScore(solo, closeouts, { mode: 'player' })).toBeGreaterThan(drillScore(team, closeouts, { mode: 'player' }));
    expect(drillScore(team, closeouts, { mode: 'team' })).toBeGreaterThan(drillScore(solo, closeouts, { mode: 'team' }));
  });
  it('prefers the player level and a drill with a demo video', () => {
    const adv = drill({ skill: 'defense', sub_skill: 'closeouts', level: 'advanced' });
    const beg = drill({ skill: 'defense', sub_skill: 'closeouts', level: 'beginner' });
    expect(drillScore(beg, closeouts, { mode: 'player', level: 'beginner' })).toBeGreaterThan(
      drillScore(adv, closeouts, { mode: 'player', level: 'beginner' })
    );
    const withVideo = drill({ skill: 'defense', sub_skill: 'closeouts', demo_video_id: 'abc' });
    expect(drillScore(withVideo, closeouts, { mode: 'player' })).toBeGreaterThan(
      drillScore(drill({ skill: 'defense', sub_skill: 'closeouts' }), closeouts, { mode: 'player' })
    );
  });
});

describe('buildFocusPlan', () => {
  it('gives drills, film and guides for the weaknesses named', () => {
    const plan = buildFocusPlan(['free_throws'], content, { mode: 'player' });
    expect(plan.weaknesses).toEqual(['free_throws']);
    expect(plan.drills.length).toBeGreaterThan(0);
    expect(plan.drills.every((d) => d.item.skill === 'shooting')).toBe(true);
    expect(plan.film.map((f) => f.item.title)).toContain('Pre-Shot Routines & Free-Throw Focus');
    expect(plan.guides.map((g) => g.item.slug)).toContain('pre-shot-free-throw-routines');
    expect(plan.ownFilm).toBe(false);
  });

  it('leaves team drills out of a solo plan when solo ones exist', () => {
    const plan = buildFocusPlan(['boxing_out'], content, { mode: 'player' });
    expect(plan.drills.every((d) => d.item.players === 'solo')).toBe(true);
    const team = buildFocusPlan(['boxing_out'], content, { mode: 'team' });
    expect(team.drills[0].item.players).toBe('team');
  });

  it('shares the plan fairly between weaknesses and stays a week of work', () => {
    const ids = ['free_throws', 'boxing_out', 'closeouts_help', 'post_play', 'weak_hand', 'pnr_reads'];
    const plan = buildFocusPlan(ids, content, { mode: 'player' });
    expect(plan.drills.length).toBeLessThanOrEqual(8);
    expect(plan.film.length).toBeLessThanOrEqual(4);
    expect(plan.guides.length).toBeLessThanOrEqual(3);
    // Round robin: the first four drills come from four different weaknesses
    expect(new Set(plan.drills.slice(0, 4).map((d) => d.for[0])).size).toBe(4);
    expect(plan.ownFilm).toBe(true);
  });

  it('merges an item two weaknesses share into one row', () => {
    const plan = buildFocusPlan(['catch_shoot', 'footwork'], content, { mode: 'player' });
    const hop = plan.film.filter((f) => f.item.title.includes('Hop'));
    expect(hop).toHaveLength(1);
    expect(hop[0].for).toEqual(['catch_shoot', 'footwork']);
  });

  it('ignores unknown weaknesses', () => {
    const plan = buildFocusPlan(['nope'], content, { mode: 'player' });
    expect(plan.weaknesses).toEqual([]);
    expect(plan.drills).toEqual([]);
  });
});

describe('focusLink', () => {
  it('builds a short in-app link the assignment check accepts', () => {
    const link = focusLink(['closeouts_help', 'boxing_out'], 'team');
    expect(link).toBe('/focus?w=closeouts_help,boxing_out&from=coach');
    expect(link).toMatch(/^\/($|[^/\\])/);
    expect(focusLink(WEAKNESSES.map((w) => w.id)).length).toBeLessThanOrEqual(300);
  });
});

describe('drillLevelFor', () => {
  it('maps player and team levels', () => {
    expect(drillLevelFor('beginner')).toBe('beginner');
    expect(drillLevelFor('club')).toBe('intermediate');
    expect(drillLevelFor('college_pro')).toBe('advanced');
    expect(drillLevelFor(null)).toBeNull();
  });
});

describe('dataSignals', () => {
  it('flags a shot group under its bar with the numbers, worst first', () => {
    const signals = dataSignals({
      shotTotals: [
        { shot_zone: 'free-throw', makes: 10, attempts: 25 },
        { shot_zone: 'three-top', makes: 8, attempts: 30 },
        { shot_zone: 'three-left-corner', makes: 3, attempts: 10 },
        { shot_zone: 'paint', makes: 20, attempts: 30 },
      ],
    });
    expect(signals[0]).toEqual({ weaknessId: 'free_throws', source: 'shots', reason: 'Free throws: 10/25 (40%) in your logged shots' });
    expect(signals.map((s) => s.weaknessId)).toContain('catch_shoot');
    expect(signals.map((s) => s.weaknessId)).not.toContain('finishing_contact');
  });

  it('ignores small samples', () => {
    expect(dataSignals({ shotTotals: [{ shot_zone: 'free-throw', makes: 1, attempts: 10 }] })).toEqual([]);
    expect(dataSignals({ iqAnswers: [{ topicSlug: 'rebounding', topicTitle: 'Rebounding', wasCorrect: false }] })).toEqual([]);
    expect(dataSignals({ filmVerdicts: ['wrong_read', 'wrong_read'] })).toEqual([]);
  });

  it('reads daily IQ misses and coach film verdicts', () => {
    const signals = dataSignals({
      iqAnswers: [
        { topicSlug: 'pnr-reads', topicTitle: 'Pick & Roll Reads', wasCorrect: false },
        { topicSlug: 'pnr-reads', topicTitle: 'Pick & Roll Reads', wasCorrect: false },
        { topicSlug: 'pnr-reads', topicTitle: 'Pick & Roll Reads', wasCorrect: true },
      ],
      filmVerdicts: ['wrong_read', 'wrong_read', 'good_read', 'depends', null],
    });
    expect(signals).toEqual([
      { weaknessId: 'pnr_reads', source: 'iq', reason: 'Daily IQ on Pick & Roll Reads: 1 of 3 right' },
      { weaknessId: 'reading_defense', source: 'film', reason: 'Your coach saw a better option on 2 of your 3 film reads. Film study helps with this.' },
    ]);
  });

  it('puts setup choices last and keeps one suggestion per weakness', () => {
    const signals = dataSignals({
      goals: ['3-Point Shooting Consistency', 'Consistent Training Habit'],
      focusAreas: ['Free Throw Routine'],
      shotTotals: [{ shot_zone: 'free-throw', makes: 5, attempts: 20 }],
    });
    expect(signals.map((s) => [s.weaknessId, s.source])).toEqual([
      ['free_throws', 'shots'],
      ['catch_shoot', 'setup'],
    ]);
  });
});
