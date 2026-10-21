import { describe, it, expect } from 'vitest';
import { recommendedProgramGoal, programGoalLabel } from '@/lib/recommend';
import { GOAL_LABELS } from '@/lib/programs';

describe('recommendedProgramGoal', () => {
  it('maps a shooting goal to the shooting programs', () => {
    expect(recommendedProgramGoal(['3-Point Shooting Consistency'], [])).toBe('shooting');
  });

  it('maps a vertical goal to the vertical programs', () => {
    expect(recommendedProgramGoal(['Vertical Jump & Explosiveness'], [])).toBe('vertical');
  });

  it('weighs a stated goal above a focus area', () => {
    // The player wants handles; the focus area is a shooting detail
    const goal = recommendedProgramGoal(['Off-Hand Ball Handling & Flow'], ['Shooting Arc & Kinetic Dip']);
    expect(goal).toBe('ball_handling');
  });

  it('lets the first pick break a tie between two goals', () => {
    expect(recommendedProgramGoal(['Finishing Through Contact', 'Vertical Jump & Explosiveness'], [])).toBe('finishing');
    expect(recommendedProgramGoal(['Vertical Jump & Explosiveness', 'Finishing Through Contact'], [])).toBe('vertical');
  });

  it('adds up several selections pointing the same way', () => {
    const goal = recommendedProgramGoal(
      ['Mid-Range Pull-Up Mastery', 'Vertical Jump & Explosiveness'],
      ['Shooting Arc & Kinetic Dip', 'Free Throw Routine']
    );
    expect(goal).toBe('shooting');
  });

  it('falls back to focus areas when no goal was chosen', () => {
    expect(recommendedProgramGoal([], ['First Step Acceleration'])).toBe('athleticism');
  });

  it('returns null when nothing was selected', () => {
    expect(recommendedProgramGoal([], [])).toBeNull();
    expect(recommendedProgramGoal(null, null)).toBeNull();
    expect(recommendedProgramGoal(undefined, undefined)).toBeNull();
  });

  it('ignores selections it does not recognise', () => {
    expect(recommendedProgramGoal(['Something The App Never Offered'], [])).toBeNull();
  });

  it('only ever returns a goal the programs page can filter on', () => {
    const everyGoal = [
      'Consistent Training Habit',
      '3-Point Shooting Consistency',
      'Vertical Jump & Explosiveness',
      'Finishing Through Contact',
      'Pick & Roll Decision Making',
      'Lockdown On-Ball Defense',
      'Mid-Range Pull-Up Mastery',
      'Off-Hand Ball Handling & Flow',
    ];
    const everyFocus = [
      'Shooting Arc & Kinetic Dip',
      'Floater Range & Touch',
      'First Step Acceleration',
      'Defensive Lateral Slide Speed',
      'Ankle & Knee Deceleration Durability',
      'Free Throw Routine',
      'Off-Ball Spacing & Cuts',
      // The plainer names from 21 Oct 2026; the old two above stay on older profiles
      'Shooting Arc & Dip',
      'Strong Ankles & Knees',
    ];
    // Guards against a typo in the maps producing a goal key that filters to
    // an empty programs list.
    for (const g of everyGoal) {
      const key = recommendedProgramGoal([g], []);
      expect(key, `goal "${g}" produced an unknown key`).not.toBeNull();
      expect(GOAL_LABELS[key as string], `goal "${g}" -> ${key}`).toBeTruthy();
    }
    for (const f of everyFocus) {
      const key = recommendedProgramGoal([], [f]);
      expect(key, `focus "${f}" produced an unknown key`).not.toBeNull();
      expect(GOAL_LABELS[key as string], `focus "${f}" -> ${key}`).toBeTruthy();
    }
  });
});

describe('programGoalLabel', () => {
  it('gives a readable label', () => {
    expect(programGoalLabel('shooting')).toBe('Shooting');
    expect(programGoalLabel('ball_handling')).toBe('Ball Handling');
  });

  it('handles null and unknown keys', () => {
    expect(programGoalLabel(null)).toBeNull();
    expect(programGoalLabel('nonsense')).toBeNull();
  });
});
