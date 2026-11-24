// src/lib/competition.ts
// The founding competition (docs/sales/founding-competition-rules.md, and the
// table in supabase/migrations/00067_feedback_and_competition.sql). This file
// is the pure part: when it closes, who needs a parent's permission, what a
// valid entry looks like, and what a parent's link may still do. The routes
// and pages call these, so the rules are tested without a database.
import type { AgeBracket, ConsentStatus, EntryStatus } from './supabase/types';
import { isAdultBracket, isMinorBracket } from './ageBracket';
import { CONFIRM_LINK_DAYS, olderThanDays, parseParentDetails, type ParentDetails } from './parentApproval';

/**
 * Entries close at 23:59 Irish time on 31 December 2026 (rules section 5).
 * Ireland is on GMT (UTC+0) in winter, so the first moment after 23:59:59 in
 * Dublin is midnight UTC. An entry counts while now is before this.
 */
export const COMPETITION_CLOSES_AT = new Date('2027-01-01T00:00:00Z');

/** Shown wherever the closing time is written, so it is the same everywhere. */
export const CLOSING_TEXT = '23:59 Irish time on 31 December 2026';

/** Judging finishes by this date (rules section 7). */
export const JUDGED_BY_TEXT = '15 January 2027';

/** The 25% offer for everyone who enters runs until this date (rules section 8). */
export const OFFER_ENDS_TEXT = '31 March 2027';

export function isCompetitionOpen(now: Date = new Date()): boolean {
  return now.getTime() < COMPETITION_CLOSES_AT.getTime();
}

/**
 * The launch switch, off by default: COMPETITION_LIVE=1 in the environment.
 * The founder turns it on once the solicitor, the promoter, billing and the
 * email domain are ready (the checklist in the rules doc). Until then
 * /competition shows the rules and prizes with "Opening soon", and nothing
 * takes or emails an entry.
 */
export function competitionLive(): boolean {
  return process.env.COMPETITION_LIVE === '1';
}

/** Entries are offered, taken, changed and emailed only while live and before closing. */
export function entriesOpen(now: Date = new Date()): boolean {
  return competitionLive() && isCompetitionOpen(now);
}

// ---------------------------------------------------------------------------
// How long entry data is kept (rules section 10, privacy policy)
// ---------------------------------------------------------------------------

/** Parent links stop being needed at closing: the tokens are cleared then. */
export const TOKENS_CLEARED_FROM = COMPETITION_CLOSES_AT;
/** After the 25% offer ends on 31 March 2027 (Irish time, which is UTC+1 then), parent names and emails go. */
export const PARENT_DETAILS_CLEARED_FROM = new Date('2027-03-31T23:00:00Z');
/** 6 months after the offer ends: the whole entry list is deleted, by 30 September 2027 (Irish time, UTC+1). */
export const ENTRIES_DELETED_FROM = new Date('2027-09-30T23:00:00Z');
/** The latest date a parent's email is kept, as the email and privacy policy say. */
export const PARENT_EMAIL_GONE_TEXT = '30 September 2027';

export type RetentionStep = 'none' | 'clear-tokens' | 'clear-parent-details' | 'delete-all';

/** What the daily housekeeping does to competition_entries today. Each step includes the ones before it. */
export function retentionStep(now: Date = new Date()): RetentionStep {
  const t = now.getTime();
  if (t >= ENTRIES_DELETED_FROM.getTime()) return 'delete-all';
  if (t >= PARENT_DETAILS_CLEARED_FROM.getTime()) return 'clear-parent-details';
  if (t >= TOKENS_CLEARED_FROM.getTime()) return 'clear-tokens';
  return 'none';
}

export const FEEDBACK_MIN = 30;
export const FEEDBACK_MAX = 2000;

type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/** The feedback box: one thing they liked and one they would change, 30 to 2000 characters. */
export function parseFeedback(value: unknown): Parsed<string> {
  const text = typeof value === 'string' ? value.replace(/\r\n/g, '\n').trim() : '';
  if (text.length < FEEDBACK_MIN) {
    return { ok: false, error: `Tell us a bit more: at least ${FEEDBACK_MIN} characters, one thing you liked and one you would change.` };
  }
  if (text.length > FEEDBACK_MAX) return { ok: false, error: `That is over ${FEEDBACK_MAX} characters. Please shorten it a little.` };
  return { ok: true, value: text };
}

