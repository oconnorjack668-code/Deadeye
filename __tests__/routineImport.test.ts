// __tests__/routineImport.test.ts
// Importing routines from other gym apps: what the AI returns is cleaned before
// anyone sees it, names match the exercise library without merging different
// exercises, CSV exports from Strong, Hevy and spreadsheets become routines,
// and a failed save leaves nothing half-written.
import { describe, it, expect } from 'vitest';
import {
  applyLibraryMatches,
  exerciseKey,
  importMonthStartIso,
  importRetentionCutoffIso,
  matchExercise,
  MAX_EXERCISES,
  MAX_ROUTINES,
  monthlyImportLimit,
  normalizeProgram,
  normalizeReps,
  parseCsv,
  parseWorkoutCsv,
  saveImportedProgram,
  FREE_MONTHLY_ROUTINE_IMPORTS,
  PRO_MONTHLY_ROUTINE_IMPORTS,
  type ImportedProgram,
} from '@/lib/routineImport';

const LIBRARY = [
  { id: 'bench', name: 'Barbell Bench Press' },
  { id: 'rdl', name: 'Dumbbell Romanian Deadlift' },
  { id: 'pullup', name: 'Neutral Grip Pull-Ups' },
  { id: 'squat', name: 'Barbell Back Squat' },
  { id: 'calf', name: 'Single-Leg Calf Raises' },
];

describe('normalizeProgram', () => {
  it('keeps a well-formed program and tidies it', () => {
    const program = normalizeProgram({
      name: '  Push Pull Legs ',
      routines: [{ name: 'Push', exercises: [{ name: 'Bench Press', sets: 4, reps: '6 – 8', notes: '  80kg ' }] }],
    });
    expect(program).toEqual({
      name: 'Push Pull Legs',
      routines: [{ name: 'Push', exercises: [{ name: 'Bench Press', sets: 4, reps: '6-8', notes: '80kg', exerciseId: null }] }],
    });
  });

  it('drops exercises without a name and routines with no exercises, and names unnamed days', () => {
    const program = normalizeProgram({
      routines: [
        { name: '', exercises: [{ name: 'Squat' }, { name: '   ' }, { sets: 3 }] },
        { name: 'Empty', exercises: [] },
        'not an object',
      ],
    });
    expect(program.name).toBe('Imported program');
    expect(program.routines).toHaveLength(1);
    expect(program.routines[0].name).toBe('Day 1');
    expect(program.routines[0].exercises).toEqual([{ name: 'Squat', sets: 3, reps: null, notes: null, exerciseId: null }]);
  });

  it('clamps sets and caps routines, exercises and name length', () => {
    const many = Array.from({ length: 40 }, (_, i) => ({ name: `Exercise ${i}`, sets: i === 0 ? 99 : i === 1 ? -2 : '5' }));
    const program = normalizeProgram({ routines: Array.from({ length: 20 }, () => ({ name: 'x'.repeat(100), exercises: many })) });
    expect(program.routines).toHaveLength(MAX_ROUTINES);
    expect(program.routines[0].exercises).toHaveLength(MAX_EXERCISES);
    expect(program.routines[0].name).toHaveLength(60);
    expect(program.routines[0].exercises.map((e) => e.sets).slice(0, 3)).toEqual([20, 3, 5]);
  });

  it('survives junk from the model', () => {
    expect(normalizeProgram(null).routines).toEqual([]);
    expect(normalizeProgram({ routines: 'nope' }).routines).toEqual([]);
    expect(normalizeProgram({ routines: [{ exercises: [{ name: { evil: true } }] }] }).routines).toEqual([]);
  });
});

describe('normalizeReps', () => {
  it('keeps targets as written', () => {
    expect(normalizeReps('8-10')).toBe('8-10');
    expect(normalizeReps('8 — 10')).toBe('8-10');
    expect(normalizeReps('12 reps')).toBe('12');
    expect(normalizeReps('30s')).toBe('30s');
    expect(normalizeReps('AMRAP')).toBe('AMRAP');
    expect(normalizeReps(10)).toBe('10');
  });
  it('treats nothing as nothing', () => {
    expect(normalizeReps(null)).toBeNull();
    expect(normalizeReps('')).toBeNull();
    expect(normalizeReps(0)).toBeNull();
    expect(normalizeReps('0')).toBeNull();
  });
});

