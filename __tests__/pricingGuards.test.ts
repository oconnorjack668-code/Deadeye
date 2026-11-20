import { describe, it, expect } from 'vitest';
import { PRO_TRIAL_DAYS, trialFor } from '@/lib/stripe';
import { overDailyLimit, PRO_CHAT_PER_DAY, PRO_REPORTS_PER_DAY } from '@/lib/ai/fairUse';
import { FOUNDING_CLUB_OFFER, PRO_PLAN } from '@/lib/plans';

const now = new Date('2026-12-01T12:00:00Z');

describe('trialFor', () => {
  it('a new player gets the free week', () => {
    expect(trialFor({ foundingProUntil: null, foundingClaimed: false, hadSubscription: false, now })).toEqual({
      trial_period_days: PRO_TRIAL_DAYS,
    });
    expect(PRO_TRIAL_DAYS).toBe(7);
  });
  it('a founding member inside their free months keeps those instead', () => {
    const until = '2027-01-20T00:00:00Z';
    expect(trialFor({ foundingProUntil: until, foundingClaimed: true, hadSubscription: false, now })).toEqual({
      trial_end: Math.floor(new Date(until).getTime() / 1000),
    });
  });
  it('a founding member whose free months are over gets no extra week', () => {
    expect(
      trialFor({ foundingProUntil: '2026-11-01T00:00:00Z', foundingClaimed: true, hadSubscription: false, now })
    ).toBeNull();
  });
  it('anyone who subscribed before gets no second free week', () => {
    expect(trialFor({ foundingProUntil: null, foundingClaimed: false, hadSubscription: true, now })).toBeNull();
  });
});

describe('Pro fair use', () => {
  it('stops at the ceiling, not before', () => {
    expect(overDailyLimit(PRO_CHAT_PER_DAY - 1, PRO_CHAT_PER_DAY)).toBe(false);
    expect(overDailyLimit(PRO_CHAT_PER_DAY, PRO_CHAT_PER_DAY)).toBe(true);
    expect(overDailyLimit(null, PRO_REPORTS_PER_DAY)).toBe(false);
  });
  it('the limits are the agreed ones', () => {
    expect(PRO_CHAT_PER_DAY).toBe(50);
    expect(PRO_REPORTS_PER_DAY).toBe(20);
  });
  it('Pro never promises unlimited AI', () => {
    expect([PRO_PLAN.tagline, ...PRO_PLAN.features].join(' ').toLowerCase()).not.toMatch(/unlimited|no limits/);
  });
});

describe('founding club offer', () => {
  it('lasts 2 years, not for life', () => {
    expect(FOUNDING_CLUB_OFFER).toContain('for 2 years, until 31 January 2029');
    expect(FOUNDING_CLUB_OFFER).not.toMatch(/as long as/);
  });
});