// ---------------------------------------------------------------------------
// Who needs a parent (rules section 9)
// ---------------------------------------------------------------------------

export type AgeFacts = {
  /** The player's age_checks row (00036), or null when they never answered */
  ageCheck: { is_16_plus: boolean; consent_status: ConsentStatus; parent_email: string | null } | null;
  ageBracket: AgeBracket | null;
};

/**
 * How a player's entry is handled:
 *  - adult: 18 or over, the entry counts straight away.
 *  - under16: email the parent who approved the account.
 *  - ask-parent: 16 or 17: the form asks for a parent or guardian, then
 *    emails them.
 *  - answer-age: no age answer yet, so the app asks first.
 *  - needs-account-approval: under 16 and the account is not approved, or no
 *    approving parent's email is on file, so there is nobody to ask.
 *
 * Under 18 is the age range 13-15 or 16-17 (or the older 13 and 14-17). A player who said they are 16 or
 * over but never picked an age range might be 16, so they are treated as under
 * 18 until they add one: a parent asked once too often is better than a
 * 16-year-old entered with nobody asked.
 */
export type EntryRoute = 'adult' | 'under16' | 'ask-parent' | 'answer-age' | 'needs-account-approval';

export function entryRoute({ ageCheck, ageBracket }: AgeFacts): EntryRoute {
  if (!ageCheck) return 'answer-age';
  if (!ageCheck.is_16_plus) {
    if (ageCheck.consent_status !== 'approved') return 'needs-account-approval';
    // The approving parent is the only one asked: with none on file, typing any
    // address would let a child name anyone, so the entry waits instead
    return ageCheck.parent_email ? 'under16' : 'needs-account-approval';
  }
  if (isAdultBracket(ageBracket)) return 'adult';
  return 'ask-parent';
}

/** The status a new player entry starts with. */
export function initialStatus(route: EntryRoute): EntryStatus {
  return route === 'adult' ? 'valid' : 'pending_parent';
}

/** Under 16 with no approving parent's email on file: said honestly, rather than asking for any address. */
export const NO_APPROVING_PARENT =
  'We need the parent or guardian who approved your account to say yes, and we do not have their email address. Ask them to email us at the address in section 1 of the rules below, and we will sort it out.';

export type PlayerEntryInput = { feedback: string; parent: ParentDetails | null };

/**
 * Checks a player's entry form. route decides whether a parent's name and
 * email are needed; the player's own email is refused as the parent's.
 */
export function parsePlayerEntry(body: unknown, route: EntryRoute, playerEmail: string | null): Parsed<PlayerEntryInput> {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  if (route === 'answer-age') return { ok: false, error: 'Answer the age question in the app first.' };
  if (route === 'needs-account-approval') return { ok: false, error: NO_APPROVING_PARENT };
  if (b.agree !== true) return { ok: false, error: 'Please tick the box to agree to the rules.' };
  const feedback = parseFeedback(b.feedback);
  if (!feedback.ok) return feedback;
  if (route !== 'ask-parent') return { ok: true, value: { feedback: feedback.value, parent: null } };
  // parseParentDetails asks a parent to tick "I am their parent"; here the player
  // fills it in, so that tick does not apply
  if (b.parentConfirm !== true) return { ok: false, error: 'Please tick the box to confirm this is your parent or guardian’s email, not yours.' };
  const parent = parseParentDetails({ parentName: b.parentName, parentEmail: b.parentEmail, agree: true }, playerEmail);
  if (!parent.ok) {
    return { ok: false, error: parent.error === 'Please enter your full name.' ? 'Please enter your parent or guardian’s full name.' : parent.error };
  }
  return { ok: true, value: { feedback: feedback.value, parent: parent.value } };
}

// ---------------------------------------------------------------------------
// Club entries (rules section 4)
// ---------------------------------------------------------------------------

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Words that do not tell one club from another: "Wexford Wildcats BC" is "Wexford Wildcats Basketball Club". */
const CLUB_FILLER = new Set(['the', 'basketball', 'club', 'bc', 'bball', 'cumann', 'cispheile', 'ciseail']);

