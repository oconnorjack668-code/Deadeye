import { describe, it, expect } from 'vitest';
import { authLinkError, authLinkErrorMessage, parseEmailLinkType } from '@/lib/authLink';

describe('parseEmailLinkType', () => {
  it('accepts the link types Deadeye emails', () => {
    for (const t of ['email', 'signup', 'recovery', 'email_change']) expect(parseEmailLinkType(t)).toBe(t);
  });
  it('rejects anything else', () => {
    for (const t of [null, undefined, '', 'magiclink', 'invite', 'sms', 'EMAIL']) expect(parseEmailLinkType(t)).toBeNull();
  });
});

describe('authLinkError', () => {
  it('a code link from another browser: email is confirmed, sign in', () => {
    expect(authLinkError('code', '/onboarding')).toBe('link_other_browser');
    expect(authLinkError('code', '/settings')).toBe('link_other_browser');
  });
  it('a reset code link from another browser: ask again', () => {
    expect(authLinkError('code', '/update-password')).toBe('reset_other_browser');
  });
  it('a failed token link or no link: expired or invalid', () => {
    expect(authLinkError('token', '/onboarding')).toBe('auth_callback_failed');
    expect(authLinkError('none', '/update-password')).toBe('auth_callback_failed');
  });
});

describe('authLinkErrorMessage', () => {
  it('has words for every error the callback sends', () => {
    for (const code of ['auth_callback_failed', 'link_other_browser', 'reset_other_browser']) {
      expect(authLinkErrorMessage(code)).toBeTruthy();
    }
  });
  it('keeps the old expired message', () => {
    expect(authLinkErrorMessage('auth_callback_failed')).toBe(
      'Verification link expired or invalid. Please sign in or request a new link.'
    );
  });
  it('shows nothing for unknown or missing codes', () => {
    expect(authLinkErrorMessage(null)).toBeNull();
    expect(authLinkErrorMessage('whatever')).toBeNull();
  });
});
