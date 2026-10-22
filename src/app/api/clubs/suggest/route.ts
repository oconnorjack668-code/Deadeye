// src/app/api/clubs/suggest/route.ts
// "My club is not listed": the player names their club and where it is, and
// the founder sees it in Owner tools → Clubs to add to the directory. At most
// 5 open suggestions per player, and no contact details.
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { SUGGESTION_OPEN_MAX, checkSuggestion } from '@/lib/clubs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: 'Please log in again.' }, { status: 401 });
  const suggestion = checkSuggestion((await request.json().catch(() => null)) ?? {});
  if ('error' in suggestion) return Response.json({ error: suggestion.error }, { status: 400 });

  const admin = createAdminClient();
  const { count } = await admin
    .from('club_suggestions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('resolved', false);
  if ((count ?? 0) >= SUGGESTION_OPEN_MAX) {
    return Response.json({ error: 'Thanks, we already have your suggestions and will add them soon.' }, { status: 429 });
  }

  const { error } = await admin.from('club_suggestions').insert({
    user_id: user.id,
    club_name: suggestion.clubName,
    town: suggestion.town,
    county: suggestion.county,
  });
  if (error) return Response.json({ error: 'That did not send. Try again.' }, { status: 500 });
  return Response.json({ sent: true });
}