describe('matchExercise', () => {
  it('matches the same exercise written differently', () => {
    expect(matchExercise('barbell bench press', LIBRARY)?.id).toBe('bench');
    expect(matchExercise('Bench Press (Barbell)', LIBRARY)?.id).toBe('bench');
    expect(matchExercise('DB RDL', LIBRARY)?.id).toBe('rdl');
    expect(matchExercise('Neutral grip pullups', LIBRARY)?.id).toBe('pullup');
    expect(matchExercise('Single Leg Calf Raise', LIBRARY)?.id).toBe('calf');
  });

  it('does not guess between different exercises', () => {
    expect(matchExercise('Bench Press', LIBRARY)).toBeNull();
    expect(matchExercise('Front Squat', LIBRARY)).toBeNull();
    expect(matchExercise('', LIBRARY)).toBeNull();
  });

  it('spells shorthand out', () => {
    expect(exerciseKey('DB Shoulder Press')).toBe('dumbbell shoulder press');
    expect(exerciseKey('Push-Ups')).toBe('push up');
  });

  it('puts the library spelling and id on matched exercises only', () => {
    const program: ImportedProgram = {
      name: 'P',
      routines: [
        {
          name: 'A',
          exercises: [
            { name: 'Squat (Barbell)', sets: 3, reps: '5', notes: null, exerciseId: null },
            { name: 'Cable Fly', sets: 3, reps: '12', notes: null, exerciseId: 'stale' },
          ],
        },
      ],
    };
    const matched = applyLibraryMatches(program, [...LIBRARY, { id: 'squat2', name: 'Squat Barbell' }]);
    expect(matched.routines[0].exercises[0]).toMatchObject({ name: 'Squat Barbell', exerciseId: 'squat2' });
    expect(matched.routines[0].exercises[1]).toMatchObject({ name: 'Cable Fly', exerciseId: null });
  });
});

describe('the monthly allowance', () => {
  it('is 10 free and 100 for Pro', () => {
    expect(monthlyImportLimit(false)).toBe(FREE_MONTHLY_ROUTINE_IMPORTS);
    expect(FREE_MONTHLY_ROUTINE_IMPORTS).toBe(10);
    expect(monthlyImportLimit(true)).toBe(PRO_MONTHLY_ROUTINE_IMPORTS);
  });
  it('starts on the 1st of the month, UTC', () => {
    expect(importMonthStartIso(new Date('2026-11-30T23:30:00Z'))).toBe('2026-11-01T00:00:00.000Z');
  });
  it('keeps count rows from the start of last month, across a new year', () => {
    expect(importRetentionCutoffIso(new Date('2026-11-11T10:00:00Z'))).toBe('2026-10-01T00:00:00.000Z');
    expect(importRetentionCutoffIso(new Date('2027-01-05T10:00:00Z'))).toBe('2026-12-01T00:00:00.000Z');
  });
});

