// src/app/(auth)/signup/page.tsx
'use client';

import React, { useState } from 'react';
import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { signUpSchema } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { AgeChoice, type AgeAnswer } from '@/components/AgeChoice';

export default function SignUpPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState<AgeAnswer | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setErrors({});

    const result = signUpSchema.safeParse({
      displayName,
      email: email.trim(),
      password,
      age,
      termsAccepted,
    });

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
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            // Read by the handle_new_user trigger into age_checks (00036)
            age_16_plus: age === '16-plus',
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
        },
      });

      if (signUpError) {
        // Supabase's built-in mailer sends only a few emails an hour for the whole
        // app, so a busy hour blocks the confirmation email. Its own wording
        // ("email rate limit exceeded") reads like the player did something wrong.
        setServerError(
          signUpError.code === 'over_email_send_rate_limit'
            ? "Lots of players are signing up right now and we couldn't send your confirmation email. Please try again in an hour."
            : signUpError.message
        );
        setIsLoading(false);
        return;
      }

      // If Supabase has email confirmation enabled and session is not immediately returned
      if (data?.user && !data.session) {
        router.push(`/verify-email?email=${encodeURIComponent(email)}`);
      } else {
        router.push('/onboarding');
      }
    } catch {
      setServerError('An unexpected error occurred. Please try again.');
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
          <p className="text-xs text-zinc-400 mt-1">Join serious players building intentional habits</p>
        </div>

        <Card className="border-zinc-800/80 bg-zinc-900/90 shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Create your player record</CardTitle>
            <CardDescription>
              Private by default. Your sessions, gym work, video, and personal progress in one place.
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleSignUp}>
            <CardContent className="space-y-4">
              {serverError && (
                <Alert variant="error" title="Sign up failed">
                  {serverError}
                </Alert>
              )}

              <Input
                label="Player Name / Nickname"
                type="text"
                placeholder="Jordan Clarkson"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                error={errors.displayName}
                required
                autoComplete="name"
              />

              <Input
                label="Email"
                type="email"
                placeholder="player@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                required
                autoComplete="email"
              />

              <Input
                label="Password (min 8 chars, 1 uppercase, 1 number)"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                required
                autoComplete="new-password"
              />

              <AgeChoice value={age} onChange={setAge} error={errors.age} />

              <div>
                <label className="flex items-start gap-2.5 text-sm text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-red-500"
                  />
                  <span>
                    I agree to the{' '}
                    <Link href="/privacy" target="_blank" className="text-red-400 underline hover:text-red-300">
                      privacy policy
                    </Link>{' '}
                    and{' '}
                    <Link href="/terms" target="_blank" className="text-red-400 underline hover:text-red-300">
                      terms of use
                    </Link>
                  </span>
                </label>
                {errors.termsAccepted && <p className="mt-1 text-xs text-red-400">{errors.termsAccepted}</p>}
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
                Create Player Account
              </Button>

              <p className="text-xs text-center text-zinc-400">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-red-400 hover:text-red-300 transition-colors"
                >
                  Sign in
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
