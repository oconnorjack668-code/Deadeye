// src/lib/focus/plan.ts
// From a list of weaknesses to the drills, film, IQ quizzes and guides that
// work on them, chosen from the content Deadeye already has. Pure, so it runs
// in the browser as somebody types, and on the server for the AI plan's
// starting point.
import { weaknessById, type Weakness } from './weaknesses';

export type FocusMode = 'player' | 'team';
export type FocusLevel = 'beginner' | 'intermediate' | 'advanced';

export interface FocusDrill {
  id: string;
  slug: string;
  name: string;
  skill: string;
  sub_skill: string;
  level: string;
  players: string;
  duration_minutes: number;
  demo_video_id?: string | null;
}

export interface FocusLesson {
  id: string;
  title: string;
  topicId: string;
  topicSlug: string;
  topicTitle: string;
  channel: string;
  durationMinutes: number | null;
  questionCount: number;
  /** False for a lesson seeded without a real video ('placeholder') */
  hasVideo: boolean;
  /** Free section, Pro, or in the player's programme (the same rule as /study) */
  canOpen: boolean;
}

export interface FocusGuide {
  slug: string;
  title: string;
  category: string;
  readingMinutes: number;
}

export interface FocusContent {
  drills: FocusDrill[];
  lessons: FocusLesson[];
  guides: FocusGuide[];
}

export interface PlanItem<T> {
  item: T;
  /** The weaknesses this item works on (ids) */
  for: string[];
  reason: string;
}

export interface FocusPlan {
  weaknesses: string[];
  /** Lesson clips to watch, each with its quiz for the IQ part */
  film: PlanItem<FocusLesson>[];
  drills: PlanItem<FocusDrill>[];
  guides: PlanItem<FocusGuide>[];
  /** At least one weakness is a decision: filming a game and asking the coach about a moment fits */
  ownFilm: boolean;
}

export interface PlanOptions {
  mode: FocusMode;
  level?: FocusLevel | null;
}

const LEVELS: FocusLevel[] = ['beginner', 'intermediate', 'advanced'];

/** "catch_and_shoot" -> "catch and shoot" */
export function subSkillLabel(sub: string): string {
  return sub.replace(/_/g, ' ');
}

/**
 * A drill level for a player's playing level (profiles.playing_level) or a
 * team's level (teams.level). null when unknown, so nothing is preferred.
 */
export function drillLevelFor(level: string | null | undefined): FocusLevel | null {
  switch (level) {
    case 'beginner':
    case 'recreational':
      return 'beginner';
    case 'intermediate':
    case 'school':
    case 'club':
      return 'intermediate';
    case 'advanced':
    case 'elite':
    case 'college_pro':
    case 'regional':
    case 'national':
      return 'advanced';
    default:
      return null;
  }
}

/**
 * How well one drill fits one weakness. 0 means it does not.
 *
 * A listed sub-skill is the real match; earlier refs and earlier sub-skills in
 * a ref are the better fit. Then: a drill a solo player cannot do alone is
 * pushed right down (a team drill is useless at a driveway hoop), a coach
 * planning practice gets partner and team drills first, the player's level is
 * preferred, and a drill with a demo video edges ahead because it can be
 * watched as well as done.
 */
export function drillScore(drill: FocusDrill, weakness: Weakness, opts: PlanOptions): number {
  let base = 0;
  weakness.drills.forEach((ref, ri) => {
    if (drill.skill !== ref.skill) return;
    const si = ref.subs.indexOf(drill.sub_skill);
    const s = si >= 0 ? 10 - ri * 2 - si * 0.5 : ref.subs.length === 0 ? 4 : 0;
    base = Math.max(base, s);
  });
  if (base <= 0) return 0;

  let score = base;
  if (opts.mode === 'player') {
    if (drill.players === 'team') score -= 8;
    else if (drill.players === 'partner') score -= 1;
  } else {
    if (drill.players === 'team') score += 2;
    else if (drill.players === 'partner') score += 1;
  }
  if (opts.level) {
    const gap = Math.abs(LEVELS.indexOf(opts.level) - LEVELS.indexOf(drill.level as FocusLevel));
    score += gap === 0 ? 2 : gap === 1 ? 0 : -3;
  }
  if (drill.demo_video_id) score += 0.5;
  return Math.max(score, 0.1);
}