/** The club name folded, so one club cannot enter twice under two spellings. */
export function normaliseClubName(name: string): string {
  const words = name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
  const kept = words.filter((w) => !CLUB_FILLER.has(w));
  return (kept.length ? kept : words).join(' ').slice(0, 80);
}

/**
 * A club is entered by a coach who said they are 18 or over at coach setup
 * (coach_profiles.is_adult, which also means they confirmed Garda vetting),
 * and nothing else about the account says under 18.
 */
export function isAdultCoach(coach: { is_adult: boolean } | null, facts: AgeFacts): boolean {
  if (!coach?.is_adult) return false;
  if (facts.ageCheck && !facts.ageCheck.is_16_plus) return false;
  return !isMinorBracket(facts.ageBracket);
}

export type ClubEntryInput ={ clubName: string; clubKey: string; teamId: string; feedback: string };

export function parseClubEntry(body: unknown): Parsed<ClubEntryInput> {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const clubName = typeof b.clubName === 'string' ? b.clubName.trim().replace(/\s+/g, ' ') : '';
  if (clubName.length < 2 || clubName.length > 80) return { ok: false, error: 'Please enter the club’s name.' };
  const clubKey = normaliseClubName(clubName);
  if (!clubKey) return { ok: false, error: 'Please enter the club’s name.' };
  if (typeof b.teamId !== 'string' || !UUID.test(b.teamId)) return { ok: false, error: 'Pick the team you are entering with.' };
  if (b.clubKnows !== true) return { ok: false, error: 'Please confirm the club knows about this entry.' };
  if (b.agree !== true) return { ok: false, error: 'Please tick the box to agree to the rules.' };
  const feedback = parseFeedback(b.feedback);
  if (!feedback.ok) return feedback;
  return { ok: true, value: { clubName, clubKey, teamId: b.teamId, feedback: feedback.value } };
}

// ---------------------------------------------------------------------------
// The parent's link
// ---------------------------------------------------------------------------

export type ParentLinkFacts = {
  status: EntryStatus;
  parent_token_sent_at: string | null;
  parent_decided_at: string | null;
};

/**
 * not-sent: no email has gone yet (email not set up, or it failed).
 * live: the parent can answer. decided: they answered, and may still change
 * their mind until closing. expired: sent over CONFIRM_LINK_DAYS ago with no
 * answer. closed: after the closing time nothing changes. none: no parent needed.
 */
export type ParentLinkState = 'none' | 'not-sent' | 'live' | 'decided' | 'expired' | 'closed';

export function parentLinkState(entry: ParentLinkFacts, now: Date = new Date()): ParentLinkState {
  if (entry.status === 'valid' && !entry.parent_decided_at) return 'none';
  if (!isCompetitionOpen(now)) return 'closed';
  if (entry.parent_decided_at) return 'decided';
  if (!entry.parent_token_sent_at) return 'not-sent';
  return olderThanDays(entry.parent_token_sent_at, CONFIRM_LINK_DAYS, now) ? 'expired' : 'live';
}

/** What a parent pressing approve or decline on their link does, or why it cannot. */
export function parentDecision(
  entry: ParentLinkFacts,
  decision: unknown,
  now: Date = new Date()
): { ok: true; status: EntryStatus } | { ok: false; error: string } {
  if (decision !== 'approve' && decision !== 'decline') return { ok: false, error: 'This link is not valid.' };
  const state = parentLinkState(entry, now);
  if (state === 'closed') return { ok: false, error: 'The competition has closed, so this entry can no longer change.' };
  if (state === 'expired') return { ok: false, error: `This link is more than ${CONFIRM_LINK_DAYS} days old. Ask your child to send a new one from the competition page.` };
  if (state === 'not-sent' || state === 'none') return { ok: false, error: 'This link is not valid.' };
  return { ok: true, status: decision === 'approve' ? 'valid' : 'declined' };
}

/** The player may ask for a new link once the old one ran out unanswered. Once a week at most, by design. */
export function canResendParentLink(entry: ParentLinkFacts, now: Date = new Date()): boolean {
  return entry.status === 'pending_parent' && parentLinkState(entry, now) === 'expired';
}

