// src/lib/competition-server.ts
// SERVER-ONLY: reading a player's competition state and emailing a parent
// (00067). The rules themselves are in src/lib/competition.ts.
//
// Which client: the player's own rows (entry, age answer, profile, sessions,
// coach setup) are read with their own server client, so row-level security
// applies. Whether a coach's team has a player who trained needs other
// players' sessions, so that one count is read with the admin client and only
// the count leaves this file. Every write is the admin client, from a route
// that has already checked the signed-in user.
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { emailConfigured, sendEmail } from '@/lib/email';
import { firstName } from '@/lib/parentApproval';
import { entriesOpen, entryRoute, isAdultCoach, parentEmail, retentionStep, type AgeFacts, type EntryRoute, type RetentionStep } from '@/lib/competition';
import type { EntryStatus } from '@/lib/supabase/types';

type Admin = ReturnType<typeof createAdminClient>;

/** An entry as the player may see it: no parent token, no winner mark. */
export type OwnEntry = {
  id: string;
  kind: 'player' | 'club';
  team_id: string | null;
  club_name: string | null;
  feedback: string;
  status: EntryStatus;
  parent_email: string | null;
  parent_token_sent_at: string | null;
  parent_decided_at: string | null;
};

export const OWN_ENTRY_COLUMNS =
  'id, kind, team_id, club_name, feedback, status, parent_email, parent_token_sent_at, parent_decided_at' as const;

export type CoachTeam = { id: string; name: string; clubName: string | null; playersWhoTrained: number };

export type CompetitionState = {
  route: EntryRoute;
  facts: AgeFacts;
  /** The parent who approved an under-16 account, greeted by name in the email */
  accountParentName: string | null;
  hasSession: boolean;
  playerEntry: OwnEntry | null;
  clubEntry: OwnEntry | null;
  /** Teams this account head-coaches, when it is an adult coach; null for everyone else */
  coachTeams: CoachTeam[] | null;
  coachClubName: string | null;
};

/** Everything /competition and the entry routes need about one signed-in user. */
export async function loadCompetitionState(userId: string): Promise<CompetitionState> {
  const supabase = await createClient();
  const [entries, ageCheck, profile, sessions, coach] = await Promise.all([
    supabase.from('competition_entries').select(OWN_ENTRY_COLUMNS).eq('user_id', userId),
    supabase.from('age_checks').select('is_16_plus, consent_status, parent_name, parent_email').eq('user_id', userId).maybeSingle(),
    supabase.from('profiles').select('age_bracket').eq('id', userId).maybeSingle(),
    supabase.from('training_sessions').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('coach_profiles').select('is_adult, club_name').eq('user_id', userId).maybeSingle(),
  ]);

  const facts: AgeFacts = { ageCheck: ageCheck.data ?? null, ageBracket: profile.data?.age_bracket ?? null };
  const own = (entries.data ?? []) as OwnEntry[];
  const adultCoach = isAdultCoach(coach.data ?? null, facts);

  return {
    route: entryRoute(facts),
    facts,
    accountParentName: ageCheck.data?.parent_name ?? null,
    hasSession: (sessions.count ?? 0) > 0,
    playerEntry: own.find((e) => e.kind === 'player') ?? null,
    clubEntry: own.find((e) => e.kind === 'club') ?? null,
    coachTeams: adultCoach ? await headCoachTeams(userId) : null,
    coachClubName: coach.data?.club_name ?? null,
  };
}

