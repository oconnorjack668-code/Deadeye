// src/app/(auth)/login/page.tsx
'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Lock, Mail } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AuthBrand } from '@/components/AuthBrand';
import { Button } from '@/components/ui/Button';
import { FIELD_LABEL, Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { safeAppPath } from '@/lib/safePath';
import { authLinkErrorMessage } from '@/lib/authLink';
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
  // A confirm link opened in another browser: good news, not a failure
  const confirmedNotice = queryError === 'link_other_browser' ? authLinkErrorMessage(queryError) : null;
  const [error, setError] = useState<string | null>(confirmedNotice ? null : authLinkErrorMessage(queryError));
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
      <div className="w-full max-w-md">
        <AuthBrand />

        <Card className="border-zinc-800/80 bg-zinc-900/90 shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Sign in</CardTitle>
          </CardHeader>

          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              {confirmedNotice && !error && (
                <Alert variant="success" title="Email confirmed">
                  {confirmedNotice}
                </Alert>
              )}
              {error && (
                <Alert variant="error" title="Sign in failed">
                  {error}
                </Alert>
              )}

              <Input
                label="Email"
                type="email"
                icon={Mail}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className={FIELD_LABEL}>
                    Password
                  </label>
                  <Link
                    href="/reset-password"
                    className="text-sm text-orange-400 underline hover:text-orange-300 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  icon={Lock}
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
                Sign in
              </Button>

              {invited && (
                <p className="text-sm text-center text-cyan-300">
                  A friend invited you. Create an account and you can add them straight after.
                </p>
              )}
              {teamInvite && (
                <p className="text-sm text-center text-cyan-300">
                  Your coach invited you to a team. Create an account and you can join it straight after.
                </p>
              )}
              <p className="text-sm text-center text-zinc-400">
                New to Deadeye?{' '}
                <Link
                  href="/signup"
                  onClick={() => {
                    rememberInvite(redirectTo);
                    rememberTeamInvite(redirectTo);
                  }}
                  className="font-semibold text-orange-400 underline hover:text-orange-300 transition-colors"
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
          <div className="h-10 w-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin motion-reduce:animate-none mx-auto mb-4" />
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