/** What the player sees about their own entry. Never the link itself. */
export function entryStatusText(entry: ParentLinkFacts, emailOn: boolean, now: Date = new Date()): string {
  if (entry.status === 'valid') return 'You are entered. Good luck!';
  if (entry.status === 'declined') return 'Your parent or guardian said no, so this entry does not count.';
  const state = parentLinkState(entry, now);
  if (state === 'not-sent') {
    return emailOn
      ? 'Waiting for your parent or guardian. We could not email them yet and will try again soon.'
      : 'Waiting for your parent or guardian. We’ll email them as soon as we can.';
  }
  if (state === 'expired') return 'Your parent or guardian has not answered, and the link we sent has run out.';
  if (state === 'closed') return 'Your parent or guardian did not answer before the competition closed.';
  return 'Waiting for your parent or guardian. We emailed them a link to approve your entry.';
}

/**
 * The plain-text email to a parent, in the tone of the account and photo
 * emails. accountParent: under 16, so this is the parent who approved the
 * account; otherwise a 16 or 17 year old typed this address. origin is the
 * address the request came in on (no host is written into the code).
 */
export function parentEmail({
  child,
  parentName,
  origin,
  token,
  accountParent,
}: {
  child: string;
  parentName: string | null;
  origin: string;
  token: string;
  accountParent: boolean;
}): { subject: string; text: string } {
  return {
    subject: `${child} would like to enter the Deadeye founding competition`,
    text: [
      parentName ? `Hi ${parentName},` : 'Hi,',
      '',
      `${child} has entered the founding competition on Deadeye, the basketball training app. Players under 18 need a parent or guardian's permission, so the entry only counts if you approve it.`,
      '',
      accountParent
        ? `You are the parent or guardian who approved ${child}'s Deadeye account.`
        : `${child} gave us your email address to ask your permission.`,
      '',
      `It is free: nobody pays anything to enter, to win or to claim a prize. Ten players win Deadeye Pro for life, chosen by judging the most useful feedback about the app, not by a draw. Everyone else who enters gets 25% off their first year of Pro, which nobody has to buy. Entries close at ${CLOSING_TEXT}, and ${child} can change their feedback until then.`,
      '',
      `The entry uses ${child}'s Deadeye account, the training they log and the feedback they wrote. If ${child} wins, we contact you, not them. A winner's name is only published with permission, and never a child's full name or photo.`,
      '',
      `We keep this copy of your email address with the entry only for this competition and delete it by ${PARENT_EMAIL_GONE_TEXT} at the latest. How we handle data: ${origin}/privacy`,
      '',
      `Approve or decline here within ${CONFIRM_LINK_DAYS} days:`,
      '',
      `${origin}/parents/competition/${token}`,
      '',
      'Keep this email: the same link lets you change your mind until the competition closes. The full rules are on the competition page.',
      '',
      `If you are not ${child}'s parent or guardian, press Decline or ignore this email, and the entry will not count. If you do not answer, the entry does not count either.`,
    ].join('\n'),
  };
}

// ---------------------------------------------------------------------------
// The judging list
// ---------------------------------------------------------------------------

export type JudgingRow = {
  ref: string;
  kind: 'player' | 'club';
  name: string | null;
  feedback: string;
  status: EntryStatus;
  created_at: string;
  winner: boolean;
};

function csvCell(value: string): string {
  // A cell starting with = + - @ runs as a formula in a spreadsheet
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** The entries as CSV. Names only when asked: entries are judged without them (rules section 7). */
export function judgingCsv(rows: JudgingRow[], withNames: boolean): string {
  const head = ['ref', 'kind', ...(withNames ? ['name'] : []), 'status', 'entered', 'winner', 'feedback'];
  const lines = rows.map((r) =>
    [r.ref, r.kind, ...(withNames ? [r.name ?? ''] : []), r.status, r.created_at.slice(0, 10), r.winner ? 'yes' : '', r.feedback]
      .map(csvCell)
      .join(',')
  );
  return [head.join(','), ...lines].join('\r\n') + '\r\n';
}
