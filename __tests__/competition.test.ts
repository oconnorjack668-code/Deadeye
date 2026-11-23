// __tests__/competition.test.ts
// The founding competition's rules in code (src/lib/competition.ts): when it
// closes, who needs a parent, what an entry must contain, and what a parent's
// link may still do. Each case is a sentence of the rules
// (docs/sales/founding-competition-rules.md) that must stay true.
import { describe, it, expect, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  COMPETITION_CLOSES_AT,
  ENTRIES_DELETED_FROM,
  PARENT_DETAILS_CLEARED_FROM,
  competitionLive,
  entriesOpen,
  retentionStep,
  canResendParentLink,
  entryRoute,
  entryStatusText,
  initialStatus,
  isAdultCoach,
  isCompetitionOpen,
  judgingCsv,
  normaliseClubName,
  parentDecision,
  parentEmail,
  parentLinkState,
  parseClubEntry,
  parseFeedback,
  parsePlayerEntry,
  type AgeFacts,
} from '@/lib/competition';
import { COMPETITION_RULES, DELETE_PERIOD } from '@/lib/competitionRules';

const FEEDBACK = 'I liked the shot tracker. I would change how long the camera takes to start.';
const TEAM = '11111111-2222-4333-8444-555555555555';
const DAY = 86_400_000;

const adult: AgeFacts = { ageCheck: { is_16_plus: true, consent_status: 'not_needed', parent_email: null }, ageBracket: '18-22' };
const sixteen: AgeFacts = { ageCheck: { is_16_plus: true, consent_status: 'not_needed', parent_email: null }, ageBracket: '14-17' };
const under16: AgeFacts = { ageCheck: { is_16_plus: false, consent_status: 'approved', parent_email: 'mam@example.ie' }, ageBracket: '13' };

describe('the launch switch', () => {
  afterEach(() => vi.unstubAllEnvs());
  const before = new Date('2026-12-01T12:00:00Z');

  it('is off unless COMPETITION_LIVE is exactly 1', () => {
    vi.stubEnv('COMPETITION_LIVE', '');
    expect(competitionLive()).toBe(false);
    expect(entriesOpen(before)).toBe(false);
    vi.stubEnv('COMPETITION_LIVE', 'true');
    expect(competitionLive()).toBe(false);
    vi.stubEnv('COMPETITION_LIVE', '1');
    expect(competitionLive()).toBe(true);
    expect(entriesOpen(before)).toBe(true);
  });

  it('still closes at the closing time when live', () => {
    vi.stubEnv('COMPETITION_LIVE', '1');
    expect(entriesOpen(COMPETITION_CLOSES_AT)).toBe(false);
  });
});

describe('how long entry data is kept', () => {
  const dublin = (d: Date) => new Intl.DateTimeFormat('en-IE', { timeZone: 'Europe/Dublin', dateStyle: 'short', timeStyle: 'short' }).format(d);

  it('clears parent links at closing, parent details after 31 March 2027, and every entry after 30 September 2027 (Irish time)', () => {
    expect(retentionStep(new Date(COMPETITION_CLOSES_AT.getTime() - 1))).toBe('none');
    expect(retentionStep(COMPETITION_CLOSES_AT)).toBe('clear-tokens');
    expect(dublin(PARENT_DETAILS_CLEARED_FROM)).toBe('01/04/2027, 00:00');
    expect(retentionStep(new Date(PARENT_DETAILS_CLEARED_FROM.getTime() - 1))).toBe('clear-tokens');
    expect(retentionStep(PARENT_DETAILS_CLEARED_FROM)).toBe('clear-parent-details');
    expect(dublin(ENTRIES_DELETED_FROM)).toBe('01/10/2027, 00:00');
    expect(retentionStep(new Date(ENTRIES_DELETED_FROM.getTime() - 1))).toBe('clear-parent-details');
    expect(retentionStep(ENTRIES_DELETED_FROM)).toBe('delete-all');
  });
});

