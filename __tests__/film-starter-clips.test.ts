// @vitest-environment node
// __tests__/film-starter-clips.test.ts
// The starter clips seeded by 00064: every row must pass the same checks the
// owner tool and the clip page use, so no seeded question is silently dropped.
import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { parseFilmQuestions } from '@/lib/film/questions';

const SQL = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '00064_film_starter_clips.sql'), 'utf8');
const ROW = /^\s*\(\$q\$([A-Za-z0-9_-]{11})\$q\$, (\d+), (\d+), \$q\$(.+?)\$q\$, \$q\$(.+?)\$q\$, \$q\$(\w+)\$q\$, \$q\$(\w+)\$q\$, \$q\$(\[.*\])\$q\$::jsonb\),?$/gm;
const rows = [...SQL.matchAll(ROW)].map((m) => ({
  id: m[1],
  start: Number(m[2]),
  end: Number(m[3]),
  title: m[4],
  theme: m[6],
  level: m[7],
  questions: JSON.parse(m[8]) as unknown[],
}));

describe('00064 starter clips', () => {
  it('seeds 39 different videos across all 8 themes', () => {
    expect(rows).toHaveLength(39);
    expect(new Set(rows.map((r) => r.id)).size).toBe(39);
    expect(new Set(rows.map((r) => r.theme))).toEqual(
      new Set(['spacing', 'help_defence', 'closeouts', 'pick_and_roll', 'transition', 'out_of_bounds', 'press', 'shot_selection']),
    );
  });

  it('keeps every clip to 10 minutes and every question valid for its clip', () => {
    for (const r of rows) {
      expect(r.end - r.start).toBeGreaterThan(0);
      expect(r.end - r.start).toBeLessThanOrEqual(600);
      expect(['beginner', 'intermediate', 'advanced']).toContain(r.level);
      expect(parseFilmQuestions(r.questions, r.start, r.end)).toHaveLength(r.questions.length);
      expect(r.questions.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('adds no Jr. NBA video (likely Made for Kids) and is safe to run again', () => {
    const channels = [...SQL.matchAll(ROW)].map((m) => m[5]);
    expect(channels).toHaveLength(39);
    expect(channels.some((c) => /Jr\. NBA/.test(c))).toBe(false);
    expect(SQL).toMatch(/WHERE NOT EXISTS \(SELECT 1 FROM public\.film_clips c WHERE c\.youtube_video_id = v\.youtube_video_id\)/);
  });
});