/** The lessons a weakness points at, in the order it lists them. */
export function lessonsFor(weakness: Weakness, lessons: FocusLesson[]): FocusLesson[] {
  const out: FocusLesson[] = [];
  for (const ref of weakness.lessons) {
    for (const l of lessons) {
      if (l.topicSlug !== ref.topic) continue;
      if (ref.title && !l.title.toLowerCase().includes(ref.title)) continue;
      if (!out.includes(l)) out.push(l);
    }
  }
  return out;
}

/** Fewer items each when more weaknesses share the plan, so it stays a week's work and not a library. */
function perWeakness(count: number): { drills: number; lessons: number } {
  if (count <= 1) return { drills: 4, lessons: 2 };
  if (count === 2) return { drills: 3, lessons: 2 };
  return { drills: 2, lessons: 1 };
}

const MAX_DRILLS = 8;
const MAX_FILM = 4;
const MAX_GUIDES = 3;

/**
 * Takes each weakness's ranked picks in turn (first pick of each, then second
 * of each...) so the first weakness named cannot crowd out the rest, and
 * merges an item two weaknesses share into one row that says so.
 */
function roundRobin<T>(
  lists: Array<{ weakness: Weakness; items: T[] }>,
  key: (item: T) => string,
  max: number,
  reason: (item: T, w: Weakness) => string
): PlanItem<T>[] {
  const out: PlanItem<T>[] = [];
  const byKey = new Map<string, PlanItem<T>>();
  const longest = Math.max(0, ...lists.map((l) => l.items.length));
  for (let i = 0; i < longest; i++) {
    for (const { weakness, items } of lists) {
      const item = items[i];
      if (item === undefined) continue;
      const existing = byKey.get(key(item));
      if (existing) {
        if (!existing.for.includes(weakness.id)) existing.for.push(weakness.id);
        continue;
      }
      if (out.length >= max) continue;
      const row = { item, for: [weakness.id], reason: reason(item, weakness) };
      byKey.set(key(item), row);
      out.push(row);
    }
  }
  return out;
}

export function buildFocusPlan(weaknessIds: string[], content: FocusContent, opts: PlanOptions): FocusPlan {
  const weaknesses = weaknessIds.map(weaknessById).filter((w): w is Weakness => !!w);
  const n = perWeakness(weaknesses.length);

  const drillLists = weaknesses.map((w) => {
    let fits = content.drills.map((d) => ({ d, s: drillScore(d, w, opts) })).filter((x) => x.s > 0);
    // A player on their own gets no team drills at all, unless a team drill is
    // the only thing that works on this weakness
    if (opts.mode === 'player') {
      const doable = fits.filter((x) => x.d.players !== 'team');
      if (doable.length) fits = doable;
    }
    return {
      weakness: w,
      items: fits
        .sort((a, b) => b.s - a.s || a.d.name.localeCompare(b.d.name))
        .slice(0, n.drills)
        .map((x) => x.d),
    };
  });

  const lessonLists = weaknesses.map((w) => ({ weakness: w, items: lessonsFor(w, content.lessons).slice(0, n.lessons) }));

  const guideLists = weaknesses.map((w) => ({
    weakness: w,
    items: w.guides.map((slug) => content.guides.find((g) => g.slug === slug)).filter((g): g is FocusGuide => !!g).slice(0, 2),
  }));

  return {
    weaknesses: weaknesses.map((w) => w.id),
    drills: roundRobin(drillLists, (d) => d.id, MAX_DRILLS, (_d, w) => `For "${w.label}"`),
    film: roundRobin(lessonLists, (l) => l.id, MAX_FILM, (_l, w) => `For "${w.label}"`),
    guides: roundRobin(guideLists, (g) => g.slug, MAX_GUIDES, (_g, w) => `For "${w.label}"`),
    ownFilm: weaknesses.some((w) => w.ownFilm),
  };
}

/** The /focus link that opens this plan, for an assignment or a share. Under the 300 characters team_assignments allows. */
export function focusLink(weaknessIds: string[], mode: FocusMode = 'player'): string {
  const w = weaknessIds.slice(0, 6).join(',');
  return `/focus?w=${encodeURIComponent(w).replace(/%2C/g, ',')}${mode === 'team' ? '&from=coach' : ''}`;
}
