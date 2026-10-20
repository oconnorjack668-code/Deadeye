// src/lib/generator.ts
// Builds a workout from the drill and exercise libraries for a time budget and focus.

export type Focus =
  | 'shooting'
  | 'ball_handling'
  | 'finishing'
  | 'footwork'
  | 'defense'
  | 'conditioning'
  | 'strength'
  | 'athleticism';

export type Location = 'court_hoop' | 'court_no_hoop' | 'gym';
export type Level = 'beginner' | 'intermediate' | 'advanced';

export interface GenDrill {
  slug: string;
  name: string;
  skill: string;
  level: string;
  players: string;
  equipment: string[];
  duration_minutes: number;
}

export interface GenExercise {
  name: string;
  primary_muscle: string | null;
  equipment: string[];
}

export interface GeneratorOptions {
  minutes: number;
  focus: Focus[];
  location: Location;
  level: Level;
  withPartner: boolean;
  seed: number;
}

export interface GeneratedWorkout {
  warmupMinutes: number;
  drills: GenDrill[];
  exercises: Array<GenExercise & { sets: number; reps: string }>;
  totalMinutes: number;
}

export const COURT_FOCUS: Focus[] = ['shooting', 'ball_handling', 'finishing', 'footwork', 'defense', 'conditioning'];
const LEVEL_RANK: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
const MINUTES_PER_EXERCISE = 6; // ~3 sets with rest
const BODYWEIGHT = new Set(['bodyweight', 'none', 'mat', 'wall', 'court', 'box', 'bench', 'step']);

/** Small deterministic PRNG so the same day gives the same workout, and "shuffle" gives a new one. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 10_000) / 10_000;
  };
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Exercises only for players the builder is told are advanced: high-impact
 * plyometrics and lifts that need coaching to do safely. The library has no
 * level of its own, and the builder used to hand a beginner - who can be 13 -
 * depth jumps, hang cleans, good mornings and Nordics.
 */
const ADVANCED_ONLY = new Set([
  'Depth Jumps',
  'Barbell Hang Power Clean',
  'Barbell Good Morning',
  'Single-Leg Box Jump',
  'Hurdle Hops',
  'Alternate-Leg Bounds',
]);

/**
 * Exercises that need some strength and technique first: hard eccentrics,
 * loaded or ballistic movements, and jumps that land hard. Every barbell lift
 * is in this group too, by its equipment.
 */
const NOT_FOR_BEGINNERS = new Set([
  'Nordic Hamstring Curl',
  'Reverse Nordic',
  'Trap Bar Deadlift',
  'Kettlebell Swing',
  'Overhead Dumbbell Push Press',
  'Chest Dips',
  'Plyometric Push-Ups',
  'Tuck Jumps',
  'Split Squat Jumps',
  'Skater Squat',
  'Single-Leg Lateral Line Hops',
  'Turkish Get-Up',
  'Renegade Row',
  'Ab Wheel Rollout',
  'Stir the Pot',
  'Medicine Ball Overhead Backward Toss',
]);

/** The least experience an exercise should be given to. */
export function exerciseLevel(e: GenExercise): Level {
  if (ADVANCED_ONLY.has(e.name)) return 'advanced';
  if (NOT_FOR_BEGINNERS.has(e.name) || e.equipment.some((q) => /barbell|ez_bar|trap_bar/i.test(q))) return 'intermediate';
  return 'beginner';
}

/** Exercises done for time, not reps. "Wall Sit 3x6-8" was being prescribed. */
const HOLDS = new Set([
  'Front Plank',
  'Side Plank',
  'Hollow Body Hold',
  'Copenhagen Plank',
  'Wall Sit',
  'Dead Hang',
  'Plate Pinch Hold',
  'Deep Squat Hold',
  'Spanish Squat',
]);

/** Exercises done for distance. */
const CARRIES = new Set(["Farmer's Carry", 'Suitcase Carry', "Farmer's Walk on Toes", 'Sled Push']);

/** What to do for one set of an exercise, given the reps its slot asks for. */
export function prescriptionFor(name: string, reps: string): string {
  if (HOLDS.has(name)) return '20-40 sec';
  if (CARRIES.has(name)) return '20-30 m';
  return reps;
}

