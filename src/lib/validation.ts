// src/lib/validation.ts
// Form rules for the loggers and sign-up. Uses "zod/mini", the tree-shakable build of Zod:
// the same checks and messages, but ~80 KB (gzipped) less JavaScript on the pages that load it.
//
// NOT EVERY SCHEMA HERE IS WIRED UP. Five are parsed by a form:
//
//   signUpSchema          (auth)/signup
//   updatePasswordSchema  (auth)/update-password
//   sessionSchema         (app)/basketball/new
//   workoutSchema         (app)/workouts/new and EditWorkout on (app)/workouts/[id]
//   performanceTestSchema (app)/workouts/tests/new
//
// The rest are never imported. Their rules are enforced inline instead, and in
// several cases more tightly than the schema states, so do not assume a field is
// unguarded just because its schema is unused - and do not "fix" a form by
// wiring one of these up without comparing the two rule sets first:
//
//   signInSchema                (auth)/login - required + type="email"
//   resetPasswordSchema         (auth)/reset-password - required + type="email"
//   onboardingSchema            onboarding handleFinish: height range, and at
//                               least one goal and focus area. displayName
//                               deliberately falls back to "Player" rather than
//                               blocking setup, which the schema would not allow.
//   shootingEntrySchema         basketball/new addTotals: whole numbers,
//                               attempts >= 1, makes <= attempts, max 1000
//   workoutSetSchema            workouts/new: reps 1-500, weight 0-2000
//   goalSchema                  goals/GoalsEditor addGoal: whole number, 1..max
//                               per goal type, custom title >= 3 chars
//   notificationPreferencesSchema  no form parses this one
import * as z from 'zod/mini';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const newPassword = () =>
  z.string().check(
    z.minLength(8, 'Password must be at least 8 characters'),
    z.regex(/[A-Z]/, 'Password must contain at least one uppercase letter'),
    z.regex(/[0-9]/, 'Password must contain at least one number')
  );

export const signUpSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: newPassword(),
  displayName: z.string().check(z.minLength(2, 'Display name must be at least 2 characters'), z.maxLength(50)),
  // Deadeye is for players aged 13 and over; under 16 needs a parent (00036)
  age: z.enum(['16-plus', '13-15'], 'Please tell us how old you are'),
  termsAccepted: z.boolean().check(z.refine((v) => v, 'Please agree to the privacy policy and terms')),
});

export const signInSchema = z.object({
  email: z.email('Please enter a valid email address'),
  password: z.string().check(z.minLength(1, 'Password is required')),
});

export const resetPasswordSchema = z.object({
  email: z.email('Please enter a valid email address'),
});

export const updatePasswordSchema = z
  .object({
    password: newPassword(),
    confirmPassword: z.string(),
  })
  .check(
    z.refine((data) => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    })
  );

export const onboardingSchema = z.object({
  displayName: z.string().check(z.minLength(2, 'Display name is required')),
  ageBracket: z.enum(['13', '14-17', '18-22', '23-30', '30+'], {
    message: 'Please select an age bracket',
  }),
  heightCm: z.optional(
    z.nullable(z.number().check(z.gte(120, 'Height must be at least 120 cm'), z.lte(240, 'Height must be under 240 cm')))
  ),
  position: z.enum(['PG', 'SG', 'SF', 'PF', 'C', 'G', 'F', 'multi'], {
    message: 'Please select your primary position',
  }),
  dominantHand: z.enum(['left', 'right', 'ambidextrous'], {
    message: 'Please select your dominant hand',
  }),
  playingLevel: z.enum(['beginner', 'intermediate', 'advanced', 'elite', 'college_pro'], {
    message: 'Please select your playing level',
  }),
  goals: z.array(z.string()).check(z.minLength(1, 'Select at least one training goal')),
  strengths: z._default(z.array(z.string()), []),
  focusAreas: z.array(z.string()).check(z.minLength(1, 'Select at least one focus area')),
  isPublic: z._default(z.boolean(), false),
});

export const sessionSchema = z.object({
  sessionDate: z.string().check(z.regex(DATE, 'Valid date required (YYYY-MM-DD)')),
  sessionType: z.enum(['shooting', 'ball-handling', 'footwork', 'scrimmage', 'pickup', 'skills', 'game', 'mixed']),
  durationMinutes: z.int('Duration must be whole minutes').check(z.gte(5, 'Minimum 5 minutes'), z.lte(360, 'Maximum 360 minutes')),
  intensityRpe: z.int().check(z.gte(1, 'RPE must be 1-10'), z.lte(10, 'RPE must be 1-10')),
  perceivedQuality: z.number().check(z.gte(1, 'Quality must be 1-5'), z.lte(5, 'Quality must be 1-5')),
  notes: z.nullable(z.optional(z.string().check(z.maxLength(1000)))),
});

