// src/lib/focusAreas.ts
// The setup chips: goals, focus areas and strengths. `value` is what
// profiles stores and what recommend.ts and focus/signals.ts key on, so it
// never changes; `label` is what a player reads (sentence case, Irish and UK
// spelling, so "defence"), changed freely. D4, 23 Nov 2026.
export type ChipOption = { value: string; label: string };

export const GOAL_OPTIONS: readonly ChipOption[] = [
  { value: 'Consistent Training Habit', label: 'Consistent training habit' },
  { value: '3-Point Shooting Consistency', label: '3-point shooting consistency' },
  { value: 'Vertical Jump & Explosiveness', label: 'Vertical jump and explosiveness' },
  { value: 'Finishing Through Contact', label: 'Finishing through contact' },
  { value: 'Pick & Roll Decision Making', label: 'Pick and roll decisions' },
  { value: 'Lockdown On-Ball Defense', label: 'Lockdown on-ball defence' },
  { value: 'Mid-Range Pull-Up Mastery', label: 'Mid-range pull-up' },
  { value: 'Off-Hand Ball Handling & Flow', label: 'Off-hand ball handling' },
];

export const FOCUS_AREA_OPTIONS: readonly ChipOption[] = [
  { value: 'Shooting Arc & Dip', label: 'Shooting arc and dip' },
  { value: 'Floater Range & Touch', label: 'Floater range and touch' },
  { value: 'First Step Acceleration', label: 'First-step speed' },
  { value: 'Defensive Lateral Slide Speed', label: 'Defensive slide speed' },
  { value: 'Strong Ankles & Knees', label: 'Strong ankles and knees' },
  { value: 'Free Throw Routine', label: 'Free-throw routine' },
  { value: 'Off-Ball Spacing & Cuts', label: 'Off-ball spacing and cuts' },
];

export const STRENGTH_OPTIONS: readonly ChipOption[] = [
  { value: 'Catch & Shoot Accuracy', label: 'Catch-and-shoot accuracy' },
  { value: 'Court Vision & Passing', label: 'Court vision and passing' },
  { value: 'High Motor / Hustle', label: 'Hustle and high motor' },
  { value: 'Rebounding & Positioning', label: 'Rebounding and positioning' },
  { value: 'Open Court Speed', label: 'Open-court speed' },
  { value: 'On-Ball Perimeter Defense', label: 'On-ball perimeter defence' },
];

// Focus areas renamed on 21 Oct 2026 for plainer words. Older profiles still
// hold the old names; onboarding maps them on load so they show as selected,
// and the profile shows the new name (recommend.ts still reads both).
export const RENAMED_FOCUS_AREAS: Record<string, string> = {
  'Shooting Arc & Kinetic Dip': 'Shooting Arc & Dip',
  'Ankle & Knee Deceleration Durability': 'Strong Ankles & Knees',
};

/** The stored focus-area value a saved one is now called. */
export function currentFocusArea(stored: string): string {
  return RENAMED_FOCUS_AREAS[stored] ?? stored;
}

const LABELS = new Map<string, string>(
  [...GOAL_OPTIONS, ...FOCUS_AREA_OPTIONS, ...STRENGTH_OPTIONS].map((o) => [o.value, o.label])
);

/** What a player reads for a stored goal, focus area or strength; unknown values show as stored. */
export function chipLabel(value: string): string {
  return LABELS.get(value) ?? value;
}

/** A saved focus area as a player reads it, old names included. */
export function focusAreaLabel(stored: string): string {
  return chipLabel(currentFocusArea(stored));
}