/** The teams a user is head coach of, with how many of their players have logged a session. */
async function headCoachTeams(userId: string): Promise<CoachTeam[]> {
  const admin = createAdminClient();
  const { data: mine } = await admin
    .from('team_members')
    .select('team_id, teams(name, club_name)')
    .eq('user_id', userId)
    .eq('role', 'coach');
  const teamIds = (mine ?? []).map((m) => m.team_id);
  if (!teamIds.length) return [];

  const { data: players } = await admin.from('team_members').select('team_id, user_id').in('team_id', teamIds).eq('role', 'player');
  const playerIds = [...new Set((players ?? []).map((p) => p.user_id))];
  const trained = new Set<string>();
  if (playerIds.length) {
    const { data: sessions } = await admin.from('training_sessions').select('user_id').in('user_id', playerIds).limit(5000);
    for (const s of sessions ?? []) trained.add(s.user_id);
  }

  return (mine ?? []).map((m) => {
    const team = (Array.isArray(m.teams) ? m.teams[0] : m.teams) as { name: string; club_name: string | null } | null;
    return {
      id: m.team_id,
      name: team?.name ?? 'Team',
      clubName: team?.club_name ?? null,
      playersWhoTrained: (players ?? []).filter((p) => p.team_id === m.team_id && trained.has(p.user_id)).length,
    };
  });
}

/**
 * The daily housekeeping for competition entries (api/cron/reminders), so
 * the deletion dates in the rules and privacy policy happen on schedule.
 * retentionStep decides what today calls for; each step also does the ones
 * before it. Errors are counted and returned with the cron run.
 */
export async function applyCompetitionRetention(admin: Admin, now = new Date()): Promise<{ step: RetentionStep; failed: number }> {
  const step = retentionStep(now);
  if (step === 'none') return { step, failed: 0 };
  const table = () => admin.from('competition_entries');
  let failed = 0;
  if (step === 'delete-all') {
    const { error } = await table().delete().not('id', 'is', null);
    if (error) failed++;
  } else {
    const { error } = await table().update({ parent_token: null }).not('parent_token', 'is', null);
    if (error) failed++;
    if (step === 'clear-parent-details') {
      const { error: detailsError } = await table()
        .update({ parent_email: null, parent_name: null })
        .not('parent_email', 'is', null);
      if (detailsError) failed++;
    }
  }
  if (failed > 0) console.error(`Competition entry clean-up (${step}): ${failed} step(s) failed`);
  return { step, failed };
}

export type SendResult = 'sent' | 'off' | 'failed';

/**
 * Gives the entry a new parent link and emails it. The new token is saved
 * before the email goes and parent_token_sent_at only after, so a failed
 * email leaves the entry on the owner page's "not sent" list rather than
 * looking sent. Any older link stops working. The link is never returned:
 * shown to a player under 18, they could approve their own entry.
 */
export async function sendParentLink(admin: Admin, entryId: string, origin: string): Promise<SendResult> {
  // Nothing is emailed before launch or after closing (S4)
  if (!emailConfigured() || !entriesOpen()) return 'off';
  const { data: entry } = await admin
    .from('competition_entries')
    .select('user_id, parent_name, parent_email, status')
    .eq('id', entryId)
    .maybeSingle();
  if (!entry?.parent_email || entry.status === 'valid') return 'failed';

  const token = crypto.randomUUID();
  const { error } = await admin
    .from('competition_entries')
    .update({ parent_token: token, parent_token_sent_at: null, updated_at: new Date().toISOString() })
    .eq('id', entryId);
  if (error) {
    console.error('Competition: saving a parent link failed', error);
    return 'failed';
  }

  const [{ data: profile }, { data: age }] = await Promise.all([
    admin.from('profiles').select('display_name').eq('id', entry.user_id).maybeSingle(),
    admin.from('age_checks').select('is_16_plus').eq('user_id', entry.user_id).maybeSingle(),
  ]);
  const mail = parentEmail({
    child: firstName(profile?.display_name),
    parentName: entry.parent_name,
    origin,
    token,
    // Under 16 the entry goes to the parent who approved the account; 16 and 17 typed this address
    accountParent: age?.is_16_plus === false,
  });
  try {
    await sendEmail({ to: entry.parent_email, ...mail });
  } catch (err) {
    console.error('Competition: parent email failed', err);
    return 'failed';
  }
  await admin.from('competition_entries').update({ parent_token_sent_at: new Date().toISOString() }).eq('id', entryId);
  return 'sent';
}
