// src/lib/film/access.ts
// SERVER: the questions the film pages ask about the signed-in user, run
// with their own Supabase client so row-level security still decides what
// comes back. Kept here so the pages and the server actions ask them the
// same way.
import type { createClient } from '@/lib/supabase/server';
import { FILM_CLIP_COLUMNS, toClip, type FilmClip, type FilmClipRow } from './rows';

type Client = Awaited<ReturnType<typeof createClient>>;

/**
 * Whether a clip reaches this user from their coach (set for one of their
 * teams, on its own or in a pack) and whether it is in a free library pack.
 * Row-level security only returns assignments for their teams, and packs
 * they can read.
 */
export async function clipAccess(supabase: Client, clipId: string): Promise<{ assigned: boolean; inFreePack: boolean }> {
  const [{ data: direct }, { data: inPacks }] = await Promise.all([
    supabase.from('team_assignments').select('id').eq('film_clip_id', clipId).limit(1),
    supabase.from('film_pack_clips').select('pack_id').eq('clip_id', clipId),
  ]);
  const packIds = (inPacks ?? []).map((r) => r.pack_id);
  if ((direct ?? []).length > 0) return { assigned: true, inFreePack: false };
  if (!packIds.length) return { assigned: false, inFreePack: false };
  const [{ data: viaPack }, { data: freePacks }] = await Promise.all([
    supabase.from('team_assignments').select('id').in('film_pack_id', packIds).limit(1),
    supabase.from('film_packs').select('id').in('id', packIds).is('owner_id', null).eq('is_free', true).limit(1),
  ]);
  return { assigned: (viaPack ?? []).length > 0, inFreePack: (freePacks ?? []).length > 0 };
}

/** Whether a pack is set for one of this user's teams. */
export async function packAssigned(supabase: Client, packId: string): Promise<boolean> {
  const { data } = await supabase.from('team_assignments').select('id').eq('film_pack_id', packId).limit(1);
  return (data ?? []).length > 0;
}

export interface CoachFilm {
  clips: Array<{ assignmentId: string; title: string; dueDate: string | null; clip: FilmClip }>;
  packs: Array<{ assignmentId: string; title: string; dueDate: string | null; packId: string; packTitle: string; clipIds: string[] }>;
}

/**
 * Film the player's coaches set for the teams they play on: clips and packs,
 * newest first, five of each at most. Empty before 00062 has run (the
 * queries fail and read as nothing).
 */
export async function coachFilmFor(supabase: Client, userId: string): Promise<CoachFilm> {
  const empty: CoachFilm = { clips: [], packs: [] };
  const { data: teams } = await supabase.from('team_members').select('team_id').eq('user_id', userId).eq('role', 'player');
  const teamIds = (teams ?? []).map((t) => t.team_id);
  if (!teamIds.length) return empty;

  // '*' so the query still works before the film columns exist
  const { data: assignments } = await supabase
    .from('team_assignments')
    .select('*')
    .in('team_id', teamIds)
    .order('created_at', { ascending: false })
    .limit(30);
  const clipRows = (assignments ?? []).filter((a) => a.film_clip_id).slice(0, 5);
  const packRows = (assignments ?? []).filter((a) => a.film_pack_id).slice(0, 5);
  const clipIds = [...new Set(clipRows.map((a) => a.film_clip_id as string))];
  const packIds = [...new Set(packRows.map((a) => a.film_pack_id as string))];
  if (!clipIds.length && !packIds.length) return empty;

  const [{ data: clips }, { data: packs }, { data: packClips }] = await Promise.all([
    clipIds.length
      ? (supabase.from('film_clips').select(FILM_CLIP_COLUMNS).in('id', clipIds) as unknown as Promise<{ data: FilmClipRow[] | null }>)
      : Promise.resolve({ data: [] as FilmClipRow[] }),
    packIds.length ? supabase.from('film_packs').select('id, title').in('id', packIds) : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
    packIds.length
      ? supabase.from('film_pack_clips').select('pack_id, clip_id, position').in('pack_id', packIds).order('position')
      : Promise.resolve({ data: [] as Array<{ pack_id: string; clip_id: string; position: number }> }),
  ]);
  const clipById = new Map<string, FilmClip>();
  for (const row of clips ?? []) {
    const clip = toClip(row);
    if (clip) clipById.set(clip.id, clip);
  }
  const packById = new Map((packs ?? []).map((p) => [p.id, p.title]));
  return {
    clips: clipRows.flatMap((a) => {
      const clip = clipById.get(a.film_clip_id as string);
      return clip ? [{ assignmentId: a.id, title: a.title, dueDate: a.due_date, clip }] : [];
    }),
    packs: packRows.flatMap((a) => {
      const packTitle = packById.get(a.film_pack_id as string);
      if (packTitle === undefined) return [];
      const ids = (packClips ?? []).filter((c) => c.pack_id === a.film_pack_id).map((c) => c.clip_id);
      return [{ assignmentId: a.id, title: a.title, dueDate: a.due_date, packId: a.film_pack_id as string, packTitle, clipIds: ids }];
    }),
  };
}

/** The clips this player has answered at least once. */
export async function doneClipIds(supabase: Client, userId: string): Promise<Set<string>> {
  const { data } = await supabase.from('film_attempts').select('clip_id').eq('user_id', userId);
  return new Set((data ?? []).map((r) => r.clip_id));
}
