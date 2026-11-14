// src/lib/film/catalog.ts
// The film library's themes and levels (docs/plans/film-and-plays.md section
// 6). The database checks the same lists in 00062_film.sql; a test reads the
// migration to keep them in step.

export const FILM_THEMES = [
  { id: 'spacing', label: 'Spacing', blurb: 'Where to stand when you do not have the ball' },
  { id: 'help_defence', label: 'Help defence', blurb: 'When to help a teammate, and when to stay home' },
  { id: 'closeouts', label: 'Closeouts', blurb: 'Running out to a shooter under control' },
  { id: 'pick_and_roll', label: 'Pick-and-roll reads', blurb: 'What the handler and the screener see' },
  { id: 'transition', label: 'Transition', blurb: 'The first seconds after a rebound or a steal' },
  { id: 'out_of_bounds', label: 'Out of bounds', blurb: 'Getting a good look from an inbound' },
  { id: 'press', label: 'Press', blurb: 'Breaking a full-court press, and setting one' },
  { id: 'shot_selection', label: 'Shot selection', blurb: 'A good shot, a bad shot, and the extra pass' },
] as const;

export type FilmTheme = (typeof FILM_THEMES)[number]['id'];

export const FILM_LEVELS = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'intermediate', label: 'Intermediate' },
  { id: 'advanced', label: 'Advanced' },
] as const;

export type FilmLevel = (typeof FILM_LEVELS)[number]['id'];

export function isFilmTheme(value: unknown): value is FilmTheme {
  return FILM_THEMES.some((t) => t.id === value);
}

export function isFilmLevel(value: unknown): value is FilmLevel {
  return FILM_LEVELS.some((l) => l.id === value);
}

export function themeLabel(id: string): string {
  return FILM_THEMES.find((t) => t.id === id)?.label ?? 'Film';
}

export function levelLabel(id: string): string {
  return FILM_LEVELS.find((l) => l.id === id)?.label ?? '';
}