export const shootingEntrySchema = z
  .object({
    shotZone: z.enum([
      'paint',
      'free-throw',
      'mid-left-corner',
      'mid-left-wing',
      'mid-center',
      'mid-right-wing',
      'mid-right-corner',
      'three-left-corner',
      'three-left-wing',
      'three-top',
      'three-right-wing',
      'three-right-corner',
      'deep-three',
      'all-around',
    ]),
    shotType: z.nullable(
      z.optional(z.enum(['catch-and-shoot', 'off-the-dribble', 'step-back', 'free-throw', 'floater', 'pull-up', 'spot-up']))
    ),
    makes: z.int('Makes must be a whole number').check(z.gte(0, 'Makes cannot be negative')),
    attempts: z.int('Attempts must be a whole number').check(z.gte(0, 'Attempts cannot be negative')),
  })
  .check(
    z.refine((data) => data.attempts >= data.makes, {
      message: 'Attempts must be greater than or equal to makes',
      path: ['attempts'],
    })
  );

export const workoutSchema = z.object({
  workoutDate: z.string().check(z.regex(DATE, 'Valid date required (YYYY-MM-DD)')),
  workoutType: z.enum(['strength', 'power_plyos', 'mobility', 'recovery', 'conditioning', 'testing', 'mixed']),
  durationMinutes: z.int('Duration must be whole minutes').check(z.gte(5, 'Minimum 5 minutes'), z.lte(240, 'Maximum 240 minutes')),
  rpe: z.int().check(z.gte(1, 'RPE must be 1-10'), z.lte(10, 'RPE must be 1-10')),
  notes: z.nullable(z.optional(z.string().check(z.maxLength(1000)))),
});

export const workoutSetSchema = z.object({
  exerciseName: z.string().check(z.minLength(1, 'Exercise name is required')),
  exerciseCategory: z.nullable(z.optional(z.string())),
  setNumber: z.int().check(z.gte(1)),
  reps: z.nullable(z.optional(z.int('Reps must be a whole number').check(z.gte(0, 'Reps cannot be negative')))),
  weightKg: z.nullable(z.optional(z.number().check(z.gte(0, 'Weight cannot be negative')))),
  durationSeconds: z.nullable(z.optional(z.int('Seconds must be a whole number').check(z.gte(0, 'Seconds cannot be negative')))),
  distanceMeters: z.nullable(z.optional(z.number().check(z.gte(0, 'Distance cannot be negative')))),
  rpe: z.nullable(z.optional(z.int('RPE must be a whole number').check(z.gte(1, 'RPE must be 1-10'), z.lte(10, 'RPE must be 1-10')))),
  isPersonalRecord: z._default(z.boolean(), false),
  notes: z.nullable(z.optional(z.string().check(z.maxLength(500)))),
});

export const performanceTestSchema = z.object({
  testDate: z.string().check(z.regex(DATE, 'Valid date required (YYYY-MM-DD)')),
  testType: z.enum([
    'standing_vertical',
    'approach_vertical',
    'sprint_three_quarter',
    'sprint_40yd',
    'lane_agility',
    'pro_agility_5_10_5',
    'standing_broad_jump',
    'custom',
  ]),
  customTestName: z.nullable(z.optional(z.string())),
  value: z.number().check(z.positive('Value must be greater than zero')),
  unit: z.enum(['inches', 'cm', 'seconds', 'meters', 'reps']),
  notes: z.nullable(z.optional(z.string().check(z.maxLength(500)))),
});

export const goalSchema = z.object({
  goalType: z.enum(['weekly_training_days', 'weekly_makes', 'shooting_pct', 'strength_days', 'iq_study_items', 'custom']),
  title: z.string().check(z.minLength(3, 'Title must be at least 3 characters')),
  targetValue: z.number().check(z.positive('Target must be positive integer')),
  period: z._default(z.enum(['weekly', 'monthly', 'season']), 'weekly'),
});

export const notificationPreferencesSchema = z.object({
  reminderEnabled: z.boolean(),
  reminderDays: z.array(z.number().check(z.gte(0), z.lte(6))),
  reminderTime: z.string().check(z.regex(TIME, 'Valid time format required (HH:MM)')),
  quietHoursStart: z.optional(z.nullable(z.string().check(z.regex(TIME)))),
  quietHoursEnd: z.optional(z.nullable(z.string().check(z.regex(TIME)))),
  emailReminders: z.boolean(),
  pushEnabled: z.boolean(),
});
