// src/lib/film/input.ts
// What the owner clip picker sends to be saved, checked the same way in the
// browser (to show problems as the owner types) and in the server action
// (the check that counts): a YouTube link turned into an id, start and end
// as clock times inside ten minutes, and questions that stop inside the clip.
import { youtubeIdFromLink } from '@/lib/video/youtube';
import { isFilmLevel, isFilmTheme, type FilmLevel, type FilmTheme } from './catalog';
import { FilmQuestionSchema, MAX_QUESTIONS, type FilmQuestion } from './questions';
import { parseClock } from './rows';

export const MAX_CLIP_S = 600;
export const MAX_CLIP_TITLE = 100;
export const MAX_CHANNEL = 100;

export interface ClipDraft {
  /** Set when editing a clip that is already saved. */
  id?: string;
  link: string;
  start: string;
  end: string;
  title: string;
  channel: string;
  theme: string;
  level: string;
  isFree: boolean;
  published: boolean;
  questions: unknown[];
}

export interface ClipInput {
  id?: string;
  videoId: string;
  startS: number;
  endS: number;
  title: string;
  channel: string;
  theme: FilmTheme;
  level: FilmLevel;
  isFree: boolean;
  published: boolean;
  questions: FilmQuestion[];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseClipDraft(draft: ClipDraft): { ok: true; value: ClipInput } | { ok: false; error: string } {
  if (draft.id !== undefined && !UUID.test(draft.id)) return { ok: false, error: 'That clip could not be found.' };
  const videoId = youtubeIdFromLink(draft.link ?? '');
  if (!videoId) return { ok: false, error: 'Paste a YouTube link (from the Share button on the video).' };
  const startS = parseClock(draft.start ?? '');
  const endS = parseClock(draft.end ?? '');
  if (startS === null || endS === null) return { ok: false, error: 'Write the start and end as minutes:seconds, like 1:05.' };
  if (!Number.isInteger(startS) || !Number.isInteger(endS)) return { ok: false, error: 'Start and end are whole seconds.' };
  if (endS <= startS) return { ok: false, error: 'The end has to be after the start.' };
  if (endS - startS > MAX_CLIP_S) return { ok: false, error: 'Keep a clip to 10 minutes or less.' };
  const title = (draft.title ?? '').trim();
  const channel = (draft.channel ?? '').trim();
  if (!title || title.length > MAX_CLIP_TITLE) return { ok: false, error: `Give the clip a title of up to ${MAX_CLIP_TITLE} characters.` };
  if (!channel || channel.length > MAX_CHANNEL) return { ok: false, error: 'Say which channel the video is from.' };
  if (!isFilmTheme(draft.theme)) return { ok: false, error: 'Pick a theme.' };
  if (!isFilmLevel(draft.level)) return { ok: false, error: 'Pick a level.' };
  if (!Array.isArray(draft.questions) || draft.questions.length > MAX_QUESTIONS) return { ok: false, error: `Up to ${MAX_QUESTIONS} questions a clip.` };

  const questions: FilmQuestion[] = [];
  const keys = new Set<string>();
  for (const [i, raw] of draft.questions.entries()) {
    const parsed = FilmQuestionSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: `Question ${i + 1}: ${parsed.error.issues[0]?.message ?? 'needs fixing.'}` };
    const q = parsed.data;
    if (q.moment_s <= startS || q.moment_s > endS) return { ok: false, error: `Question ${i + 1}: stop the clip between its start and its end.` };
    if (keys.has(q.key)) return { ok: false, error: `Question ${i + 1}: two questions share a key. Remove one and add it again.` };
    keys.add(q.key);
    questions.push(q);
  }
  if (draft.published && questions.length === 0) return { ok: false, error: 'Add at least one question before publishing.' };

  return {
    ok: true,
    value: {
      ...(draft.id ? { id: draft.id } : {}),
      videoId,
      startS,
      endS,
      title,
      channel,
      theme: draft.theme,
      level: draft.level,
      isFree: !!draft.isFree,
      published: !!draft.published,
      questions: questions.sort((a, b) => a.moment_s - b.moment_s),
    },
  };
}
