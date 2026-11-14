// src/lib/plays/catalog.ts
// The fixed lists a play is filed under: its type (category) and the youngest
// age grade it suits. The same lists are CHECK constraints in
// supabase/migrations/00060_plays.sql, so change both together.

/** Library sections, in the order the library shows them. */
export const PLAY_CATEGORIES = [
  { id: 'principles', label: 'Principles' },
  { id: 'half_court', label: 'Half-court sets' },
  { id: 'pick_and_roll', label: 'Pick-and-roll' },
  { id: 'blob', label: 'Baseline out of bounds' },
  { id: 'slob', label: 'Sideline out of bounds' },
  { id: 'press_break', label: 'Press breaks' },
  { id: 'zone_offence', label: 'Zone offence' },
  { id: 'end_of_quarter', label: 'End of quarter' },
] as const;

export type PlayCategory = (typeof PLAY_CATEGORIES)[number]['id'];

export function isPlayCategory(value: unknown): value is PlayCategory {
  return PLAY_CATEGORIES.some((c) => c.id === value);
}

export function categoryLabel(id: string): string {
  return PLAY_CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

/**
 * Age grades, youngest first. Basketball Ireland grades U9 to U18 by year of
 * birth (the same names as AGE_GROUPS in coachSide.ts), then Senior.
 */
export const AGE_GRADES = ['U9', 'U10', 'U11', 'U12', 'U13', 'U14', 'U15', 'U16', 'U17', 'U18', 'Senior'] as const;

export type AgeGrade = (typeof AGE_GRADES)[number];

export function isAgeGrade(value: unknown): value is AgeGrade {
  return (AGE_GRADES as readonly unknown[]).includes(value);
}

/** Position in AGE_GRADES, so grades compare with < and >. */
export function ageRank(grade: AgeGrade): number {
  return AGE_GRADES.indexOf(grade);
}

/** True when a play marked "from minAge" suits a team of this grade. */
export function suitsGrade(minAge: AgeGrade, team: AgeGrade): boolean {
  return ageRank(minAge) <= ageRank(team);
}

/** "From U12", or "All ages" for the youngest grade. */
export function ageLabel(minAge: AgeGrade): string {
  return minAge === AGE_GRADES[0] ? 'All ages' : `From ${minAge}`;
}