describe('the closing time (rules section 5)', () => {
  it('is 23:59 on 31 December 2026 in Dublin, and open up to the last second of it', () => {
    const lastSecond = new Date(COMPETITION_CLOSES_AT.getTime() - 1000);
    const dublin = (d: Date) =>
      new Intl.DateTimeFormat('en-IE', { timeZone: 'Europe/Dublin', dateStyle: 'short', timeStyle: 'medium' }).format(d);
    expect(dublin(lastSecond)).toBe('31/12/2026, 23:59:59');
    expect(isCompetitionOpen(lastSecond)).toBe(true);
    expect(isCompetitionOpen(COMPETITION_CLOSES_AT)).toBe(false);
    expect(isCompetitionOpen(new Date('2026-11-18T12:00:00Z'))).toBe(true);
  });
});

describe('who needs a parent (rules section 9)', () => {
  it('lets an adult in straight away', () => {
    expect(entryRoute(adult)).toBe('adult');
    expect(initialStatus('adult')).toBe('valid');
  });

  it('emails the approving parent of an under-16', () => {
    expect(entryRoute(under16)).toBe('under16');
    expect(initialStatus('under16')).toBe('pending_parent');
  });

  it('asks a 16 or 17 year old for a parent', () => {
    expect(entryRoute(sixteen)).toBe('ask-parent');
    expect(initialStatus('ask-parent')).toBe('pending_parent');
  });

  it('treats 16 or over with no age range as possibly under 18', () => {
    expect(entryRoute({ ...adult, ageBracket: null })).toBe('ask-parent');
  });

  it('never lets an under-16 type a parent address: with none on file, or no approved account, the entry waits', () => {
    expect(entryRoute({ ...under16, ageCheck: { ...under16.ageCheck!, parent_email: null } })).toBe('needs-account-approval');
    expect(entryRoute({ ...under16, ageCheck: { ...under16.ageCheck!, consent_status: 'pending' } })).toBe('needs-account-approval');
    expect(entryRoute({ ageCheck: null, ageBracket: '18-22' })).toBe('answer-age');
  });

  it('lets only an adult coach enter a club', () => {
    expect(isAdultCoach({ is_adult: true }, adult)).toBe(true);
    expect(isAdultCoach({ is_adult: false }, adult)).toBe(false);
    expect(isAdultCoach(null, adult)).toBe(false);
    expect(isAdultCoach({ is_adult: true }, sixteen)).toBe(false);
    expect(isAdultCoach({ is_adult: true }, under16)).toBe(false);
  });
});

describe('the entry form', () => {
  it('needs 30 to 2000 characters of feedback', () => {
    expect(parseFeedback('too short').ok).toBe(false);
    expect(parseFeedback('x'.repeat(2001)).ok).toBe(false);
    expect(parseFeedback(`  ${FEEDBACK}  `)).toEqual({ ok: true, value: FEEDBACK });
    expect(parseFeedback(42).ok).toBe(false);
  });

  it('needs the rules agreed', () => {
    expect(parsePlayerEntry({ feedback: FEEDBACK }, 'adult', null)).toEqual({ ok: false, error: 'Please tick the box to agree to the rules.' });
    expect(parsePlayerEntry({ feedback: FEEDBACK, agree: true }, 'adult', null)).toEqual({ ok: true, value: { feedback: FEEDBACK, parent: null } });
  });

  it('asks a 16 or 17 year old for a parent, and refuses their own email', () => {
    expect(parsePlayerEntry({ feedback: FEEDBACK, agree: true }, 'ask-parent', 'kid@example.ie').ok).toBe(false);
    const own = parsePlayerEntry({ feedback: FEEDBACK, agree: true, parentConfirm: true, parentName: 'Mary Byrne', parentEmail: 'Kid@Example.ie' }, 'ask-parent', 'kid@example.ie');
    expect(own.ok).toBe(false);
    const unticked = parsePlayerEntry({ feedback: FEEDBACK, agree: true, parentName: 'Mary Byrne', parentEmail: 'Mary@Example.ie' }, 'ask-parent', 'kid@example.ie');
    expect(unticked).toEqual({ ok: false, error: 'Please tick the box to confirm this is your parent or guardian’s email, not yours.' });
    const ok = parsePlayerEntry({ feedback: FEEDBACK, agree: true, parentConfirm: true, parentName: 'Mary Byrne', parentEmail: 'Mary@Example.ie' }, 'ask-parent', 'kid@example.ie');
    expect(ok).toEqual({ ok: true, value: { feedback: FEEDBACK, parent: { parentName: 'Mary Byrne', parentEmail: 'mary@example.ie' } } });
  });

  it('does not ask an under-16 for a parent: the approving one is emailed', () => {
    expect(parsePlayerEntry({ feedback: FEEDBACK, agree: true }, 'under16', null)).toEqual({ ok: true, value: { feedback: FEEDBACK, parent: null } });
  });

  it('refuses an entry the age rules block', () => {
    expect(parsePlayerEntry({ feedback: FEEDBACK, agree: true }, 'answer-age', null).ok).toBe(false);
    expect(parsePlayerEntry({ feedback: FEEDBACK, agree: true }, 'needs-account-approval', null).ok).toBe(false);
  });
});

