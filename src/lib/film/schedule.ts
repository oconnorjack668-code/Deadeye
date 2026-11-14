// src/lib/film/schedule.ts
// What the film clip player does, as a pure function, so every rule is
// tested without a video: the clip plays from its start; at each question's
// moment it pauses and the question shows below the video; after an answer
// the explanation shows; "See it again" goes back 3 seconds and stops at the
// same moment again; Continue plays on; at the end it stops.
//
// The component feeds in what the video reports (the time, every quarter of a
// second, and when it ends) and what the player taps, and carries out the
// commands that come back (pause, play, seek). The YouTube player itself is
// in youtubePlayer.ts.
import type { FilmQuestion } from './questions';

/** How far back "See it again" goes. */
export const SEE_AGAIN_S = 3;

/** The video reports its time this often, so a moment can be passed by this much before it is seen. */
export const TICK_MS = 250;

export type FilmPhase =
  | { kind: 'watching' }
  | { kind: 'asking'; index: number }
  | { kind: 'answered'; index: number }
  /** Going back over the last few seconds before a question; stops at it again. */
  | { kind: 'replaying'; index: number; then: 'asking' | 'answered' }
  | { kind: 'finished' };

export interface FilmPlayState {
  phase: FilmPhase;
  /** Questions already stopped at, by index, so none is asked twice. */
  asked: number[];
  /** The option picked for each question key. The first pick counts. */
  picks: Record<string, number>;
}

export type FilmEvent =
  | { type: 'tick'; t: number }
  | { type: 'ended' }
  | { type: 'answer'; pick: number }
  | { type: 'continue' }
  | { type: 'see_again' }
  | { type: 'watch_again' };

export type FilmCommand = { type: 'pause' } | { type: 'play' } | { type: 'seek'; to: number };

export interface FilmClipTiming {
  startS: number;
  endS: number;
  questions: FilmQuestion[];
}

export function initialFilmState(): FilmPlayState {
  return { phase: { kind: 'watching' }, asked: [], picks: {} };
}

/** The first question not yet asked whose moment has come. Questions are sorted by moment. */
export function dueQuestion(questions: FilmQuestion[], t: number, asked: readonly number[]): number | null {
  for (let i = 0; i < questions.length; i++) {
    if (!asked.includes(i) && t >= questions[i].moment_s) return i;
  }
  return null;
}

/** Where "See it again" goes back to: 3 seconds before the moment, never before the clip starts. */
export function seeAgainFrom(moment: number, startS: number): number {
  return Math.max(startS, moment - SEE_AGAIN_S);
}

/** Within a tick of the end counts as the end, so the clip stops at end_s and not after it. */
function atEnd(t: number, endS: number): boolean {
  return t >= endS - TICK_MS / 1000;
}

export function stepFilm(clip: FilmClipTiming, state: FilmPlayState, event: FilmEvent): { state: FilmPlayState; commands: FilmCommand[] } {
  const { phase } = state;
  const stay = { state, commands: [] as FilmCommand[] };

  switch (event.type) {
    case 'tick': {
      if (phase.kind === 'replaying') {
        const moment = clip.questions[phase.index].moment_s;
        if (event.t < moment) return stay;
        return { state: { ...state, phase: { kind: phase.then, index: phase.index } }, commands: [{ type: 'pause' }] };
      }
      // While a question is up the video is paused; if it is played on from
      // YouTube's own controls, the question stays until it is answered
      if (phase.kind !== 'watching') return stay;
      const due = dueQuestion(clip.questions, event.t, state.asked);
      if (due !== null) {
        return { state: { ...state, phase: { kind: 'asking', index: due }, asked: [...state.asked, due] }, commands: [{ type: 'pause' }] };
      }
      if (atEnd(event.t, clip.endS)) return { state: { ...state, phase: { kind: 'finished' } }, commands: [{ type: 'pause' }] };
      return stay;
    }
    case 'ended': {
      if (phase.kind !== 'watching') return stay;
      // Questions at the very end are still asked
      const due = dueQuestion(clip.questions, clip.endS, state.asked);
      if (due !== null) return { state: { ...state, phase: { kind: 'asking', index: due }, asked: [...state.asked, due] }, commands: [] };
      return { state: { ...state, phase: { kind: 'finished' } }, commands: [] };
    }
    case 'answer': {
      if (phase.kind !== 'asking') return stay;
      const q = clip.questions[phase.index];
      if (!Number.isInteger(event.pick) || event.pick < 0 || event.pick >= q.options.length) return stay;
      return {
        state: { ...state, phase: { kind: 'answered', index: phase.index }, picks: { ...state.picks, [q.key]: event.pick } },
        commands: [],
      };
    }
    case 'continue': {
      if (phase.kind !== 'answered') return stay;
      // Another question at the same moment, or one passed while paused, comes straight away
      const moment = clip.questions[phase.index].moment_s;
      const due = dueQuestion(clip.questions, moment, state.asked);
      if (due !== null) return { state: { ...state, phase: { kind: 'asking', index: due }, asked: [...state.asked, due] }, commands: [] };
      if (moment >= clip.endS - TICK_MS / 1000) return { state: { ...state, phase: { kind: 'finished' } }, commands: [] };
      return { state: { ...state, phase: { kind: 'watching' } }, commands: [{ type: 'play' }] };
    }
    case 'see_again': {
      if (phase.kind !== 'asking' && phase.kind !== 'answered') return stay;
      const moment = clip.questions[phase.index].moment_s;
      return {
        state: { ...state, phase: { kind: 'replaying', index: phase.index, then: phase.kind } },
        commands: [{ type: 'seek', to: seeAgainFrom(moment, clip.startS) }, { type: 'play' }],
      };
    }
    case 'watch_again': {
      if (phase.kind !== 'finished') return stay;
      // The first answers count, so the questions are not asked again
      return {
        state: { ...state, phase: { kind: 'watching' }, asked: clip.questions.map((_, i) => i) },
        commands: [{ type: 'seek', to: clip.startS }, { type: 'play' }],
      };
    }
  }
}

/** Right answers so far, against the questions as the player saw them. */
export function filmScore(questions: FilmQuestion[], picks: Record<string, number>): number {
  return questions.filter((q) => picks[q.key] === q.correct_index).length;
}

/** Whether every question has been answered, so the attempt can be kept. */
export function allAnswered(questions: FilmQuestion[], picks: Record<string, number>): boolean {
  return questions.length > 0 && questions.every((q) => picks[q.key] !== undefined);
}
