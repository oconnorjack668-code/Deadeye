// src/lib/plays/rows.ts
// Reading plays rows for the pages: turning a row into something typed (or
// dropping it if it does not make sense), who can open a play, and the
// library filters. Pure, so the rules are tested without a database.
import { categoryLabel, isAgeGrade, isPlayCategory, PLAY_CATEGORIES, suitsGrade, type AgeGrade, type PlayCategory } from './catalog';
import { parseDiagram, type Diagram } from './diagram';

/** The columns the pages ask for. */
export const PLAY_COLUMNS = 'id, owner_id, title, category, min_age, tags, description, coaching_points, diagram, is_free';

export interface PlayRow {
  id: string;
  owner_id: string | null;
  title: string;
  category: string;
  min_age: string;
  tags: string[] | null;
  description: string | null;
  coaching_points: string[] | null;
  diagram: unknown;
  is_free: boolean;
}

export interface Play {
  id: string;
  ownerId: string | null;
  title: string;
  category: PlayCategory;
  minAge: AgeGrade;
  tags: string[];
  description: string;
  coachingPoints: string[];
  diagram: Diagram;
  isFree: boolean;
}

/** A row as a Play, or null when its type, grade or diagram does not check out. */
export function toPlay(row: PlayRow): Play | null {
  if (!isPlayCategory(row.category) || !isAgeGrade(row.min_age)) return null;
  const parsed = parseDiagram(row.diagram);
  if (!parsed.ok) return null;
  return {
    id: row.id,
    ownerId: row.owner_id,
    title: row.title,
    category: row.category,
    minAge: row.min_age,
    tags: row.tags ?? [],
    description: row.description ?? '',
    coachingPoints: row.coaching_points ?? [],
    diagram: parsed.diagram,
    isFree: row.is_free,
  };
}

/**
 * Free plays open for everyone, the rest with Pro. A coach's own play always
 * opens for them, and a team member reads a coach play only when it is theirs
 * to see (row-level security, 00061). A play from the player's coach (set
 * for their team, or in their team playbook) always opens, Pro or not: team
 * work is never behind a paywall (plan section 7).
 */
export function opensFor(play: Pick<Play, 'isFree' | 'ownerId'>, isPro: boolean, fromCoach = false): boolean {
  return play.isFree || isPro || fromCoach || play.ownerId !== null;
}

export interface PlayFilters {
  category?: PlayCategory;
  /** The team grade: plays suitable for it (marked from this grade or younger). */
  age?: AgeGrade;
  q?: string;
  saved?: boolean;
}

export function filterPlays(plays: Play[], filters: PlayFilters, savedIds: ReadonlySet<string>): Play[] {
  const words = (filters.q ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  return plays.filter((p) => {
    if (filters.category && p.category !== filters.category) return false;
    if (filters.age && !suitsGrade(p.minAge, filters.age)) return false;
    if (filters.saved && !savedIds.has(p.id)) return false;
    if (words.length) {
      const haystack = [p.title, p.description, categoryLabel(p.category), ...p.tags].join(' ').toLowerCase();
      if (!words.every((w) => haystack.includes(w))) return false;
    }
    return true;
  });
}

/** Plays in library order: by section, then title. Empty sections are left out. */
export function groupByCategory(plays: Play[]): Array<{ id: PlayCategory; label: string; plays: Play[] }> {
  return PLAY_CATEGORIES.map((c) => ({
    id: c.id,
    label: c.label,
    plays: plays.filter((p) => p.category === c.id).sort((a, b) => a.title.localeCompare(b.title)),
  })).filter((g) => g.plays.length > 0);
}
