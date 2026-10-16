// src/lib/withdrawal.ts
// The EU right to withdraw from an online contract within 14 days, and the
// "withdrawal function" a trader must offer for it from 19 June 2026
// (Directive (EU) 2023/2673, Article 11a of the Consumer Rights Directive):
// a clearly labelled button for the whole 14 days, a second step to confirm,
// and an acknowledgement on a durable medium (email) straight after.
//
// The terms already promised a full refund in that window, by email. This
// makes it a button, and keeps the refund full: the law would allow keeping
// a share for Pro already used, but working that out per player is not worth
// what it would save.

export const WITHDRAWAL_DAYS = 14;

/** The last moment a purchase made at `startUnix` (Stripe seconds) can be withdrawn from. */
export function withdrawalDeadline(startUnix: number): Date {
  return new Date((startUnix + WITHDRAWAL_DAYS * 86_400) * 1000);
}

export function withinWithdrawalPeriod(startUnix: number, now = new Date()): boolean {
  return now.getTime() <= withdrawalDeadline(startUnix).getTime();
}
