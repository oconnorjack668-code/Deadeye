// __tests__/entitlements.test.ts
// Who has Pro, the monthly AI allowance, and the founding member offer. These
// decide what players can do and what they are told they can do, so every
// edge here is one a player would hit: the last day of free months, the 1st
// of the month, the 100th place.
import { describe, it, expect, afterEach } from 'vitest';
import { aiReportsLeft, creditMonth, FREE_MONTHLY_AI_REPORTS, hasPro, planLabel } from '@/lib/entitlements';
import {
  FOUNDING_MONTHS,
  FOUNDING_PLACES,
  FOUNDING_REMINDER_DAYS,
  foundingOfferSwitchedOff,
  foundingState,
  placesLeft,
  showPlacesLeft,
} from '@/lib/founding';
import { canUseProgram, studySlugsIn } from '@/lib/programs';
import { MIN_TRIAL_MS, monthlyPriceFor, trialEndFor } from '@/lib/stripe';

const NOW = new Date('2026-10-18T12:00:00Z');
const inDays = (d: number) => new Date(NOW.getTime() + d * 86_400_000).toISOString();

describe('hasPro', () => {
  it('counts paying, owner and founding members inside their months', () => {
    expect(hasPro({ plan_type: 'pro' }, NOW)).toBe(true);
    expect(hasPro({ plan_type: 'owner' }, NOW)).toBe(true);
    expect(hasPro({ plan_type: 'free', founding_pro_until: inDays(1) }, NOW)).toBe(true);
  });

  it('ends founding Pro at the moment it runs out, not a day later', () => {
    expect(hasPro({ plan_type: 'free', founding_pro_until: inDays(-0.001) }, NOW)).toBe(false);
    expect(hasPro({ plan_type: 'free', founding_pro_until: null }, NOW)).toBe(false);
    expect(hasPro(null, NOW)).toBe(false);
  });
});

describe('monthly AI allowance', () => {
  it('names the month by its first day, in UTC', () => {
    expect(creditMonth(new Date('2026-10-31T23:59:00Z'))).toBe('2026-10-01');
    expect(creditMonth(new Date('2026-11-01T00:00:00Z'))).toBe('2026-11-01');
  });

  it('treats a balance from an earlier month, or from before allowances, as a fresh allowance', () => {
    expect(aiReportsLeft({ ai_credits_remaining: 0, ai_credits_period: '2026-09-01' }, NOW)).toBe(FREE_MONTHLY_AI_REPORTS);
    expect(aiReportsLeft({ ai_credits_remaining: 0, ai_credits_period: null }, NOW)).toBe(FREE_MONTHLY_AI_REPORTS);
  });

  it('counts down within the month and never shows below zero', () => {
    expect(aiReportsLeft({ ai_credits_remaining: 1, ai_credits_period: '2026-10-01' }, NOW)).toBe(1);
    expect(aiReportsLeft({ ai_credits_remaining: -2, ai_credits_period: '2026-10-01' }, NOW)).toBe(0);
  });
});

describe('planLabel', () => {
  it('tells a founding member until when', () => {
    expect(planLabel({ plan_type: 'free', founding_pro_until: '2027-01-18T12:00:00Z' }, NOW, 'Europe/Dublin')).toBe(
      'Pro (founding member until 18 January)'
    );
  });

  it('reads plainly otherwise', () => {
    expect(planLabel({ plan_type: 'pro' }, NOW)).toBe('Pro');
    expect(planLabel({ plan_type: 'free', founding_pro_until: inDays(-1) }, NOW)).toBe('Free');
    expect(planLabel(null, NOW)).toBe('Free');
  });
});

