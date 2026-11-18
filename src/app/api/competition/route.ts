// src/app/api/competition/route.ts
// Entering the founding competition (00067, rules in
// docs/sales/founding-competition-rules.md). POST enters, as a player or as a
// club; PATCH changes the feedback before the closing time.
//
// Everything is decided here on the server: the closing time, the age rules
// (src/lib/competition.ts), the session the rules ask for, and the coach's
// team. Then the admin client writes, because players have no write access to
// the table. The parent link is emailed, never returned.
import { getCurrentUser } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailConfigured } from '@/lib/email';
import { CLOSING_TEXT, competitionLive, initialStatus, isCompetitionOpen, parseClubEntry, parseFeedback, parsePlayerEntry } from '@/lib/competition';
import { loadCompetitionState, sendParentLink } from '@/lib/competition-server';

export const dynamic = 'force-dynamic';

const NOT_OPEN = 'The competition is not open for entries yet.';
const CLOSED = `The competition closed at ${CLOSING_TEXT}.`;
const DUPLICATE = 23505;

async function signedIn() {
  const user = await getCurrentUser().catch(() => null);
  if (!user) return { error: Response.json({ error: 'Log in to Deadeye to enter.' }, { status: 401 }) } as const;
  // The launch switch first: before launch nothing is taken, whatever the date
  if (!competitionLive()) return { error: Response.json({ error: NOT_OPEN }, { status: 403 }) } as const;
  if (!isCompetitionOpen()) return { error: Response.json({ error: CLOSED }, { status: 403 }) } as const;
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { error: Response.json({ error: 'Entries cannot be saved right now. Please try again later.' }, { status: 503 }) } as const;
  }
  return { user } as const;
}

export async function POST(request: Request) {
  const auth = await signedIn();
  if ('error' in auth) return auth.error;
  const { user } = auth;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const state = await loadCompetitionState(user.id);
  const admin = createAdminClient();

  if (body?.kind === 'club') {
    if (!state.coachTeams) return Response.json({ error: 'Clubs are entered by a head coach aged 18 or over.' }, { status: 403 });
    if (state.clubEntry) return Response.json({ error: 'You have already entered a club.' }, { status: 409 });
    const parsed = parseClubEntry(body);
    if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
    const team = state.coachTeams.find((t) => t.id === parsed.value.teamId);
    if (!team) return Response.json({ error: 'Pick one of the teams you coach.' }, { status: 400 });
    if (team.playersWhoTrained < 1) {
      return Response.json({ error: 'At least one player on this team needs to log a training session first.' }, { status: 400 });
    }
    const { error } = await admin.from('competition_entries').insert({
      user_id: user.id,
      kind: 'club',
      team_id: team.id,
      club_name: parsed.value.clubName,
      club_key: parsed.value.clubKey,
      club_knows: true,
      feedback: parsed.value.feedback,
      status: 'valid',
    });
    if (error) {
      if (Number(error.code) === DUPLICATE) {
        return Response.json({ error: 'This club or team has already been entered. One entry per club.' }, { status: 409 });
      }
      console.error('Competition: club entry failed', error);
      return Response.json({ error: 'Your entry could not be saved. Please try again.' }, { status: 500 });
    }
    return Response.json({ status: 'valid' }, { status: 201 });
  }

  if (state.playerEntry) return Response.json({ error: 'You have already entered. You can change your feedback below.' }, { status: 409 });
  if (!state.hasSession) return Response.json({ error: 'Log at least one training session first.' }, { status: 400 });
  const parsed = parsePlayerEntry(body, state.route, user.email);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });

  const status = initialStatus(state.route);
  const parent =
    status === 'valid'
      ? null
      : parsed.value.parent ?? { parentName: state.accountParentName, parentEmail: state.facts.ageCheck?.parent_email ?? null };
  const { data: row, error } = await admin
    .from('competition_entries')
    .insert({
      user_id: user.id,
      kind: 'player',
      feedback: parsed.value.feedback,
      status,
      parent_name: parent?.parentName ?? null,
      parent_email: parent?.parentEmail ?? null,
      // Saved now so the row is complete; sendParentLink swaps it for a fresh one as it emails
      parent_token: status === 'valid' ? null : crypto.randomUUID(),
    })
    .select('id')
    .single();
  if (error || !row) {
    if (error && Number(error.code) === DUPLICATE) {
      return Response.json({ error: 'You have already entered. You can change your feedback below.' }, { status: 409 });
    }
    console.error('Competition: player entry failed', error);
    return Response.json({ error: 'Your entry could not be saved. Please try again.' }, { status: 500 });
  }
  if (status === 'valid') return Response.json({ status }, { status: 201 });

  const sent = await sendParentLink(admin, row.id, new URL(request.url).origin);
  // Either way the entry is saved; without email it waits on the owner page
  return Response.json({ status, emailed: sent === 'sent', emailOn: emailConfigured() }, { status: 201 });
}

export async function PATCH(request: Request) {
  const auth = await signedIn();
  if ('error' in auth) return auth.error;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const kind = body?.kind === 'club' ? 'club' : 'player';
  const feedback = parseFeedback(body?.feedback);
  if (!feedback.ok) return Response.json({ error: feedback.error }, { status: 400 });

  const { data, error } = await createAdminClient()
    .from('competition_entries')
    .update({ feedback: feedback.value, updated_at: new Date().toISOString() })
    .eq('user_id', auth.user.id)
    .eq('kind', kind)
    .select('id');
  if (error) return Response.json({ error: 'Your feedback could not be saved. Please try again.' }, { status: 500 });
  if (!data?.length) return Response.json({ error: 'There is no entry to change yet.' }, { status: 404 });
  return Response.json({ ok: true });
}