describe('club entries (rules section 4)', () => {
  it('folds spellings of one club together', () => {
    expect(normaliseClubName('Wexford Wildcats BC')).toBe('wexford wildcats');
    expect(normaliseClubName('  wexford   WILDCATS Basketball Club ')).toBe('wexford wildcats');
    expect(normaliseClubName('St. Mary’s')).toBe(normaliseClubName('St Mary’s'));
    expect(normaliseClubName('Ballina & District')).toBe('ballina and district');
    expect(normaliseClubName('Basketball Club')).toBe('basketball club');
  });

  it('needs the club name, a team, the club knowing, the rules and the feedback', () => {
    const good = { clubName: 'Wexford Wildcats', teamId: TEAM, clubKnows: true, agree: true, feedback: FEEDBACK };
    expect(parseClubEntry(good)).toEqual({ ok: true, value: { clubName: 'Wexford Wildcats', clubKey: 'wexford wildcats', teamId: TEAM, feedback: FEEDBACK } });
    expect(parseClubEntry({ ...good, clubKnows: false }).ok).toBe(false);
    expect(parseClubEntry({ ...good, agree: false }).ok).toBe(false);
    expect(parseClubEntry({ ...good, teamId: 'not-a-team' }).ok).toBe(false);
    expect(parseClubEntry({ ...good, clubName: 'X' }).ok).toBe(false);
  });
});

