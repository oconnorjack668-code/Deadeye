// src/app/(auth)/login/page.tsx
'use client';

import React, { Suspense, useState } from 'react';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { safeAppPath } from '@/lib/safePath';
import { rememberInvite } from '@/lib/friends';
import { rememberTeamInvite } from '@/lib/coachSide';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only follow links inside Deadeye (never "//other-site", "/\other-site" or "https://…")
  const redirectTo = safeAppPath(searchParams.get('redirectTo'));
  const invited = redirectTo.startsWith('/friends/add/');
  const teamInvite = redirectTo.startsWith('/teams/join/');
  const queryError = searchParams.get('error');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(
    queryError === 'auth_callback_failed'
      ? 'Verification link expired or invalid. Please sign in or request a new link.'
      : null
  );
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsLoading(false);
        return;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-zinc-950">
      {/* Basketball court subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Logo size={56} className="mb-3" />
          <h1 className="text-2xl font-black tracking-tight text-white uppercase">Deadeye</h1>
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-red-400">Aim is earned</p>
          <p className="text-xs text-zinc-400 mt-1">Player Development Operating System</p>
        </div>

        <Card className="border-zinc-800/80 bg-zinc-900/90 shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign in to your player record</CardTitle>
            <CardDescription>
              Train with intent. See your progress. Improve every day.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="error" title="Sign in failed">
                  {error}
                </Alert>
              )}

              <Input
                label="Email"
                type="email"
                placeholder="player@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="block text-xs font-semibold uppercase tracking-wider text-zinc-300"
                  >
                    Password
                  </label>
                  <Link
                    href="/reset-password"
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isLoading}
              >
                Sign In
              </Button>

              {invited && (
                <p className="text-xs text-center text-cyan-300">
                  A friend invited you. Create an account and you can add them straight after.
                </p>
              )}
              {teamInvite && (
                <p className="text-xs text-center text-cyan-300">
                  Your coach invited you to a team. Create an account and you can join it straight after.
                </p>
              )}
              <p className="text-xs text-center text-zinc-400">
                New to Deadeye?{' '}
                <Link
                  href="/signup"
                  onClick={() => {
                    rememberInvite(redirectTo);
                    rememberTeamInvite(redirectTo);
                  }}
                  className="font-semibold text-red-400 hover:text-red-300 transition-colors"
                >
                  Create an account
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen w-full flex items-center justify-center p-4 bg-zinc-950">
        <div className="text-center">
          <div className="h-10 w-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
