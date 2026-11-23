// __tests__/auth-forms.test.tsx
// Sign up, sign in and the two password pages (backlog D5, screen review #4):
// no real player's name as a placeholder, plain labels, the password rule as a
// hint read with the field, no "Operating System" tagline, the logo on each,
// and "Aim is earned" kept red (the brand).
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { PASSWORD_HINT } from '@/lib/validation';

vi.mock('next/link', () => ({
  default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}));
vi.mock('@/lib/supabase/client', () => ({ createClient: () => ({ auth: {} }) }));

import SignUpPage from '@/app/(auth)/signup/page';
import LoginPage from '@/app/(auth)/login/page';
import ResetPasswordPage from '@/app/(auth)/reset-password/page';
import UpdatePasswordPage from '@/app/(auth)/update-password/page';

describe('sign-up form', () => {
  it('uses a neutral made-up name, not a real player', () => {
    render(<SignUpPage />);
    expect(document.body.innerHTML).not.toContain('Jordan Clarkson');
    expect(screen.getByLabelText('Your name or a nickname').getAttribute('placeholder')).toBe('e.g. Sam');
  });

  it('labels the password plainly and reads the rule as its hint', () => {
    render(<SignUpPage />);
    const password = screen.getByLabelText('Password');
    const hintId = password.getAttribute('aria-describedby');
    expect(hintId).toBeTruthy();
    expect(document.getElementById(hintId!)!.textContent).toBe(PASSWORD_HINT);
  });

  it('links the "agree" error to the checkbox so a screen reader hears it', () => {
    render(<SignUpPage />);
    const box = screen.getByRole('checkbox');
    expect(box.getAttribute('aria-describedby')).toBeNull();
    expect(box.getAttribute('aria-invalid')).toBeNull();

    fireEvent.change(screen.getByLabelText('Your name or a nickname'), { target: { value: 'Sam' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'sam@example.ie' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'Password1' } });
    fireEvent.click(screen.getByLabelText(/16 or older/));
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBeTruthy();
    expect(box.getAttribute('aria-describedby')).toBe(alert.id);
    expect(box.getAttribute('aria-invalid')).toBe('true');
  });

  it('says "Create account" and drops the old tagline', () => {
    render(<SignUpPage />);
    expect(screen.getByRole('button', { name: 'Create account' })).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/intentional habits/);
  });
});

describe('sign-in form', () => {
  it('has no "Operating System" tagline and a plain "Sign in" button', () => {
    render(<LoginPage />);
    expect(document.body.textContent).not.toMatch(/Operating System/);
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Forgot password?' }).getAttribute('href')).toBe('/reset-password');
  });
});

describe('the logo on every auth page', () => {
  it.each([
    ['sign up', SignUpPage],
    ['sign in', LoginPage],
    ['reset password', ResetPasswordPage],
    ['update password', UpdatePasswordPage],
  ])('%s shows the logo and the red slogan', (_name, Page) => {
    render(<Page />);
    expect(screen.getByAltText('Deadeye logo')).toBeTruthy();
    expect(screen.getByText('Aim is earned').className).toContain('text-red-400');
  });

  it('the new-password field reads the rule as its hint', () => {
    render(<UpdatePasswordPage />);
    const hintId = screen.getByLabelText('New password').getAttribute('aria-describedby');
    expect(document.getElementById(hintId!)!.textContent).toBe(PASSWORD_HINT);
  });
});