describe('parseCsv', () => {
  it('handles quotes, escaped quotes, commas in fields and CRLF', () => {
    expect(parseCsv('a,b\r\n"x, y","he said ""hi"""\r\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'he said "hi"'],
    ]);
  });
  it('reads semicolon and tab files, and skips a byte order mark and blank lines', () => {
    expect(parseCsv('﻿a;b\n1;2\n\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
    expect(parseCsv('a\tb\n1\t2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

// The layout of a Strong export: one row per set, "W" marks a warm-up
const STRONG = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2026-10-01 18:00:00,"Push",1h,"Bench Press (Barbell)",W,40,10,0,0,,,
2026-10-01 18:00:00,"Push",1h,"Bench Press (Barbell)",1,60,8,0,0,,,
2026-10-01 18:00:00,"Push",1h,"Bench Press (Barbell)",2,60,8,0,0,,,
2026-10-01 18:00:00,"Push",1h,"Lateral Raise (Dumbbell)",1,8,15,0,0,,,
2026-10-08 18:00:00,"Push",1h,"Bench Press (Barbell)",1,62.5,8,0,0,,,
2026-10-08 18:00:00,"Push",1h,"Bench Press (Barbell)",2,62.5,7,0,0,,,
2026-10-08 18:00:00,"Push",1h,"Bench Press (Barbell)",3,62.5,6,0,0,,,
2026-10-08 18:00:00,"Push",1h,"Plank",1,0,0,0,45,,,
2026-10-05 18:00:00,"Legs",1h,"Squat (Barbell)",1,80,5,0,0,"Belt on",,
2026-10-05 18:00:00,"Legs",1h,"Squat (Barbell)",2,80,5,0,0,,,
`;

// The layout of a Hevy export
const HEVY = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Upper","10 Oct 2026, 09:00","10 Oct 2026, 10:00","","Pull Up","","","0","warmup","","5","","",""
"Upper","10 Oct 2026, 09:00","10 Oct 2026, 10:00","","Pull Up","","","1","normal","","8","","",""
"Upper","10 Oct 2026, 09:00","10 Oct 2026, 10:00","","Pull Up","","","2","normal","","10","","",""
"Upper","03 Oct 2026, 09:00","03 Oct 2026, 10:00","","Seated Row","","","0","normal","50","12","","",""
`;

describe('parseWorkoutCsv', () => {
  it('turns a Strong log into one routine per workout, as last done, without warm-ups', () => {
    const { program, format, error } = parseWorkoutCsv(STRONG, 'From Strong');
    expect(error).toBeUndefined();
    expect(format).toBe('history');
    expect(program.name).toBe('From Strong');
    // Most recent first: Push (8 Oct) then Legs (5 Oct)
    expect(program.routines.map((r) => r.name)).toEqual(['Push', 'Legs']);
    expect(program.routines[0].exercises).toEqual([
      { name: 'Bench Press (Barbell)', sets: 3, reps: '6-8', notes: null, exerciseId: null },
      { name: 'Plank', sets: 1, reps: '45s', notes: null, exerciseId: null },
    ]);
    expect(program.routines[1].exercises[0]).toMatchObject({ name: 'Squat (Barbell)', sets: 2, reps: '5', notes: 'Belt on' });
  });

  it('reads a Hevy log the same way', () => {
    const { program } = parseWorkoutCsv(HEVY);
    expect(program.routines).toHaveLength(1);
    // The 10 Oct session is the latest "Upper", so the 3 Oct row is not in it
    expect(program.routines[0].exercises).toEqual([{ name: 'Pull Up', sets: 2, reps: '8-10', notes: null, exerciseId: null }]);
  });

  it('reads a semicolon Strong export', () => {
    const { program } = parseWorkoutCsv(STRONG.replace(/,/g, ';'));
    expect(program.routines.map((r) => r.name)).toEqual(['Push', 'Legs']);
  });

  it('takes a spreadsheet plan as written', () => {
    const csv = `Day,Exercise,Sets,Reps,Notes
Day 1,Back Squat,5,5,heavy
Day 1,Nordic Curl,3,6,
Day 2,Bench,4,8-10,`;
    const { program, format } = parseWorkoutCsv(csv, 'My plan');
    expect(format).toBe('plan');
    expect(program.routines).toEqual([
      {
        name: 'Day 1',
        exercises: [
          { name: 'Back Squat', sets: 5, reps: '5', notes: 'heavy', exerciseId: null },
          { name: 'Nordic Curl', sets: 3, reps: '6', notes: null, exerciseId: null },
        ],
      },
      { name: 'Day 2', exercises: [{ name: 'Bench', sets: 4, reps: '8-10', notes: null, exerciseId: null }] },
    ]);
  });

  it('says what is wrong with a file it cannot read', () => {
    expect(parseWorkoutCsv('').error).toMatch(/no rows/);
    expect(parseWorkoutCsv('foo,bar\n1,2').error).toMatch(/exercise column/);
    expect(parseWorkoutCsv('Exercise Name,Set Order\nBench,W').error).toMatch(/No sets/);
  });
});

// A small stand-in for the Supabase client: records writes, can fail one table
function fakeSupabase(failTable?: string) {
  const calls: Array<{ table: string; op: string; payload?: unknown; filter?: unknown }> = [];
  const client = {
    from(table: string) {
      return {
        insert: async (payload: unknown) => {
          calls.push({ table, op: 'insert', payload });
          return { error: table === failTable ? { message: 'boom' } : null };
        },
        delete: () => ({
          eq: async (col: string, value: unknown) => {
            calls.push({ table, op: 'delete', filter: [col, value] });
            return { error: null };
          },
          in: async (col: string, value: unknown) => {
            calls.push({ table, op: 'delete', filter: [col, value] });
            return { error: null };
          },
        }),
      };
    },
  };
  return { client: client as never, calls };
}

const TWO_DAYS: ImportedProgram = {
  name: 'PPL',
  routines: [
    { name: 'Push', exercises: [{ name: 'Bench', sets: 4, reps: '6-8', notes: 'pause', exerciseId: 'bench' }] },
    { name: 'Pull', exercises: [{ name: 'Row', sets: 3, reps: null, notes: null, exerciseId: null }] },
  ],
};

describe('saveImportedProgram', () => {
  it('keeps two or more routines together as a program, in order', async () => {
    const { client, calls } = fakeSupabase();
    expect(await saveImportedProgram(client, 'u1', TWO_DAYS, 'text')).toEqual({});
    const program = calls.find((c) => c.table === 'user_programs')!.payload as { id: string; name: string; source: string };
    expect(program).toMatchObject({ user_id: 'u1', name: 'PPL', source: 'text' });
    const routines = calls.find((c) => c.table === 'workout_routines')!.payload as Array<Record<string, unknown>>;
    expect(routines.map((r) => [r.name, r.day_order, r.program_id])).toEqual([
      ['Push', 0, program.id],
      ['Pull', 1, program.id],
    ]);
    const exercises = calls.find((c) => c.table === 'routine_exercises')!.payload as Array<Record<string, unknown>>;
    expect(exercises[0]).toMatchObject({ routine_id: routines[0].id, exercise_id: 'bench', target_sets: 4, target_reps: '6-8', notes: 'pause' });
    expect(exercises[1]).toMatchObject({ routine_id: routines[1].id, target_reps: null, notes: null });
  });

  it('saves a single routine on its own', async () => {
    const { client, calls } = fakeSupabase();
    await saveImportedProgram(client, 'u1', { ...TWO_DAYS, routines: [TWO_DAYS.routines[0]] }, 'csv');
    expect(calls.some((c) => c.table === 'user_programs')).toBe(false);
    const routines = calls.find((c) => c.table === 'workout_routines')!.payload as Array<Record<string, unknown>>;
    expect(routines[0].program_id).toBeNull();
  });

  it('removes what it wrote when the exercises fail', async () => {
    const { client, calls } = fakeSupabase('routine_exercises');
    const result = await saveImportedProgram(client, 'u1', TWO_DAYS, 'image');
    expect(result.error).toMatch(/Could not save the exercises/);
    // Deleting the program takes its routines with it (ON DELETE CASCADE)
    expect(calls.at(-1)).toMatchObject({ table: 'user_programs', op: 'delete' });
  });

  it('removes a lone routine when its exercises fail', async () => {
    const { client, calls } = fakeSupabase('routine_exercises');
    await saveImportedProgram(client, 'u1', { ...TWO_DAYS, routines: [TWO_DAYS.routines[0]] }, 'text');
    expect(calls.at(-1)).toMatchObject({ table: 'workout_routines', op: 'delete' });
  });

  it('refuses an empty program', async () => {
    const { client, calls } = fakeSupabase();
    expect((await saveImportedProgram(client, 'u1', { name: 'x', routines: [] }, 'text')).error).toBeTruthy();
    expect(calls).toHaveLength(0);
  });
});
