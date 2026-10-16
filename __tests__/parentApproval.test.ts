// __tests__/parentApproval.test.ts
// The rules behind parent approval for under-16s (00036). The gate is the part
// that matters: a mistake there either locks out players who are entitled to
// use the app, or lets an unapproved under-16 straight in.
import { describe, it, expect } from 'vitest';
import {
  ageGate,
  allowedAgeBrackets,
  firstName,
  isToken,
  maskEmail,
  olderThanDays,
  parseParentDetails,
} from '@/lib/parentApproval';

describe('ageGate', () => {
  it('asks the age of anyone who has not answered', () => {
    expect(ageGate(null)).toBe('ask-age');
  });

  it('lets 16 and over straight in', () => {
    expect(ageGate({ is_16_plus: true, consent_status: 'not_needed' })).toBe('ok');
  });

  it('holds an under-16 until a parent approves, and again if they withdraw', () => {
    expect(ageGate({ is_16_plus: false, consent_status: 'pending' })).toBe('needs-parent');
    expect(ageGate({ is_16_plus: false, consent_status: 'approved' })).toBe('ok');
    expect(ageGate({ is_16_plus: false, consent_status: 'withdrawn' })).toBe('needs-parent');
  });

  it('never treats not_needed as approval for an under-16', () => {
    // The table constraint forbids this row; the gate must not rely on that
    expect(ageGate({ is_16_plus: false, consent_status: 'not_needed' })).toBe('needs-parent');
  });
});

describe('allowedAgeBrackets', () => {
  it('keeps 13 away from players who said they are 16 or over, and adults away from under-16s', () => {
    expect(allowedAgeBrackets(true)).not.toContain('13');
    expect(allowedAgeBrackets(false)).toEqual(['13', '14-17']);
    // 14-17 straddles 16, so both can pick it
    expect(allowedAgeBrackets(true)).toContain('14-17');
    expect(allowedAgeBrackets(null)).toHaveLength(5);
  });
});

describe('parseParentDetails', () => {
  const good = { parentName: '  Mary   Murphy ', parentEmail: ' Mary@Example.IE ', agree: true };

  it('tidies a valid form', () => {
    expect(parseParentDetails(good, 'kid@example.ie')).toEqual({
      ok: true,
      value: { parentName: 'Mary Murphy', parentEmail: 'mary@example.ie' },
    });
  });

  it('needs the box ticked, a name and an email', () => {
    expect(parseParentDetails({ ...good, agree: false }, null).ok).toBe(false);
    expect(parseParentDetails({ ...good, agree: 'true' }, null).ok).toBe(false);
    expect(parseParentDetails({ ...good, parentName: 'M' }, null).ok).toBe(false);
    expect(parseParentDetails({ ...good, parentEmail: 'not-an-email' }, null).ok).toBe(false);
    expect(parseParentDetails(null, null).ok).toBe(false);
  });

  it("refuses the player's own email, whatever the case", () => {
    const result = parseParentDetails({ ...good, parentEmail: 'KID@example.ie' }, 'kid@Example.ie');
    expect(result.ok).toBe(false);
  });
});

describe('helpers', () => {
  it('accepts only uuid tokens, so nothing else reaches a query filter', () => {
    expect(isToken('3f450d58-fdd9-4e0d-af2c-33717b458f2c')).toBe(true);
    expect(isToken('3f450d58-fdd9-4e0d-af2c-33717b458f2c,user_id.neq.0')).toBe(false);
    expect(isToken('')).toBe(false);
    expect(isToken(42)).toBe(false);
  });

  it('shows the player only part of the address the email went to', () => {
    expect(maskEmail('jane.doe@gmail.com')).toBe('ja•••@gmail.com');
    expect(maskEmail('nonsense')).toBe('•••');
  });

  it('shows a parent only the first name', () => {
    expect(firstName('Jack O Connor')).toBe('Jack');
    expect(firstName('  ')).toBe('Your child');
    expect(firstName(null)).toBe('Your child');
  });

  it('counts days from a timestamp', () => {
    const now = new Date('2026-10-31T12:00:00Z');
    expect(olderThanDays('2026-10-01T11:00:00Z', 30, now)).toBe(true);
    expect(olderThanDays('2026-10-02T12:00:00Z', 30, now)).toBe(false);
    expect(olderThanDays(null, 30, now)).toBe(false);
  });
});
