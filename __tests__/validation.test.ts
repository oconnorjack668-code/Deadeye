// __tests__/validation.test.ts
// The form rules moved to "zod/mini" (smaller download); these pin the messages players see.
import { describe, it, expect } from 'vitest';
import { performanceTestSchema, sessionSchema, signUpSchema, updatePasswordSchema, workoutSchema } from '@/lib/validation';

const firstMessage = (r: { success: boolean; error?: { issues: Array<{ message: string }> } }) =>
  r.success ? null : r.error!.issues[0].message;

describe('form validation', () => {
  it('sign up', () => {
    const ok = { displayName: 'Al', email: 'a@b.co', password: 'Password1', age: '16-plus', termsAccepted: true };
    expect(signUpSchema.safeParse(ok).success).toBe(true);
    expect(signUpSchema.safeParse({ ...ok, age: '13-15' }).success).toBe(true);
    expect(firstMessage(signUpSchema.safeParse({ ...ok, email: 'nope' }))).toBe('Please enter a valid email address');
    expect(firstMessage(signUpSchema.safeParse({ ...ok, password: 'password1' }))).toBe('Password must contain at least one uppercase letter');
    expect(firstMessage(signUpSchema.safeParse({ ...ok, password: 'Pass1' }))).toBe('Password must be at least 8 characters');
    // Unanswered arrives as null from the form
    expect(firstMessage(signUpSchema.safeParse({ ...ok, age: null }))).toBe('Please tell us how old you are');
    expect(firstMessage(signUpSchema.safeParse({ ...ok, age: '12' }))).toBe('Please tell us how old you are');
    expect(firstMessage(signUpSchema.safeParse({ ...ok, termsAccepted: false }))).toBe('Please agree to the privacy policy and terms');
  });

  // Written with the rest of the auth forms but never imported until
  // /update-password existed, so the mismatch rule had never run.
  it('setting a new password', () => {
    expect(updatePasswordSchema.safeParse({ password: 'Password1', confirmPassword: 'Password1' }).success).toBe(true);
    expect(firstMessage(updatePasswordSchema.safeParse({ password: 'Password1', confirmPassword: 'Password2' }))).toBe(
      "Passwords don't match"
    );
    // The strength rules are the same ones sign-up enforces
    expect(firstMessage(updatePasswordSchema.safeParse({ password: 'short', confirmPassword: 'short' }))).toBe(
      'Password must be at least 8 characters'
    );
    expect(firstMessage(updatePasswordSchema.safeParse({ password: 'passwordone', confirmPassword: 'passwordone' }))).toBe(
      'Password must contain at least one uppercase letter'
    );
    expect(firstMessage(updatePasswordSchema.safeParse({ password: 'Passwordone', confirmPassword: 'Passwordone' }))).toBe(
      'Password must contain at least one number'
    );
  });

  it('basketball session', () => {
    const ok = { sessionDate: '2026-09-25', sessionType: 'shooting', durationMinutes: 45, intensityRpe: 6, perceivedQuality: 3, notes: null };
    expect(sessionSchema.safeParse(ok).success).toBe(true);
    expect(firstMessage(sessionSchema.safeParse({ ...ok, durationMinutes: 4 }))).toBe('Minimum 5 minutes');
    expect(firstMessage(sessionSchema.safeParse({ ...ok, durationMinutes: 45.5 }))).toBe('Duration must be whole minutes');
    expect(firstMessage(sessionSchema.safeParse({ ...ok, intensityRpe: 11 }))).toBe('RPE must be 1-10');
    expect(firstMessage(sessionSchema.safeParse({ ...ok, sessionDate: '25/09/2026' }))).toBe('Valid date required (YYYY-MM-DD)');
  });

  it('workout and athletic test', () => {
    expect(firstMessage(workoutSchema.safeParse({ workoutDate: '2026-09-25', workoutType: 'strength', durationMinutes: 300, rpe: 7 }))).toBe(
      'Maximum 240 minutes'
    );
    const test = { testDate: '2026-09-25', testType: 'standing_vertical', customTestName: null, value: 24, unit: 'inches', notes: null };
    expect(performanceTestSchema.safeParse(test).success).toBe(true);
    expect(firstMessage(performanceTestSchema.safeParse({ ...test, value: 0 }))).toBe('Value must be greater than zero');
  });
});
