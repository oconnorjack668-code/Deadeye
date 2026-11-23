// __tests__/verify-email.test.tsx
// "Check your email" (backlog D3): plain steps, no developer note about SMTP,
// "Send it again" through Supabase with a 60 second wait, and a way back.
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { looksLikeEmail, resendOutcome, RESEND_COOLDOWN_S } from '@/lib/resendEmail';

const resend = vi.fn();
let query = 'email=sam%40example.ie';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(query) }));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: { resend } }) }));

import VerifyEmailPage from '@/app/(auth)/verify-email/page';

describe('resendOutcome', () => {
  it('waits 60 seconds after a send', () => {
    expect(resendOutcome(null)).toMatchObject({ ok: true, cooldown: RESEND_COOLDOWN_S });
    expect(RESEND_COOLDOWN_S).toBe(60);
  });

  it("uses Supabase's own wait when it says how long", () => {
    const o = resendOutcome({
      code: 'over_email_send_rate_limit',
      message: 'For security purposes, you can only request this after 37 seconds.',
    });
    expect(o).toMatchObject({ ok: false, cooldown: 37 });
    expect(o.message).toContain('37 seconds');
  });

  it('says to try in an hour when the hourly mail limit is used up', () => {
    const o = resendOutcome({ code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' });
    expect(o.ok).toBe(false);
    expect(o.message).toMatch(/hour/);
  });

  it('names the per-device limit, and lets a network failure retry at once', () => {
    expect(resendOutcome({ code: 'over_request_rate_limit' }).message).toMatch(/few minutes/);
    expect(resendOutcome({ code: 'network' })).toMatchObject({ ok: false, cooldown: 0 });
  });

  it('only resends to something shaped like an address', () => {
    expect(looksLikeEmail('sam@example.ie')).toBe(true);
    expect(looksLikeEmail('your email')).toBe(false);
    expect(looksLikeEmail(null)).toBe(false);
  });
});

describe('the Check your email page', () => {
  beforeEach(() => {
    query = 'email=sam%40example.ie';
    resend.mockReset();
    vi.useFakeTimers();
  });
  afterEach(() => vi.useRealTimers());

  it('shows the address and two plain steps, with no SMTP note', () => {
    render(<VerifyEmailPage />);
    expect(screen.getByText('sam@example.ie')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(document.body.textContent).not.toMatch(/SMTP|production/i);
    expect(screen.getByAltText('Deadeye logo')).toBeTruthy();
  });

  it('sends it again, then waits 60 seconds before the button works again', async () => {
    resend.mockResolvedValue({ error: null });
    render(<VerifyEmailPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send it again/ }));
    });
    expect(resend).toHaveBeenCalledTimes(1);
    expect(resend.mock.calls[0][0]).toMatchObject({ type: 'signup', email: 'sam@example.ie' });
    expect(resend.mock.calls[0][0].options.emailRedirectTo).toContain('/auth/callback?next=/onboarding');

    const waiting = screen.getByRole('button', { name: /Send again in 60s/ }) as HTMLButtonElement;
    expect(waiting.disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toMatch(/Sent/);

    for (let i = 0; i < 60; i++) {
      act(() => {
        vi.advanceTimersByTime(1000);
      });
    }
    const ready = screen.getByRole('button', { name: /Send it again/ }) as HTMLButtonElement;
    expect(ready.disabled).toBe(false);
  });

  it('says plainly when Supabase refuses, and does not show its raw wording', async () => {
    resend.mockResolvedValue({ error: { code: 'over_email_send_rate_limit', message: 'email rate limit exceeded' } });
    render(<VerifyEmailPage />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Send it again/ }));
    });
    expect(screen.getByRole('status').textContent).toMatch(/Try again in an hour/);
    expect(document.body.textContent).not.toContain('email rate limit exceeded');
  });

  it('offers a fresh start for a wrong address and a way to sign in', () => {
    render(<VerifyEmailPage />);
    expect(screen.getByRole('link', { name: 'Wrong email? Start again' }).getAttribute('href')).toBe('/signup');
    expect(screen.getByRole('link', { name: 'Sign in instead' }).getAttribute('href')).toBe('/login');
  });

  it('hides "Send it again" when there is no address to send to', () => {
    query = '';
    render(<VerifyEmailPage />);
    expect(screen.queryByRole('button', { name: /Send it again/ })).toBeNull();
    expect(screen.getByRole('link', { name: 'Wrong email? Start again' })).toBeTruthy();
  });
});
