// __tests__/film-logic.test.ts
// The pure rules behind Film (src/lib/film): reading stored questions,
// marking answers, the clip player's schedule (stop at each moment, see it
// again, continue, stop at the end), who can open what, the library filters
// and "Continue", the coach's progress view, the owner tool's checks, the
// YouTube oEmbed check, and the embed address the player is built from.
import { describe, it, expect, vi } from 'vitest';
import { gradeFilm, nextQuestionKey, parseFilmQuestions, type FilmQuestion } from '@/lib/film/questions';
import { initialFilmState, seeAgainFrom, stepFilm, filmScore, allAnswered, type FilmClipTiming, type FilmEvent, type FilmPlayState } from '@/lib/film/schedule';
import { continuePacks, filterClips, formatClock, groupByTheme, opensFor, packOpensFor, parseClock, toClip, type FilmClip, type FilmClipRow } from '@/lib/film/rows';
import { filmPlayerProgress, filmStatusCounts, splitFilmQuestions } from '@/lib/film/progress';
import { parseClipDraft, type ClipDraft } from '@/lib/film/input';
import { checkEmbeddable, oembedUrl } from '@/lib/film/oembed';
import { speedChoices, videoErrorMessage } from '@/lib/film/youtubePlayer';
import { filmLimitMessage } from '@/lib/film/limits';
import { youtubeEmbedUrl } from '@/lib/video/youtube';

const q = (key: string, moment_s: number, correct_index = 1, options = ['Stay home', 'Help', 'Foul']): FilmQuestion => ({
  key,
  question: `Question ${key}`,
  options,
  correct_index,
  explanation: `Because ${key}`,
  moment_s,
});

const ROW: FilmClipRow = {
  id: 'c1',
  youtube_video_id: 'abcdefghijk',
  start_s: 10,
  end_s: 40,
  title: 'Help side',
  channel_name: 'Official League',
  theme: 'help_defence',
  level: 'beginner',
  questions: [q('q2', 30), q('q1', 15)],
  is_free: true,
};

describe('parseFilmQuestions', () => {
  it('keeps questions that check out and stop inside the clip, sorted by moment', () => {
    const out = parseFilmQuestions([q('q2', 30), q('q1', 15)], 10, 40);
    expect(out.map((x) => x.key)).toEqual(['q1', 'q2']);
  });

  it('drops a question before or at the start, after the end, with a duplicate key, or with no right answer', () => {
    const bad = [q('a', 10), q('b', 41), q('c', 20), q('c', 25), { ...q('d', 22), correct_index: 5 }, { nonsense: true }];
    expect(parseFilmQuestions(bad, 10, 40).map((x) => x.key)).toEqual(['c']);
    expect(parseFilmQuestions('not a list', 0, 10)).toEqual([]);
  });

  it('gives the next free key for a new question', () => {
    expect(nextQuestionKey([])).toBe('q1');
    expect(nextQuestionKey([{ key: 'q1' }, { key: 'q3' }])).toBe('q2');
  });
});

describe('gradeFilm', () => {
  const questions = [q('q1', 15, 1), q('q2', 30, 0)];
  it('marks each pick and counts the right ones', () => {
    expect(gradeFilm(questions, [{ key: 'q1', pick: 1 }, { key: 'q2', pick: 2 }])).toEqual({
      answers: [
        { key: 'q1', pick: '1', right: true },
        { key: 'q2', pick: '2', right: false },
      ],
      score: 1,
      total: 2,
    });
  });

  it('ignores picks for questions the clip no longer has, or options that do not exist', () => {
    const res = gradeFilm(questions, [{ key: 'old', pick: 0 }, { key: 'q1', pick: 9 }, { key: 'q2', pick: 0 }]);
    expect(res.answers).toEqual([{ key: 'q2', pick: '0', right: true }]);
    expect(res.total).toBe(2);
  });
});

