// src/app/api/profile/club/route.ts
// Sets, changes or clears the signed-in player's home club, and whether it
// shows on their player card (player_clubs, 00051). Only clubs in the list
// (src/data/clubs.json) can be saved.
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { clubById } from '@/lib/clubs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { clubId?: unknown; showOnCard?: unknown } | null;

  const admin = createAdminClient();
  // No club: "I'm not at a club"
  if (body?.clubId === null) {
    const { error } = await admin.from('player_clubs').delete().eq('user_id', user.id);
    if (error) return Response.json({ error: 'That did not save. Try again.' }, { status: 500 });
    return Response.json({ club: null });
  }

  const club = clubById(typeof body?.clubId === 'string' ? body.clubId : null);
  if (!club) return Response.json({ error: 'Pick a club from the list.' }, { status: 400 });
  const { error } = await admin
    .from('player_clubs')
    .upsert({ user_id: user.id, club_id: club.id, show_on_card: body?.showOnCard === true, updated_at: new Date().toISOString() });
  if (error) return Response.json({ error: 'That did not save. Try again.' }, { status: 500 });
  return Response.json({ club: { id: club.id, showOnCard: body?.showOnCard === true } });
}
