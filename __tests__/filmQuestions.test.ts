// __tests__/filmQuestions.test.ts
import { describe, it, expect } from 'vitest';
import {
  questionProblem,
  coachQueue,
  answeredFirst,
  readAccuracy,
  momentClock,
  verdictLabel,
  MIN_ANSWERED_FOR_RATE,
  MAX_QUESTION,
  type FilmQuestion,
} from '@/lib/filmQuestions';

const q = (over: Partial<FilmQuestion>): FilmQuestion => ({
  id: over.id || 'q',
  player_id: 'p',
  team_id: 't',
  video_asset_id: 'v',
  moment_ms: 0,
  question: 'Should I have passed?',
  player_read: 'I thought the lane was open',
  verdict: null,
  coach_note: null,
  answered_at: null,
  created_at: '2026-10-01T10:00:00Z',
  ...over,
});

describe('questionProblem', () => {
  it('accepts a question with a read behind it', () => {
    expect(questionProblem('Should I have passed here?', 'I thought I had the baseline')).toBeNull();
  });

  it('insists the player commits their own read first', () => {
    // The whole mechanism: without a read written down beforehand there is
    // nothing to compare the answer against, and the player has just received
    // a coaching tip they could have got anywhere.
    expect(questionProblem('Should I have passed here?', '')).toMatch(/what you were thinking/);
    expect(questionProblem('Should I have passed here?', '  ')).toMatch(/what you were thinking/);
  });

  it('needs an actual question', () => {
    expect(questionProblem('', 'I thought the lane was open')).toMatch(/what you want to ask/);
    expect(questionProblem('?', 'I thought the lane was open')).toMatch(/what you want to ask/);
  });

  it('caps both so neither can be pasted into a wall of text', () => {
    expect(questionProblem('x'.repeat(MAX_QUESTION + 1), 'a real read')).toMatch(/under/);
    expect(questionProblem('a real question', 'x'.repeat(501))).toMatch(/under/);
  });
});

describe('coachQueue', () => {
  it('shows only unanswered questions asked of a team, oldest first', () => {
    const queue = coachQueue([
      q({ id: 'new', created_at: '2026-10-05T10:00:00Z' }),
      q({ id: 'answered', answered_at: '2026-10-04T10:00:00Z', verdict: 'good_read' }),
      q({ id: 'old', created_at: '2026-10-01T10:00:00Z' }),
      // Self-review: nobody is waiting on a coach for this one
      q({ id: 'solo', team_id: null }),
    ]);
    expect(queue.map((x) => x.id)).toEqual(['old', 'new']);
  });
});

describe('answeredFirst', () => {
  it('floats the ones still waiting to the top', () => {
    const list = answeredFirst([
      q({ id: 'answered-recent', created_at: '2026-10-09T10:00:00Z', answered_at: '2026-10-09T12:00:00Z' }),
      q({ id: 'waiting', created_at: '2026-10-02T10:00:00Z' }),
    ]);
    expect(list[0].id).toBe('waiting');
  });
});

describe('readAccuracy', () => {
  const judged = (verdict: 'good_read' | 'wrong_read', i: number) =>
    q({ id: `j${i}`, verdict, answered_at: '2026-10-05T10:00:00Z' });

  it('says nothing until there are enough answers to mean something', () => {
    const few = Array.from({ length: MIN_ANSWERED_FOR_RATE - 1 }, (_, i) => judged('good_read', i));
    expect(readAccuracy(few).rate).toBeNull();
    expect(readAccuracy(few).judged).toBe(MIN_ANSWERED_FOR_RATE - 1);
  });

  it('counts how often the player read it the way the coach did', () => {
    const list = [
      ...Array.from({ length: 4 }, (_, i) => judged('good_read', i)),
      ...Array.from({ length: 2 }, (_, i) => judged('wrong_read', i + 10)),
    ];
    const { right, judged: n, rate } = readAccuracy(list);
    expect(right).toBe(4);
    expect(n).toBe(6);
    expect(rate).toBeCloseTo(4 / 6);
  });

  it('leaves "depends" out of the count entirely', () => {
    // The coach is saying the question was good, not that the player was
    const list = [
      ...Array.from({ length: 5 }, (_, i) => judged('good_read', i)),
      q({ id: 'd', verdict: 'depends', answered_at: '2026-10-05T10:00:00Z' }),
    ];
    expect(readAccuracy(list).judged).toBe(5);
  });

  it('ignores answers to questions with no read committed', () => {
    const list = [
      ...Array.from({ length: 5 }, (_, i) => judged('good_read', i)),
      q({ id: 'noread', player_read: null, verdict: 'wrong_read', answered_at: '2026-10-05T10:00:00Z' }),
    ];
    expect(readAccuracy(list).judged).toBe(5);
  });
});

describe('momentClock and verdictLabel', () => {
  it('reads a moment as mm:ss', () => {
    expect(momentClock(0)).toBe('0:00');
    expect(momentClock(65_400)).toBe('1:05');
    expect(momentClock(-10)).toBe('0:00');
  });

  it('says plainly when nobody has answered yet', () => {
    expect(verdictLabel(null)).toBe('Waiting on a coach');
    expect(verdictLabel('wrong_read')).toBe('Wrong read');
  });
});