function needsHoop(d: GenDrill): boolean {
  return d.equipment.some((e) => e.toLowerCase().includes('hoop'));
}

export function generateWorkout(drills: GenDrill[], exercises: GenExercise[], o: GeneratorOptions): GeneratedWorkout {
  const random = rng(o.seed);
  const warmupMinutes = o.minutes >= 30 ? 8 : 5;
  const courtFocus = o.focus.filter((f) => COURT_FOCUS.includes(f));
  const gymFocus = o.focus.filter((f) => f === 'strength' || f === 'athleticism');

  // Gym work takes about 40% of the session when combined with court work, all of it otherwise
  const available = Math.max(5, o.minutes - warmupMinutes);
  const gymBudget = gymFocus.length === 0 ? 0 : courtFocus.length === 0 || o.location === 'gym' ? available : Math.round(available * 0.4);
  const courtBudget = o.location === 'gym' ? 0 : available - gymBudget;

  // ---- Court drills: round-robin across the chosen skills until the time is used
  const picked: GenDrill[] = [];
  if (courtBudget > 0 && courtFocus.length > 0) {
    const eligible = drills.filter(
      (d) =>
        LEVEL_RANK[d.level] <= LEVEL_RANK[o.level] &&
        // A partner opens partner drills, not team ones: a shell drill or
        // knockout needs a team, and "I have a partner" was pulling them in
        (d.players === 'solo' || (o.withPartner && d.players === 'partner')) &&
        (o.location === 'court_hoop' || !needsHoop(d))
    );
    const pools = courtFocus.map((f) => shuffle(eligible.filter((d) => d.skill === f), random));
    let used = 0;
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const pool of pools) {
        const idx = pool.findIndex((d) => used + d.duration_minutes <= courtBudget + 2);
        if (idx >= 0) {
          const [d] = pool.splice(idx, 1);
          picked.push(d);
          used += d.duration_minutes;
          progressed = true;
        }
      }
    }
  }

  // ---- Gym exercises: a balanced strength session and/or explosiveness + injury prevention
  const chosen: Array<GenExercise & { sets: number; reps: string }> = [];
  if (gymBudget > 0) {
    const usable = exercises.filter(
      (e) =>
        LEVEL_RANK[exerciseLevel(e)] <= LEVEL_RANK[o.level] &&
        (o.location === 'gym' || e.equipment.length === 0 || e.equipment.every((q) => BODYWEIGHT.has(q)))
    );
    const slots = Math.max(2, Math.floor(gymBudget / MINUTES_PER_EXERCISE));
    const pattern: Array<{ muscles: string[]; reps: string }> = [];
    if (gymFocus.includes('athleticism')) {
      pattern.push({ muscles: ['plyometrics'], reps: '5' }, { muscles: ['plyometrics'], reps: '5' }, { muscles: ['injury_prevention'], reps: '10' });
    }
    if (gymFocus.includes('strength')) {
      pattern.push(
        { muscles: ['quads', 'glutes'], reps: '6-8' },
        { muscles: ['hamstrings'], reps: '8' },
        { muscles: ['chest', 'shoulders', 'triceps'], reps: '8-10' },
        { muscles: ['back', 'biceps'], reps: '8-10' },
        { muscles: ['core'], reps: '10-12' },
        { muscles: ['calves', 'forearms'], reps: '12' }
      );
    }
    const usedNames = new Set<string>();
    for (const slot of pattern) {
      if (chosen.length >= slots) break;
      const options = shuffle(usable.filter((e) => slot.muscles.includes(e.primary_muscle || '') && !usedNames.has(e.name)), random);
      if (options[0]) {
        usedNames.add(options[0].name);
        chosen.push({ ...options[0], sets: 3, reps: prescriptionFor(options[0].name, slot.reps) });
      }
    }
  }

  const totalMinutes =
    warmupMinutes + picked.reduce((n, d) => n + d.duration_minutes, 0) + chosen.length * MINUTES_PER_EXERCISE;
  return { warmupMinutes, drills: picked, exercises: chosen, totalMinutes };
}
