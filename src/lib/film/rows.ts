// src/lib/film/rows.ts
// Reading film rows for the pages: a row as a typed clip (or dropped if it
// does not make sense), who can open a clip or pack, the library filters, and
// "Continue". Pure, so the rules are tested without a database.
import { isRealYoutubeId } from '@/lib/video/youtube';
import { FILM_THEMES, isFilmLevel, isFilmTheme, themeLabel, type FilmLevel, type FilmTheme } from './catalog';
import { parseFilmQuestions, type FilmQuestion } from './questions';

/** The columns the pages ask for. */
export const FILM_CLIP_COLUMNS = 'id, youtube_video_id, start_s, end_s, title, channel_name, theme, level, questions, is_free';

export interface FilmClipRow {
  id: string;
  youtube_video_id: string;
  start_s: number;
  end_s: number;
  title: string;
  channel_name: string;
  theme: string;
  level: string;
  questions: unknown;
  is_free: boolean;
}

export interface FilmClip {
  id: string;
  videoId: string;
  startS: number;
  endS: number;
  title: string;
  channel: string;
  theme: FilmTheme;
  level: FilmLevel;
  questions: FilmQuestion[];
  isFree: boolean;
}

/** A row as a FilmClip, or null when its video id, times, theme or level do not check out. */
export function toClip(row: FilmClipRow): FilmClip | null {
  if (!isRealYoutubeId(row.youtube_video_id) || !isFilmTheme(row.theme) || !isFilmLevel(row.level)) return null;
  if (!Number.isFinite(row.start_s) || !Number.isFinite(row.end_s) || row.end_s <= row.start_s) return null;
  return {
    id: row.id,
    videoId: row.youtube_video_id.trim(),
    startS: row.start_s,
    endS: row.end_s,
    title: row.title,
    channel: row.channel_name,
    theme: row.theme,
    level: row.level,
    questions: parseFilmQuestions(row.questions, row.start_s, row.end_s),
    isFree: row.is_free,
  };
}

/** The clip length as the player sees it, e.g. "0:45". */
export function clipLength(clip: Pick<FilmClip, 'startS' | 'endS'>): string {
  return formatClock(clip.endS - clip.startS);
}

export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** "1:23", "83" or "83.5" as seconds; null when it is not a time. */
export function parseClock(text: string): number | null {
  const t = text.trim();
  const clock = t.match(/^(\d{1,3}):([0-5]\d(?:\.\d+)?)$/);
  if (clock) return Number(clock[1]) * 60 + Number(clock[2]);
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  return null;
}

/**
 * A free clip opens for everyone and the rest with Pro. Film from the
 * player's coach (a clip set for their team, or in a pack set for it) always
 * opens, and so does a clip in a free library pack: team work is never behind
 * a paywall (plan section 7), and a free pack means its clips.
 */
export function opensFor(clip: Pick<FilmClip, 'isFree'>, isPro: boolean, fromCoach = false, inFreePack = false): boolean {
  return clip.isFree || isPro || fromCoach || inFreePack;
}

/** A library pack opens when it is free or with Pro; a pack from the coach always does. */
export function packOpensFor(pack: { is_free: boolean; owner_id: string | null }, isPro: boolean, fromCoach = false): boolean {
  return pack.is_free || isPro || fromCoach || pack.owner_id !== null;
}

export interface FilmFilters {
  theme?: FilmTheme;
  level?: FilmLevel;
  q?: string;
  saved?: boolean;
}

export function filterClips(clips: FilmClip[], filters: FilmFilters, savedIds: ReadonlySet<string>): FilmClip[] {
  const words = (filters.q ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  return clips.filter((c) => {
    if (filters.theme && c.theme !== filters.theme) return false;
    if (filters.level && c.level !== filters.level) return false;
    if (filters.saved && !savedIds.has(c.id)) return false;
    if (words.length) {
      const haystack = [c.title, c.channel, themeLabel(c.theme), ...c.questions.map((q) => q.question)].join(' ').toLowerCase();
      if (!words.every((w) => haystack.includes(w))) return false;
    }
    return true;
  });
}

/** Clips in library order: by theme, then title. Empty themes are left out. */
export function groupByTheme(clips: FilmClip[]): Array<{ id: FilmTheme; label: string; clips: FilmClip[] }> {
  return FILM_THEMES.map((t) => ({
    id: t.id,
    label: t.label,
    clips: clips.filter((c) => c.theme === t.id).sort((a, b) => a.title.localeCompare(b.title)),
  })).filter((g) => g.clips.length > 0);
}

export interface PackProgress {
  packId: string;
  title: string;
  done: number;
  of: number;
  /** The first clip in the pack not yet answered. */
  nextClipId: string;
}

/**
 * "Continue": packs the player has started (answered at least one clip) and
 * not finished, with the next clip to watch. Packs come in the order to show
 * them; clip ids in each pack are in pack order.
 */
export function continuePacks(
  packs: ReadonlyArray<{ id: string; title: string; clipIds: string[] }>,
  doneClipIds: ReadonlySet<string>
): PackProgress[] {
  return packs.flatMap((p) => {
    const done = p.clipIds.filter((id) => doneClipIds.has(id)).length;
    const next = p.clipIds.find((id) => !doneClipIds.has(id));
    if (done === 0 || !next) return [];
    return [{ packId: p.id, title: p.title, done, of: p.clipIds.length, nextClipId: next }];
  });
}
