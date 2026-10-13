// src/app/(auth)/update-password/page.tsx
// The page that actually sets a new password. Both reset entry points - the
// "Forgot password?" link on /login and "Email me a reset link" in Settings -
// send their email link to /auth/callback?next=/update-password, so the code is
// exchanged for a session before the player lands here.
//
// It is deliberately NOT in middleware's isAuthPath list: reaching it requires a
// session, which is exactly the proof that the emailed link was genuine. An
// unauthenticated visitor is sent to /login by the proxy, and a stale or reused
// link fails the exchange in the callback, which also lands on /login.
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updatePasswordSchema } from '@/lib/validation';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setErrors({});

    const result = updatePasswordSchema.safeParse({ password, confirmPassword });

    if (!result.success) {
      const fieldErrors: { [key: string]: string } = {};
      result.error.issues.forEach((issue) => {
        if (issue.path[0]) {
          fieldErrors[issue.path[0].toString()] = issue.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsLoading(true);

    try {
      const { error: updateError } = await createClient().auth.updateUser({ password });

      if (updateError) {
        // Without a session Supabase answers "Auth session missing!", which tells
        // a player nothing. The cause is always the same: the link was opened
        // after it expired, or it had already been used once.
        const missingSession = /session|not authenticated|jwt/i.test(updateError.message);
        setServerError(
          missingSession
            ? 'This reset link has expired or has already been used. Request a new one and open it on this device.'
            : updateError.message
        );
        setIsLoading(false);
        return;
      }

      setIsDone(true);
      setIsLoading(false);
    } catch {
      setServerError('Could not set your new password. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-zinc-950">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <Logo size={56} className="mb-3" />
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">Deadeye</h1>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-400">Aim is earned</p>
        </div>

        <Card className="border-zinc-800/80 bg-zinc-900/90 shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Set a new password</CardTitle>
            <CardDescription>
              Choose a password you have not used here before. You stay signed in on this device.
            </CardDescription>
          </CardHeader>

          {isDone ? (
            <CardContent className="space-y-4 pt-2">
              <Alert variant="success" title="Password updated">
                Your new password is saved. Use it the next time you sign in.
              </Alert>
              <Button variant="primary" size="lg" className="w-full" onClick={() => router.push('/dashboard')}>
                Go to my dashboard
              </Button>
            </CardContent>
          ) : (
            <form onSubmit={handleUpdate}>
              <CardContent className="space-y-4">
                {serverError && (
                  <Alert variant="error" title="Could not update password">
                    {serverError}
                  </Alert>
                )}

                <Input
                  label="New password (min 8 chars, 1 uppercase, 1 number)"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={errors.password}
                  required
                  autoComplete="new-password"
                />

                <Input
                  label="Confirm new password"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={errors.confirmPassword}
                  required
                  autoComplete="new-password"
                />
              </CardContent>

              <CardFooter className="flex flex-col space-y-3 pt-2">
                <Button type="submit" variant="primary" size="lg" className="w-full" isLoading={isLoading}>
                  Save New Password
                </Button>

                <p className="text-xs text-center text-zinc-400">
                  Link stopped working?{' '}
                  <Link href="/reset-password" className="font-semibold text-red-400 hover:text-red-300 transition-colors">
                    Send a new one
                  </Link>
                </p>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