describe('the parent link', () => {
  const now = new Date('2026-12-01T12:00:00Z');
  const sent = (daysAgo: number) => new Date(now.getTime() - daysAgo * DAY).toISOString();
  const pending = { status: 'pending_parent' as const, parent_token_sent_at: sent(1), parent_decided_at: null };

  it('approves or declines while live', () => {
    expect(parentLinkState(pending, now)).toBe('live');
    expect(parentDecision(pending, 'approve', now)).toEqual({ ok: true, status: 'valid' });
    expect(parentDecision(pending, 'decline', now)).toEqual({ ok: true, status: 'declined' });
    expect(parentDecision(pending, 'delete', now).ok).toBe(false);
  });

  it('runs out after 7 days unanswered, and only then can the player send a new one', () => {
    expect(canResendParentLink(pending, now)).toBe(false);
    const old = { ...pending, parent_token_sent_at: sent(8) };
    expect(parentLinkState(old, now)).toBe('expired');
    expect(parentDecision(old, 'approve', now).ok).toBe(false);
    expect(canResendParentLink(old, now)).toBe(true);
  });

  it('lets a parent change their mind until closing, even after 7 days', () => {
    const approved = { status: 'valid' as const, parent_token_sent_at: sent(20), parent_decided_at: sent(19) };
    expect(parentDecision(approved, 'decline', now)).toEqual({ ok: true, status: 'declined' });
    const declined = { status: 'declined' as const, parent_token_sent_at: sent(20), parent_decided_at: sent(19) };
    expect(parentDecision(declined, 'approve', now)).toEqual({ ok: true, status: 'valid' });
    expect(parentDecision(approved, 'decline', COMPETITION_CLOSES_AT).ok).toBe(false);
  });

  it('does nothing for a link that was never emailed, or an adult entry', () => {
    expect(parentDecision({ ...pending, parent_token_sent_at: null }, 'approve', now).ok).toBe(false);
    expect(parentDecision({ status: 'valid', parent_token_sent_at: null, parent_decided_at: null }, 'approve', now).ok).toBe(false);
  });

  it('tells the player what is happening, without the link', () => {
    expect(entryStatusText({ ...pending, parent_token_sent_at: null }, false, now)).toBe(
      'Waiting for your parent or guardian. We’ll email them as soon as we can.'
    );
    expect(entryStatusText(pending, true, now)).toMatch(/We emailed them/);
    expect(entryStatusText({ status: 'valid', parent_token_sent_at: null, parent_decided_at: null }, true, now)).toMatch(/You are entered/);
    expect(entryStatusText({ ...pending, status: 'declined', parent_decided_at: sent(0) }, true, now)).toMatch(/said no/);
  });

  it('emails a parent what it is, that it is free, what it uses and that a winner is contacted through them', () => {
    const { subject, text } = parentEmail({ child: 'Aoife', parentName: 'Mary', origin: 'https://example.test', token: 'abc', accountParent: false });
    expect(subject).toBe('Aoife would like to enter the Deadeye founding competition');
    expect(text).toMatch(/^Hi Mary,/);
    expect(text).toMatch(/It is free/);
    expect(text).toMatch(/not by a draw/);
    expect(text).toMatch(/the training they log and the feedback they wrote/);
    expect(text).toMatch(/we contact you, not them/);
    expect(text).toContain('https://example.test/parents/competition/abc');
    expect(text).not.toMatch(/second prize|runner-up/i);
    expect(text).toMatch(/Aoife gave us your email address to ask your permission/);
    expect(text).toContain('delete it by 30 September 2027 at the latest. How we handle data: https://example.test/privacy');
    expect(text).toMatch(/If you are not Aoife's parent or guardian, press Decline or ignore this email, and the entry will not count/);
    expect(text).toMatch(/Aoife can change their feedback until then/);
  });

  it('tells the parent of an under-16 they are the one who approved the account', () => {
    const { text } = parentEmail({ child: 'Aoife', parentName: null, origin: 'https://example.test', token: 'abc', accountParent: true });
    expect(text).toMatch(/^Hi,/);
    expect(text).toMatch(/You are the parent or guardian who approved Aoife's Deadeye account/);
    expect(text).not.toMatch(/gave us your email/);
  });
});

describe('the judging CSV', () => {
  const row = { ref: 'abcd1234', kind: 'player' as const, name: 'Aoife Byrne', feedback: 'Great, "really"\n=cmd', status: 'valid' as const, created_at: '2026-11-20T10:00:00Z', winner: true };

  it('leaves names out unless asked, since entries are judged without them', () => {
    const csv = judgingCsv([row], false);
    expect(csv).not.toContain('Aoife');
    expect(csv.split('\r\n')[0]).toBe('ref,kind,status,entered,winner,feedback');
    expect(judgingCsv([row], true)).toContain('Aoife Byrne');
  });

  it('quotes text and defuses spreadsheet formulas', () => {
    expect(judgingCsv([{ ...row, feedback: '=HYPERLINK("x")' }], false)).toContain(`"'=HYPERLINK(""x"")"`);
    expect(judgingCsv([row], false)).toContain('"Great, ""really""\n=cmd"');
  });
});

describe('the rules shown on /competition', () => {
  const all = JSON.stringify(COMPETITION_RULES);

  it('fills the delete period and leaves no placeholders or founder notes', () => {
    expect(DELETE_PERIOD).toBe('6 months');
    expect(all).toContain('deleted 6 months after the offer closes');
    expect(all).not.toMatch(/\[[A-Z_]+\]|Founder only|delete this box/);
  });

  it('never calls the 25% offer a prize for coming second', () => {
    expect(all).not.toMatch(/second prize|runner-up|you have won/i);
  });

  it('says who reads feedback, who gets the offer for an under-18, and how an under-18 winner is confirmed, in the app and the rules doc alike', () => {
    const doc = fs.readFileSync(path.join(__dirname, '..', 'docs', 'sales', 'founding-competition-rules.md'), 'utf8').replace(/’/g, "'");
    const app = all.replace(/’/g, "'");
    for (const sentence of [
      'It is read by the two judges (the promoter and one other adult), with names hidden.',
      'We email each adult entrant how to take it up, and for a player under 18, the parent or guardian who approved the entry.',
      'Before confirming a winner under 18, the promoter speaks to their parent or guardian by phone or in person. Adult winners confirm they are 18 or over.',
      'It is deleted 6 months after the offer closes.',
    ]) {
      expect(app, sentence).toContain(sentence);
      expect(doc, sentence).toContain(sentence);
    }
  });

  it('links to paths, never a hard-coded host', () => {
    expect(all).not.toMatch(/https?:\/\//);
  });
});