describe('the clip player schedule (stepFilm)', () => {
  const clip: FilmClipTiming = { startS: 10, endS: 40, questions: [q('q1', 15, 1), q('q2', 30, 0)] };
  const run = (events: FilmEvent[], from: FilmPlayState = initialFilmState()) => {
    let state = from;
    const commands: unknown[] = [];
    for (const e of events) {
      const r = stepFilm(clip, state, e);
      state = r.state;
      commands.push(...r.commands);
    }
    return { state, commands };
  };

  it('plays until the first moment, then pauses and asks it', () => {
    expect(run([{ type: 'tick', t: 12 }]).state.phase).toEqual({ kind: 'watching' });
    const r = run([{ type: 'tick', t: 12 }, { type: 'tick', t: 15.1 }]);
    expect(r.state.phase).toEqual({ kind: 'asking', index: 0 });
    expect(r.commands).toEqual([{ type: 'pause' }]);
  });

  it('shows the answer after a pick, keeps the first pick, and plays on with Continue', () => {
    const asked = run([{ type: 'tick', t: 15.2 }]).state;
    const answered = run([{ type: 'answer', pick: 2 }, { type: 'answer', pick: 1 }], asked).state;
    expect(answered.phase).toEqual({ kind: 'answered', index: 0 });
    expect(answered.picks).toEqual({ q1: 2 });
    const on = run([{ type: 'continue' }], answered);
    expect(on.state.phase).toEqual({ kind: 'watching' });
    expect(on.commands).toEqual([{ type: 'play' }]);
  });

  it('ignores an answer that is not one of the options', () => {
    const asked = run([{ type: 'tick', t: 15.2 }]).state;
    expect(run([{ type: 'answer', pick: 7 }], asked).state.phase.kind).toBe('asking');
  });

  it('goes back 3 seconds with See it again, and stops at the same question again', () => {
    const asked = run([{ type: 'tick', t: 15.2 }]).state;
    const again = run([{ type: 'see_again' }], asked);
    expect(again.commands).toEqual([{ type: 'seek', to: 12 }, { type: 'play' }]);
    expect(again.state.phase).toEqual({ kind: 'replaying', index: 0, then: 'asking' });
    const back = run([{ type: 'tick', t: 13 }, { type: 'tick', t: 15.05 }], again.state);
    expect(back.state.phase).toEqual({ kind: 'asking', index: 0 });
    expect(back.commands).toEqual([{ type: 'pause' }]);
    expect(back.state.asked).toEqual([0]);
  });

  it('never goes back before the start of the clip', () => {
    expect(seeAgainFrom(11, 10)).toBe(10);
    expect(seeAgainFrom(20, 10)).toBe(17);
  });

  it('asks each question once, then stops at the end', () => {
    const r = run([
      { type: 'tick', t: 15.2 },
      { type: 'answer', pick: 1 },
      { type: 'continue' },
      { type: 'tick', t: 20 },
      { type: 'tick', t: 30.1 },
      { type: 'answer', pick: 0 },
      { type: 'continue' },
      { type: 'tick', t: 35 },
      { type: 'tick', t: 39.9 },
    ]);
    expect(r.state.phase).toEqual({ kind: 'finished' });
    expect(r.commands.at(-1)).toEqual({ type: 'pause' });
    expect(filmScore(clip.questions, r.state.picks)).toBe(2);
    expect(allAnswered(clip.questions, r.state.picks)).toBe(true);
  });

  it('asks a question passed while paused straight after Continue, and one at the very end when the video ends', () => {
    const atOnce: FilmClipTiming = { startS: 0, endS: 20, questions: [q('a', 5), q('b', 5), q('c', 20)] };
    let s = stepFilm(atOnce, initialFilmState(), { type: 'tick', t: 5.1 }).state;
    s = stepFilm(atOnce, s, { type: 'answer', pick: 0 }).state;
    s = stepFilm(atOnce, s, { type: 'continue' }).state;
    expect(s.phase).toEqual({ kind: 'asking', index: 1 });
    s = stepFilm(atOnce, s, { type: 'answer', pick: 0 }).state;
    s = stepFilm(atOnce, s, { type: 'continue' }).state;
    expect(s.phase.kind).toBe('watching');
    s = stepFilm(atOnce, s, { type: 'ended' }).state;
    expect(s.phase).toEqual({ kind: 'asking', index: 2 });
  });

  it('plays the clip again from the start with Watch again, without asking again', () => {
    const done: FilmPlayState = { phase: { kind: 'finished' }, asked: [0, 1], picks: { q1: 1, q2: 0 } };
    const r = run([{ type: 'watch_again' }, { type: 'tick', t: 15.5 }], done);
    expect(r.commands).toEqual([{ type: 'seek', to: 10 }, { type: 'play' }]);
    expect(r.state.phase).toEqual({ kind: 'watching' });
    expect(r.state.picks).toEqual({ q1: 1, q2: 0 });
  });
});

