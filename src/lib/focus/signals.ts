// src/lib/focus/signals.ts
// Weaknesses suggested from what a player has already logged, so "what should
// I work on?" has an answer before they type anything.
//
// Every suggestion quotes the numbers it came from. A suggestion a player
// cannot check against their own log reads as a guess, and the AI coach's
// rule (service.ts, provider.ts) is the same: no claim without its number.
// Small samples are ignored rather than guessed from.

export interface ShotTotal {
  shot_zone: string;
  makes: number;
  attempts: number;
}

export interface IqAnswer {
  topicSlug: string;
  topicTitle: string;
  wasCorrect: boolean;
}

export type SignalSource = 'shots' | 'iq' | 'film' | 'setup';

export interface DataSignal {
  weaknessId: string;
  source: SignalSource;
  reason: string;
}

/** Fewer shots than this in a group say nothing about it. */
export const MIN_SHOTS = 20;
export const MIN_IQ_ANSWERS = 3;
export const MIN_FILM_JUDGED = 3;

/**
 * Shot groups and the make rate below which each is worth working on. These
 * are deliberately modest bars for teenage players in practice, not elite
 * numbers: a 30% three-point shooter in a driveway is normal, not a weakness.
 */
const SHOT_GROUPS: Array<{ label: string; zones: (zone: string) => boolean; bar: number; weaknessId: string }> = [
  { label: 'Free throws', zones: (z) => z === 'free-throw', bar: 0.65, weaknessId: 'free_throws' },
  { label: 'Threes', zones: (z) => z.startsWith('three-') || z === 'deep-three', bar: 0.3, weaknessId: 'catch_shoot' },
  { label: 'Mid-range', zones: (z) => z.startsWith('mid-'), bar: 0.35, weaknessId: 'off_dribble' },
  { label: 'In the paint', zones: (z) => z === 'paint', bar: 0.5, weaknessId: 'finishing_contact' },
];

/** IQ section -> the weakness its quiz questions test. */
export const TOPIC_WEAKNESS: Record<string, string> = {
  'shooting-mechanics': 'shot_form',
  'finishing-footwork': 'touch_finishes',
  'pnr-reads': 'pnr_reads',
  'defense-rotations': 'closeouts_help',
  'ball-handling': 'loose_handle',
  'spacing-off-ball': 'off_ball_movement',
  transition: 'transition_offense',
  'film-study': 'reading_defense',
  rebounding: 'boxing_out',
  'post-play': 'post_play',
  'game-situations': 'game_situations',
  'mental-game': 'confidence',
};

/** Onboarding goals and focus areas (including the names before 21 Oct 2026) -> weakness. */
export const SETUP_WEAKNESS: Record<string, string> = {
  '3-Point Shooting Consistency': 'catch_shoot',
  'Finishing Through Contact': 'finishing_contact',
  'Pick & Roll Decision Making': 'pnr_reads',
  'Lockdown On-Ball Defense': 'on_ball_defense',
  'Mid-Range Pull-Up Mastery': 'off_dribble',
  'Off-Hand Ball Handling & Flow': 'weak_hand',
  'Vertical Jump & Explosiveness': 'explosiveness',
  'Shooting Arc & Dip': 'shot_form',
  'Shooting Arc & Kinetic Dip': 'shot_form',
  'Floater Range & Touch': 'touch_finishes',
  'First Step Acceleration': 'beat_defender',
  'Defensive Lateral Slide Speed': 'on_ball_defense',
  'Free Throw Routine': 'free_throws',
  'Off-Ball Spacing & Cuts': 'off_ball_movement',
};

const pct = (n: number) => `${Math.round(n * 100)}%`;

function shotSignals(totals: ShotTotal[]): DataSignal[] {
  const found: Array<DataSignal & { gap: number }> = [];
  for (const g of SHOT_GROUPS) {
    let makes = 0;
    let attempts = 0;
    for (const t of totals) {
      if (!g.zones(t.shot_zone)) continue;
      makes += t.makes;
      attempts += t.attempts;
    }
    if (attempts < MIN_SHOTS) continue;
    const rate = makes / attempts;
    if (rate >= g.bar) continue;
    found.push({
      weaknessId: g.weaknessId,
      source: 'shots',
      reason: `${g.label}: ${makes}/${attempts} (${pct(rate)}) in your logged shots`,
      gap: g.bar - rate,
    });
  }
  // Furthest under its bar first
  return found.sort((a, b) => b.gap - a.gap).map(({ weaknessId, source, reason }) => ({ weaknessId, source, reason }));
}

function iqSignals(answers: IqAnswer[]): DataSignal[] {
  const byTopic = new Map<string, { title: string; right: number; total: number }>();
  for (const a of answers) {
    const t = byTopic.get(a.topicSlug) || { title: a.topicTitle, right: 0, total: 0 };
    t.total++;
    if (a.wasCorrect) t.right++;
    byTopic.set(a.topicSlug, t);
  }
  const found: Array<DataSignal & { rate: number }> = [];
  for (const [slug, t] of byTopic) {
    const weaknessId = TOPIC_WEAKNESS[slug];
    if (!weaknessId || t.total < MIN_IQ_ANSWERS) continue;
    const rate = t.right / t.total;
    if (rate >= 0.6) continue;
    found.push({
      weaknessId,
      source: 'iq',
      reason: `Daily IQ on ${t.title}: ${t.right} of ${t.total} right`,
      rate,
    });
  }
  return found.sort((a, b) => a.rate - b.rate).map(({ weaknessId, source, reason }) => ({ weaknessId, source, reason }));
}

/** Coach verdicts on the player's own film questions (film_questions.verdict). "depends" counts as neither. */
function filmSignals(verdicts: Array<string | null>): DataSignal[] {
  const wrong = verdicts.filter((v) => v === 'wrong_read').length;
  const judged = wrong + verdicts.filter((v) => v === 'good_read').length;
  if (judged < MIN_FILM_JUDGED || wrong / judged < 0.4) return [];
  return [
    {
      weaknessId: 'reading_defense',
      source: 'film',
      // Kind to a 13 year old: a different read, not a failure (safety review, 13 Nov 2026)
      reason: `Your coach saw a better option on ${wrong} of your ${judged} film reads. Film study helps with this.`,
    },
  ];
}

function setupSignals(goals: string[], focusAreas: string[]): DataSignal[] {
  return [...goals, ...focusAreas]
    .filter((name) => SETUP_WEAKNESS[name])
    .map((name) => ({ weaknessId: SETUP_WEAKNESS[name], source: 'setup' as const, reason: `You picked "${name}" when you set up` }));
}

/**
 * Suggested weaknesses, strongest evidence first: logged shots, then IQ
 * answers, then coach verdicts on film, then what they said at setup (a wish,
 * not evidence, so it comes last). One suggestion per weakness.
 */
export function dataSignals(input: {
  shotTotals?: ShotTotal[];
  iqAnswers?: IqAnswer[];
  filmVerdicts?: Array<string | null>;
  goals?: string[];
  focusAreas?: string[];
}, max = 5): DataSignal[] {
  const all = [
    ...shotSignals(input.shotTotals || []),
    ...iqSignals(input.iqAnswers || []),
    ...filmSignals(input.filmVerdicts || []),
    ...setupSignals(input.goals || [], input.focusAreas || []),
  ];
  const seen = new Set<string>();
  const out: DataSignal[] = [];
  for (const s of all) {
    if (seen.has(s.weaknessId)) continue;
    seen.add(s.weaknessId);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}
