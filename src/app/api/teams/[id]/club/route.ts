// src/app/api/teams/[id]/club/route.ts
// A head coach asks for their team to join a club board, or takes it off
// (club_team_links, 00053). Only clubs in the list (src/data/clubs.json) can
// be asked for. The link stays pending until the founder approves it in
// Owner tools; the database checks the caller is a head coach.
import { getCurrentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { clubById } from '@/lib/clubs';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f-]{36}$/i;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  if (!UUID.test(id)) return Response.json({ error: 'No such team.' }, { status: 404 });
  const body = (await request.json().catch(() => null)) as { clubId?: unknown } | null;
  const supabase = await createClient();

  if (body?.clubId === null) {
    const { error } = await supabase.rpc('remove_club_link', { p_team: id });
    if (error) return Response.json({ error: error.message }, { status: 403 });
    return Response.json({ link: null });
  }

  const club = clubById(typeof body?.clubId === 'string' ? body.clubId : null);
  if (!club) return Response.json({ error: 'Pick a club from the list.' }, { status: 400 });
  const { data, error } = await supabase.rpc('request_club_link', { p_team: id, p_club: club.id });
  if (error) return Response.json({ error: error.message }, { status: 403 });
  return Response.json({ link: { club_id: club.id, status: data } });
}
