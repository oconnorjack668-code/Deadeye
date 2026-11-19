// src/lib/authLink.ts
// What /auth/callback does with an emailed link (sign-up confirm, password
// reset, email change).
//
// Two kinds of link reach it:
// - token_hash + type: the Supabase email templates build these (see
//   docs/founder-setup-guide.md). They are checked with verifyOtp and work in
//   any browser, so a player who signs up in Chrome and opens the email in the
//   Gmail app still gets signed in.
// - code: Supabase's default links. Exchanging the code needs a cookie set in
//   the browser that asked for the email, so it fails anywhere else. By then
//   Supabase has already confirmed the email (it checks the link before
//   handing out the code), so the player only needs to sign in.

/** The emailed-link types /auth/callback accepts (Supabase's EmailOtpType minus the ones Deadeye never sends). */
export type EmailLinkType = 'email' | 'signup' | 'recovery' | 'email_change';

const LINK_TYPES: readonly EmailLinkType[] = ['email', 'signup', 'recovery', 'email_change'];

export function parseEmailLinkType(value: string | null | undefined): EmailLinkType | null {
  return LINK_TYPES.includes(value as EmailLinkType) ? (value as EmailLinkType) : null;
}

/** The ?error= codes /login explains. */
export type AuthLinkError = 'auth_callback_failed' | 'link_other_browser' | 'reset_other_browser';

/**
 * Which error to show when the link did not sign the player in.
 * - code link that failed: the email action already happened, it just
 *   opened in another browser. A reset link still has to be asked for again,
 *   because the new password is set while signed in.
 * - anything else (expired, used, no link at all): the old message.
 */
export function authLinkError(kind: 'code' | 'token' | 'none', next: string): AuthLinkError {
  if (kind !== 'code') return 'auth_callback_failed';
  return next.startsWith('/update-password') ? 'reset_other_browser' : 'link_other_browser';
}

/** The words /login shows for each error code, or null for an unknown one. */
export function authLinkErrorMessage(code: string | null): string | null {
  switch (code) {
    case 'auth_callback_failed':
      return 'Verification link expired or invalid. Please sign in or request a new link.';
    case 'link_other_browser':
      return 'Your email is confirmed. Sign in to carry on.';
    case 'reset_other_browser':
      return 'That reset link opened in a different browser from the one you asked in. Request a new link and open it on this device.';
    default:
      return null;
  }
}
