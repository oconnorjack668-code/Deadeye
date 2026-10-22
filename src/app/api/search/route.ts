// src/app/api/search/route.ts
// The content half of app search (src/lib/search.ts): drills, exercises, IQ
// lessons, programmes and guides whose name matches, five of each. Asked
// under the player's own session, so row-level security still decides what
// they see: a player's own custom exercises, never anyone else's. Players are
// not searchable. The search text is not stored anywhere.
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { cleanSearch, type SearchResult } from '@/lib/search';
import { skillLabel } from '@/lib/drills';
import { MUSCLE_GROUPS } from '@/lib/exercises';

export const dynamic = 'force-dynamic';

const LIMIT = 5;

export interface ContentGroup {
  id: 'drills' | 'exercises' | 'lessons' | 'programmes' | 'guides';
  title: string;
  results: SearchResult[];
}

function muscleLabel(id: string | null): string {
  return MUSCLE_GROUPS.find((m) => m.id === id)?.label ?? 'Exercise';
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const q = cleanSearch(params.get('q'));
  if (!q || q.length < 2) return Response.json({ groups: [] });
  const coaching = params.get('mode') === 'coaching';
  // Sub-skills, skills and goals are stored with underscores
  const u = q.replace(/ /g, '_');

  const supabase = await createClient();
  const none = Promise.resolve({ data: null, error: null });
  const [drills, exercises, lessons, programmes, guides] = await Promise.all([
    supabase
      .from('drills')
      .select('slug, name, skill, level')
      .or(`name.ilike."*${q}*",sub_skill.ilike."*${u}*",skill.ilike."*${u}*"`)
      .order('name')
      .limit(LIMIT),
    coaching
      ? none
      : supabase
          .from('exercise_library')
          .select('id, name, primary_muscle')
          .or(`name.ilike."*${q}*",primary_muscle.ilike."*${u}*"`)
          .order('name')
          .limit(LIMIT),
    coaching
      ? none
      : supabase
          .from('study_topics')
          .select('id, title')
          .eq('is_active', true)
          .or(`title.ilike."*${q}*",description.ilike."*${q}*"`)
          .order('display_order')
          .limit(LIMIT),
    coaching
      ? none
      : supabase
          .from('training_programs')
          .select('slug, name, weeks')
          .or(`name.ilike."*${q}*",description.ilike."*${q}*",goal.ilike."*${u}*"`)
          .order('display_order')
          .limit(LIMIT),
    supabase
      .from('guides')
      .select('slug, title, reading_minutes')
      .or(`title.ilike."*${q}*",summary.ilike."*${q}*"`)
      .order('display_order')
      .limit(LIMIT),
  ]);

  // A table that errors (a migration not run) leaves its group out
  const groups: ContentGroup[] = [
    {
      id: 'drills',
      title: 'Drills',
      results: (drills.data ?? []).map((d) => ({ title: d.name, hint: `${skillLabel(d.skill)} drill · ${d.level}`, href: `/drills/${d.slug}` })),
    },
    {
      id: 'exercises',
      title: 'Exercises',
      results: (exercises.data ?? []).map((e) => ({
        title: e.name,
        hint: muscleLabel(e.primary_muscle),
        href: `/workouts/exercises?${e.primary_muscle ? `muscle=${encodeURIComponent(e.primary_muscle)}&` : ''}open=${e.id}#ex-${e.id}`,
      })),
    },
    {
      id: 'lessons',
      title: 'IQ lessons',
      results: (lessons.data ?? []).map((t) => ({ title: t.title, hint: 'Basketball IQ', href: `/study/${t.id}` })),
    },
    {
      id: 'programmes',
      title: 'Programmes',
      results: (programmes.data ?? []).map((p) => ({ title: p.name, hint: `${p.weeks}-week programme`, href: `/programs/${p.slug}` })),
    },
    {
      id: 'guides',
      title: 'Guides',
      results: (guides.data ?? []).map((g) => ({ title: g.title, hint: `${g.reading_minutes} min read`, href: `/guides/${g.slug}` })),
    },
  ];
  return Response.json(
    { groups: groups.filter((g) => g.results.length > 0) },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
