// src/lib/parentApproval.ts
// A parent or guardian approves the account of any player under 16 (see
// supabase/migrations/00036_parent_approval.sql for why). This file is the
// pure part - what a given age answer means, and what counts as a valid
// approval - so the rules are testable without a database.
import type { AgeBracket, ConsentStatus } from './supabase/types';

export type AgeCheck = { is_16_plus: boolean; consent_status: ConsentStatus } | null;

/** ok: use the app. ask-age: no answer yet. needs-parent: under 16 and not approved. */
export type AgeGate = 'ok' | 'ask-age' | 'needs-parent';

export function ageGate(check: AgeCheck): AgeGate {
  if (!check) return 'ask-age';
  if (check.is_16_plus) return 'ok';
  return check.consent_status === 'approved' ? 'ok' : 'needs-parent';
}

/** An account no parent approves (or whose approval is withdrawn) is deleted after this long. */
export const UNAPPROVED_ACCOUNT_DAYS = 30;

/** How long the link emailed to a parent stays valid. */
export const CONFIRM_LINK_DAYS = 7;

/** The age brackets a player can pick, given what they said about being 16. */
export function allowedAgeBrackets(is16Plus: boolean | null): AgeBracket[] {
  // 14-17 straddles 16, so it is open to both
  if (is16Plus === true) return ['14-17', '18-22', '23-30', '30+'];
  if (is16Plus === false) return ['13', '14-17'];
  return ['13', '14-17', '18-22', '23-30', '30+'];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isToken(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export type ParentDetails = { parentName: string; parentEmail: string };

/**
 * Checks what a parent typed on the approval form. The player's own email is
 * refused, because a parent approving from the player's own address is not a
 * parent approving.
 */
export function parseParentDetails(
  body: unknown,
  playerEmail: string | null
): { ok: true; value: ParentDetails } | { ok: false; error: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const parentName = typeof b.parentName === 'string' ? b.parentName.trim().replace(/\s+/g, ' ') : '';
  const parentEmail = typeof b.parentEmail === 'string' ? b.parentEmail.trim().toLowerCase() : '';

  if (b.agree !== true) return { ok: false, error: 'Please tick the box to confirm you are their parent or guardian.' };
  if (parentName.length < 2 || parentName.length > 100) return { ok: false, error: 'Please enter your full name.' };
  if (parentEmail.length > 254 || !EMAIL.test(parentEmail)) return { ok: false, error: 'Please enter a valid email address.' };
  if (playerEmail && parentEmail === playerEmail.trim().toLowerCase()) {
    return { ok: false, error: 'This is the player’s own email. Please use the parent or guardian’s email address.' };
  }
  return { ok: true, value: { parentName, parentEmail } };
}

/** "jane.doe@gmail.com" -> "ja•••@gmail.com", so the player sees where the email went without the whole address. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '•••';
  return `${local.slice(0, 2)}•••@${domain}`;
}

/** First name only: the parent page is reachable by anyone holding the link. */
export function firstName(displayName: string | null | undefined): string {
  const first = (displayName || '').trim().split(/\s+/)[0];
  return first || 'Your child';
}

export function olderThanDays(iso: string | null, days: number, now = new Date()): boolean {
  if (!iso) return false;
  return now.getTime() - new Date(iso).getTime() > days * 86_400_000;
}