describe('rows', () => {
  it('reads a row as a clip, and drops one whose video id, theme or times do not check out', () => {
    const clip = toClip(ROW)!;
    expect(clip.videoId).toBe('abcdefghijk');
    expect(clip.questions.map((x) => x.key)).toEqual(['q1', 'q2']);
    expect(toClip({ ...ROW, youtube_video_id: 'placeholder' })).toBeNull();
    expect(toClip({ ...ROW, theme: 'dunks' })).toBeNull();
    expect(toClip({ ...ROW, end_s: 10 })).toBeNull();
  });

  it('opens every clip and pack for everyone: film is never part of Pro (YouTube III.F.3.a)', () => {
    expect(opensFor({ isFree: true }, false)).toBe(true);
    expect(opensFor({ isFree: false }, false)).toBe(true);
    expect(packOpensFor({ is_free: false, owner_id: null }, false)).toBe(true);
    expect(packOpensFor({ is_free: false, owner_id: 'coach' }, false)).toBe(true);
  });

  it('filters by theme, level, saved and words, and groups by theme in library order', () => {
    const a = toClip(ROW)!;
    const b: FilmClip = { ...a, id: 'c2', title: 'Spacing on the break', theme: 'spacing', level: 'advanced' };
    expect(filterClips([a, b], { theme: 'spacing' }, new Set()).map((c) => c.id)).toEqual(['c2']);
    expect(filterClips([a, b], { level: 'beginner' }, new Set()).map((c) => c.id)).toEqual(['c1']);
    expect(filterClips([a, b], { saved: true }, new Set(['c2'])).map((c) => c.id)).toEqual(['c2']);
    expect(filterClips([a, b], { q: 'official help' }, new Set()).map((c) => c.id)).toEqual(['c1']);
    expect(groupByTheme([a, b]).map((g) => g.id)).toEqual(['spacing', 'help_defence']);
  });

  it('lists packs started and not finished under Continue, with the next clip', () => {
    const packs = [
      { id: 'p1', title: 'One', clipIds: ['a', 'b', 'c'] },
      { id: 'p2', title: 'Two', clipIds: ['d'] },
      { id: 'p3', title: 'Three', clipIds: ['a'] },
    ];
    expect(continuePacks(packs, new Set(['a']))).toEqual([{ packId: 'p1', title: 'One', done: 1, of: 3, nextClipId: 'b' }]);
  });

  it('reads and writes clock times', () => {
    expect(parseClock('1:05')).toBe(65);
    expect(parseClock('83')).toBe(83);
    expect(parseClock('1:75')).toBeNull();
    expect(parseClock('soon')).toBeNull();
    expect(formatClock(65)).toBe('1:05');
  });
});

describe('the coach progress view', () => {
  const since = '2026-11-10T00:00:00Z';
  const attempts = [
    { user_id: 'p1', clip_id: 'a', score: 1, total: 2, completed_at: '2026-11-11T00:00:00Z' },
    { user_id: 'p1', clip_id: 'a', score: 2, total: 2, completed_at: '2026-11-12T00:00:00Z' },
    { user_id: 'p1', clip_id: 'b', score: 3, total: 3, completed_at: '2026-11-12T00:00:00Z' },
    { user_id: 'p2', clip_id: 'a', score: 2, total: 2, completed_at: '2026-11-09T00:00:00Z' },
    { user_id: 'p3', clip_id: 'a', score: 0, total: 2, completed_at: '2026-11-12T00:00:00Z' },
  ];

  it('counts each clip once, by the first try since the film was set', () => {
    expect(filmPlayerProgress('p1', attempts, ['a', 'b'], new Set(), since)).toEqual({ status: 'done', clipsDone: 2, clips: 2, score: 4, total: 5 });
    // p2 answered before it was set, so has not started
    expect(filmPlayerProgress('p2', attempts, ['a', 'b'], new Set(), since).status).toBe('not_started');
    expect(filmPlayerProgress('p3', attempts, ['a', 'b'], new Set(), since)).toEqual({ status: 'started', clipsDone: 1, clips: 2, score: 0, total: 2 });
    expect(filmPlayerProgress('p4', attempts, ['a', 'b'], new Set(['p4']), since).status).toBe('done');
  });

  it('adds up statuses', () => {
    const list = ['p1', 'p2', 'p3'].map((p) => filmPlayerProgress(p, attempts, ['a', 'b'], new Set(), since));
    expect(filmStatusCounts(list)).toEqual({ done: 1, started: 1, not_started: 1 });
  });

  it('turns the totals into words per question, most picked first, leaving out removed questions and options', () => {
    const clip = toClip(ROW)!;
    const rows = [
      { clip_id: 'c1', question_key: 'q1', pick: '0', players: 2 },
      { clip_id: 'c1', question_key: 'q1', pick: '1', players: 3 },
      { clip_id: 'c1', question_key: 'q1', pick: '7', players: 1 },
      { clip_id: 'c1', question_key: 'gone', pick: '0', players: 4 },
    ];
    const [split] = splitFilmQuestions([clip], rows);
    expect(split.questions[0].answered).toBe(5);
    expect(split.questions[0].picks.map((p) => [p.label, p.players, p.right])).toEqual([
      ['Help', 3, true],
      ['Stay home', 2, false],
    ]);
    expect(split.questions[1].answered).toBe(0);
  });
});

