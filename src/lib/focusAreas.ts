// src/lib/focusAreas.ts
// Focus areas renamed on 21 Oct 2026 for plainer words. Older profiles still
// hold the old names; onboarding maps them on load so they show as selected,
// and the profile shows the new name (recommend.ts still reads both).
export const RENAMED_FOCUS_AREAS: Record<string, string> = {
  'Shooting Arc & Kinetic Dip': 'Shooting Arc & Dip',
  'Ankle & Knee Deceleration Durability': 'Strong Ankles & Knees',
};

export function focusAreaLabel(area: string): string {
  return RENAMED_FOCUS_AREAS[area] ?? area;
}
