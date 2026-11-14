// __tests__/plays-quiz.test.ts
// The role quiz built from a play's drawing, the coach's progress view
// (statuses and the team split, never anyone's own answers), the editor's
// save input, and the Free limits in words.
import { describe, it, expect } from 'vitest';
import { LIBRARY_PLAYS } from '@/data/plays/library';
import { recordMove } from '@/lib/plays/editor';
import { setupDiagram } from '@/lib/plays/setups';
import { spot } from '@/lib/plays/spots';
import { buildQuiz, gradeQuiz, knowsIt, passMark, QUIZ_TARGETS, targetFor } from '@/lib/plays/quiz';
import { playerStatus, resultsVisibleUntil, splitByQuestion, statusCounts } from '@/lib/plays/progress';
import { draftFrom, firstInputProblem, pointsFromText, PlayInputSchema, toInput, type PlayDraft } from '@/lib/plays/input';
import { canDrawAnother, FREE_COACH_PLAYS, limitMessage } from '@/lib/plays/limits';

const play = (slug: string) => LIBRARY_PLAYS.find((p) => p.slug === slug)!.diagram;

describe('quiz targets', () => {
  it('are the named spots and the basket, each with a name to read out', () => {
    expect(QUIZ_TARGETS).toHaveLength(15);
    expect(QUIZ_TARGETS.find((t) => t.id === 'basket')?.label).toBe('the basket');
  });

  it('reads a point as the basket, a named spot, or nothing in between', () => {
    expect(targetFor({ x: 25, y: 7 })).toBe('basket');
    expect(targetFor({ x: 2, y: 3.5 })).toBe('left-corner');
    expect(targetFor({ x: 21, y: 29 })).toBeNull();
    expect(targetFor({ x: 31, y: -2.5 })).toBeNull();
  });
});

describe('buildQuiz', () => {
  it('asks three questions on a play, spread over players and steps, each with the right spot and the job explained', () => {
    const qs = buildQuiz(play('four-out-one-in'));
    expect(qs.map((q) => q.key)).toEqual(['o1:2', 'o5:3', 'o2:6']);
    expect(qs[0]).toMatchObject({ prompt: "You're 1. In step 2, where do you go?", answer: 'basket', step: 2, label: '1' });
    expect(qs[0].explanation).toMatch(/^Cut to the basket\./);
    expect(qs[1].answer).toBe('left-block');
  });

  it('gives the same questions every time, so a coach can compare answers', () => {
    expect(buildQuiz(play('horns-high-low'))).toEqual(buildQuiz(play('horns-high-low')));
  });

  it('asks fewer when few moves end on a spot, and none for a play where nobody does', () => {
    expect(buildQuiz(play('give-and-go')).map((q) => q.key)).toEqual(['o1:3']);
    expect(buildQuiz(setupDiagram('horns'))).toEqual([]);
  });

  it('has at least one question for every library play', () => {
    for (const p of LIBRARY_PLAYS) expect(buildQuiz(p.diagram).length).toBeGreaterThan(0);
  });

  it('works on a play drawn in the editor', () => {
    const r = recordMove(setupDiagram('five-out'), 1, { kind: 'player', playerId: 'o3', to: spot('left-block') });
    if (!r.ok) throw new Error(r.error);
    expect(buildQuiz(r.diagram).map((q) => [q.key, q.answer])).toEqual([['o3:1', 'left-block']]);
  });
});

describe('marking', () => {
  it('knows the play with 2 of 3, or all of them when there are fewer questions', () => {
    expect(passMark(3)).toBe(2);
    expect(passMark(1)).toBe(1);
    expect(knowsIt(2, 3)).toBe(true);
    expect(knowsIt(1, 3)).toBe(false);
    expect(knowsIt(0, 0)).toBe(false);
  });

  it('marks picks against the questions, ignoring unknown questions and spots', () => {
    const qs = buildQuiz(play('four-out-one-in'));
    const { answers, score } = gradeQuiz(qs, [
      { key: 'o1:2', pick: 'basket' },
      { key: 'o5:3', pick: 'left-elbow' },
      { key: 'o2:6', pick: 'basket' },
      { key: 'o9:9', pick: 'basket' },
    ]);
    expect(score).toBe(2);
    expect(answers).toEqual([
      { key: 'o1:2', pick: 'basket', right: true },
      { key: 'o5:3', pick: 'left-elbow', right: false },
      { key: 'o2:6', pick: 'basket', right: true },
    ]);
    expect(gradeQuiz(qs, [{ key: 'o1:2', pick: 'the moon' }]).answers).toEqual([]);
  });
});