describe('the owner clip picker checks', () => {
  const draft: ClipDraft = {
    link: 'https://www.youtube.com/watch?v=abcdefghijk',
    start: '0:10',
    end: '0:40',
    title: 'Help side',
    channel: 'Official League',
    theme: 'help_defence',
    level: 'beginner',
    isFree: true,
    published: true,
    questions: [q('q1', 15)],
  };

  it('turns a good draft into a clip to save', () => {
    const res = parseClipDraft(draft);
    expect(res.ok && res.value).toMatchObject({ videoId: 'abcdefghijk', startS: 10, endS: 40, published: true });
  });

  it('refuses a link that is not YouTube, an end before the start, a clip over 10 minutes, or a question outside the clip', () => {
    expect(parseClipDraft({ ...draft, link: 'https://vimeo.com/1' })).toMatchObject({ ok: false });
    expect(parseClipDraft({ ...draft, end: '0:05' })).toMatchObject({ ok: false, error: 'The end has to be after the start.' });
    expect(parseClipDraft({ ...draft, end: '10:11' })).toMatchObject({ ok: false, error: 'Keep a clip to 10 minutes or less.' });
    expect(parseClipDraft({ ...draft, questions: [q('q1', 50)] })).toMatchObject({ ok: false });
    expect(parseClipDraft({ ...draft, questions: [] })).toMatchObject({ ok: false, error: 'Add at least one question before publishing.' });
    expect(parseClipDraft({ ...draft, questions: [], published: false }).ok).toBe(true);
  });
});

describe('checkEmbeddable (YouTube oEmbed)', () => {
  const reply = (status: number, body: unknown = {}) => vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it('asks YouTube about the watch page of that id only', () => {
    expect(oembedUrl('abcdefghijk')).toBe('https://www.youtube.com/oembed?url=https%3A%2F%2Fwww.youtube.com%2Fwatch%3Fv%3Dabcdefghijk&format=json');
  });

  it('accepts a 200 and reads the title and channel', async () => {
    expect(await checkEmbeddable('abcdefghijk', reply(200, { title: 'T', author_name: 'Chan' }))).toEqual({ ok: true, title: 'T', channel: 'Chan' });
  });

  it('refuses anything else: embedding off, not found, an error, or no answer', async () => {
    expect(await checkEmbeddable('abcdefghijk', reply(401))).toMatchObject({ ok: false, reason: expect.stringMatching(/does not allow/) });
    expect(await checkEmbeddable('abcdefghijk', reply(403))).toMatchObject({ ok: false });
    expect(await checkEmbeddable('abcdefghijk', reply(404))).toMatchObject({ ok: false, reason: expect.stringMatching(/could not find/) });
    expect(await checkEmbeddable('abcdefghijk', reply(500))).toMatchObject({ ok: false });
    const offline = vi.fn(async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    expect(await checkEmbeddable('abcdefghijk', offline)).toMatchObject({ ok: false });
  });
});

describe('the film player address and controls', () => {
  it('lets the API control the player from this site only, keeps it inline, with captions on', () => {
    const url = new URL(youtubeEmbedUrl('abcdefghijk', { start: 10, end: 40, autoplay: true, captions: true, jsApiOrigin: 'https://deadeye.example' }));
    expect(url.host).toBe('www.youtube-nocookie.com');
    expect(url.searchParams.get('enablejsapi')).toBe('1');
    expect(url.searchParams.get('origin')).toBe('https://deadeye.example');
    expect(url.searchParams.get('playsinline')).toBe('1');
    expect(url.searchParams.get('cc_load_policy')).toBe('1');
    expect(url.searchParams.get('start')).toBe('10');
    expect(url.searchParams.get('end')).toBe('40');
  });

  it('leaves lesson videos as they were', () => {
    expect(youtubeEmbedUrl('abcdefghijk')).toBe('https://www.youtube-nocookie.com/embed/abcdefghijk');
  });

  it('offers slower speeds the video allows, and says why a video will not play', () => {
    expect(speedChoices([0.25, 0.5, 1, 1.5, 2])).toEqual([0.25, 0.5, 1]);
    expect(speedChoices([])).toEqual([1]);
    expect(videoErrorMessage(150)).toMatch(/no longer lets this video play/);
    expect(videoErrorMessage(100)).toMatch(/removed/);
  });

  it('turns database hints into words for the coach', () => {
    expect(filmLimitMessage('pro_film', 'x')).toMatch(/Pro/);
    expect(filmLimitMessage('pack_full', 'x')).toMatch(/20 clips/);
    expect(filmLimitMessage(undefined, 'fallback')).toBe('fallback');
  });
});
