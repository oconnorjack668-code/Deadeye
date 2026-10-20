// src/lib/drills.ts
export const DRILL_SKILLS = [
  { id: 'shooting', label: 'Shooting' },
  { id: 'ball_handling', label: 'Ball Handling' },
  { id: 'finishing', label: 'Finishing' },
  { id: 'footwork', label: 'Footwork' },
  { id: 'passing', label: 'Passing' },
  { id: 'defense', label: 'Defense' },
  { id: 'rebounding', label: 'Rebounding' },
  { id: 'post_play', label: 'Post Play' },
  { id: 'conditioning', label: 'Conditioning' },
  { id: 'iq', label: 'IQ' },
] as const;

export const DRILL_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export const DRILL_PLAYERS = ['solo', 'partner', 'team'] as const;

export interface Drill {
  id: string;
  slug: string;
  name: string;
  skill: string;
  sub_skill: string;
  level: string;
  players: string;
  equipment: string[];
  duration_minutes: number;
  reps: string;
  setup: string;
  instructions: string[];
  coaching_cues: string[];
  common_mistakes: string[];
  tracks_makes: boolean;
  /** A YouTube video id the owner chose (00042); missing before that migration. */
  demo_video_id?: string | null;
}

export function skillLabel(id: string): string {
  return DRILL_SKILLS.find((s) => s.id === id)?.label || id;
}

/** Session drill_category (session_drills CHECK) for a library skill. */
export function sessionCategoryForSkill(skill: string): string {
  switch (skill) {
    case 'shooting':
      return 'shooting';
    case 'ball_handling':
      return 'ball-handling';
    case 'finishing':
    case 'post_play':
      return 'finishing';
    case 'footwork':
      return 'footwork';
    case 'passing':
      return 'passing';
    case 'defense':
      return 'defense';
    case 'conditioning':
      return 'conditioning';
    default:
      return 'other';
  }
}