describe('the coach progress view', () => {
  const attempts = [
    { user_id: 'a', score: 1 },
    { user_id: 'a', score: 3 },
    { user_id: 'b', score: 1 },
  ];

  it('says knows it, done or not started for each player', () => {
    expect(playerStatus('a', attempts, new Set(), 3)).toBe('knows_it');
    expect(playerStatus('b', attempts, new Set(), 3)).toBe('done');
    expect(playerStatus('c', attempts, new Set(['c']), 3)).toBe('done');
    expect(playerStatus('d', attempts, new Set(), 3)).toBe('not_started');
    expect(statusCounts(['knows_it', 'done', 'done', 'not_started'])).toEqual({ knows_it: 1, done: 2, not_started: 1 });
  });

  it('shows the team split per question as totals, right answer marked, older questions left out', () => {
    const qs = buildQuiz(play('four-out-one-in'));
    const split = splitByQuestion(qs, [
      { question_key: 'o1:2', pick: 'basket', players: 4 },
      { question_key: 'o1:2', pick: 'right-wing', players: 2 },
      { question_key: 'o4:2', pick: 'right-slot', players: 3 },
    ]);
    expect(split[0]).toEqual({
      question: qs[0],
      answered: 6,
      picks: [
        { pick: 'basket', label: 'the basket', players: 4, right: true },
        { pick: 'right-wing', label: 'the right wing', players: 2, right: false },
      ],
    });
    expect(split[1].answered).toBe(0);
    expect(JSON.stringify(split)).not.toMatch(/user_id/);
  });

  it('shows results until 90 days after the due date, or the day it was set', () => {
    expect(resultsVisibleUntil('2026-11-20', '2026-11-13T10:00:00Z')).toBe('2027-02-18');
    expect(resultsVisibleUntil(null, '2026-11-13T10:00:00Z')).toBe('2027-02-11');
  });
});

describe('what the editor saves', () => {
  const draft: PlayDraft = { title: '  Horns flare ', category: 'half_court', minAge: 'U12', description: '', coachingPoints: 'Wide\n\n Sprint to screen \n' };

  it('turns the details into the input the server checks', () => {
    const input = toInput(draft, setupDiagram('horns'), { copiedFrom: '00000000-0000-4000-8000-000000000001' });
    const parsed = PlayInputSchema.parse(input);
    expect(parsed.title).toBe('Horns flare');
    expect(parsed.coachingPoints).toEqual(['Wide', 'Sprint to screen']);
    expect(parsed.copiedFrom).toBe('00000000-0000-4000-8000-000000000001');
    expect(pointsFromText(' a \n\nb')).toEqual(['a', 'b']);
  });

  it('names the first problem: no name, a broken diagram, an unknown type', () => {
    expect(firstInputProblem(toInput({ ...draft, title: ' ' }, setupDiagram('horns')))).toBe('Give the play a name.');
    const broken = setupDiagram('horns');
    broken.frames[1].positions.o3 = { x: 10, y: 10 };
    expect(firstInputProblem(toInput(draft, broken))).toMatch(/3 moves without a cut/);
    expect(firstInputProblem({ ...toInput(draft, setupDiagram('horns')), category: 'trick_plays' as never })).not.toBeNull();
  });

  it('fills the editor from a play, for editing or copying', () => {
    expect(draftFrom({ title: 'Floppy', category: 'half_court', minAge: 'U13', description: 'D', coachingPoints: ['a', 'b'] })).toEqual({
      title: 'Floppy',
      category: 'half_court',
      minAge: 'U13',
      description: 'D',
      coachingPoints: 'a\nb',
    });
  });
});

describe('Free limits for coaches', () => {
  it(`keeps ${FREE_COACH_PLAYS} plays on Free and any number on Pro`, () => {
    expect(canDrawAnother(FREE_COACH_PLAYS - 1, false)).toBe(true);
    expect(canDrawAnother(FREE_COACH_PLAYS, false)).toBe(false);
    expect(canDrawAnother(500, true)).toBe(true);
  });

  it('turns the database hints into plain words', () => {
    expect(limitMessage('play_limit', 'x')).toMatch(/keep 5 plays/);
    expect(limitMessage('playbook_limit', 'x')).toMatch(/1 team/);
    expect(limitMessage('pro_play', 'x')).toMatch(/part of Pro/);
    expect(limitMessage(undefined, 'Could not save.')).toBe('Could not save.');
  });
});