describe('founding member offer', () => {
  const free = { plan_type: 'free', founding_claimed_at: null, founding_pro_until: null };

  it('is offered while places are left, to anyone not paying and not the owner', () => {
    expect(foundingState(free, { claimed: 99, closed: false, isOwner: false }, NOW)).toEqual({ kind: 'can-claim', placesLeft: 1 });
    expect(foundingState(free, { claimed: FOUNDING_PLACES, closed: false, isOwner: false }, NOW).kind).toBe('none');
    expect(foundingState(free, { claimed: 0, closed: true, isOwner: false }, NOW).kind).toBe('none');
    expect(foundingState(free, { claimed: 0, closed: false, isOwner: true }, NOW).kind).toBe('none');
    expect(foundingState({ ...free, plan_type: 'pro' }, { claimed: 0, closed: false, isOwner: false }, NOW).kind).toBe('none');
  });

  it('shows the days left while active, and the founder price once over', () => {
    const claimed = { plan_type: 'free', founding_claimed_at: inDays(-80), founding_pro_until: inDays(5) };
    const active = foundingState(claimed, { claimed: 100, closed: true, isOwner: false }, NOW);
    expect(active.kind).toBe('active');
    expect(active.kind === 'active' && active.daysLeft).toBe(5);
    expect(active.kind === 'active' && active.daysLeft <= FOUNDING_REMINDER_DAYS).toBe(true);

    const over = { ...claimed, founding_pro_until: inDays(-1) };
    expect(foundingState(over, { claimed: 100, closed: true, isOwner: false }, NOW).kind).toBe('ended');
    // A founding member who went on to pay has nothing more to be told
    expect(foundingState({ ...over, plan_type: 'pro' }, { claimed: 100, closed: true, isOwner: false }, NOW).kind).toBe('none');
  });

  it('only counts down out loud once places are scarce', () => {
    expect(placesLeft(97)).toBe(3);
    expect(placesLeft(150)).toBe(0);
    expect(showPlacesLeft(97)).toBe(false);
    expect(showPlacesLeft(25)).toBe(true);
    expect(showPlacesLeft(0)).toBe(false);
  });

  it('is 100 places of 3 months', () => {
    expect(FOUNDING_PLACES).toBe(100);
    expect(FOUNDING_MONTHS).toBe(3);
  });

  afterEach(() => {
    delete process.env.FOUNDING_OFFER_CLOSED;
  });

  it('can be switched off from the environment', () => {
    expect(foundingOfferSwitchedOff()).toBe(false);
    process.env.FOUNDING_OFFER_CLOSED = 'TRUE';
    expect(foundingOfferSwitchedOff()).toBe(true);
  });
});

describe('programme and study access', () => {
  it('opens a programme that is free, for Pro, or already started', () => {
    expect(canUseProgram({ id: 'a', is_free: true }, false, new Set())).toBe(true);
    expect(canUseProgram({ id: 'b', is_free: false }, true, new Set())).toBe(true);
    expect(canUseProgram({ id: 'b', is_free: false }, false, new Set(['b']))).toBe(true);
    expect(canUseProgram({ id: 'b', is_free: false }, false, new Set(['a']))).toBe(false);
  });

  it('finds the study sections a programme sends a player to', () => {
    const days = [
      { items: [{ type: 'drill', slug: 'x' }, { type: 'study', topic_slug: 'mental-game' }] },
      { items: [{ type: 'study', topic_slug: 'film-study' }] },
      { items: null },
    ];
    expect([...studySlugsIn(days)].sort()).toEqual(['film-study', 'mental-game']);
  });
});

describe('founder price at checkout', () => {
  afterEach(() => {
    delete process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID;
    delete process.env.STRIPE_PRO_MONTHLY_PRICE_ID;
  });

  it('gives founding members the founder price, and falls back rather than refusing', () => {
    process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_normal';
    expect(monthlyPriceFor(true)).toBe('price_normal');
    process.env.STRIPE_FOUNDER_MONTHLY_PRICE_ID = 'price_founder';
    expect(monthlyPriceFor(true)).toBe('price_founder');
    expect(monthlyPriceFor(false)).toBe('price_normal');
  });

  it('starts charging when the free months end, if Stripe will allow a trial that long', () => {
    expect(trialEndFor(inDays(30), NOW)).toBe(Math.floor(new Date(inDays(30)).getTime() / 1000));
    expect(trialEndFor(new Date(NOW.getTime() + MIN_TRIAL_MS - 60_000).toISOString(), NOW)).toBeNull();
    expect(trialEndFor(null, NOW)).toBeNull();
  });
});
