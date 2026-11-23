// src/app/(auth)/signup/page.tsx
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Lock, Mail, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { PASSWORD_HINT, signUpSchema } from '@/lib/validation';
import { AuthBrand } from '@/components/AuthBrand';
import { Button } from '@/components/ui/Button';
import { FIELD_BORDER, Input } from '@/components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { AgeChoice, type AgeAnswer } from '@/components/AgeChoice';
import { Select } from '@/components/ui/Select';
import { HEARD_FROM, normaliseHeardFrom } from '@/lib/heardFrom';

export default function SignUpPage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState<AgeAnswer | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [heardFrom, setHeardFrom] = useState('');
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
            // Optional "Where did you hear about Deadeye?" answer (src/lib/heardFrom.ts)
            heard_from: normaliseHeardFrom(heardFrom) ?? undefined,
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
      <div className="w-full max-w-md">
        <AuthBrand />

        <Card className="border-zinc-800/80 bg-zinc-900/90 shadow-2xl backdrop-blur-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl">Create your account</CardTitle>
            <CardDescription>Private by default. Takes about a minute.</CardDescription>
          </CardHeader>

          <form onSubmit={handleSignUp}>
            <CardContent className="space-y-4">
              {serverError && (
                <Alert variant="error" title="Sign up failed">
                  {serverError}
                </Alert>
              )}

              <Input
                label="Your name or a nickname"
                id="display-name"
                type="text"
                icon={User}
                placeholder="e.g. Sam"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                error={errors.displayName}
                required
                autoComplete="name"
              />

              <Input
                label="Email"
                type="email"
                icon={Mail}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={errors.email}
                required
                autoComplete="email"
              />

              <Input
                label="Password"
                type="password"
                icon={Lock}
                hint={PASSWORD_HINT}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                required
                autoComplete="new-password"
              />

              <AgeChoice value={age} onChange={setAge} error={errors.age} />

              <Select
                id="heard-from"
                label="Where did you hear about Deadeye? (optional)"
                value={heardFrom}
                onChange={(e) => setHeardFrom(e.target.value)}
                options={[{ value: '', label: 'Choose one, or skip' }, ...HEARD_FROM]}
              />

              <div>
                <label className="flex min-h-11 items-start gap-3 text-sm text-zinc-300 cursor-pointer">
                  {/* A drawn box: the browser's own checkbox edge is too faint on
                      the dark card. Its border matches the fields (3:1). */}
                  <span className="relative mt-0.5 flex h-5 w-5 shrink-0">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className={`peer h-5 w-5 cursor-pointer appearance-none rounded-md border bg-zinc-900 ${FIELD_BORDER} checked:border-orange-600 checked:bg-orange-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900`}
                    />
                    <Check
                      className="pointer-events-none absolute inset-0 m-auto hidden h-3.5 w-3.5 text-white peer-checked:block"
                      strokeWidth={3}
                      aria-hidden
                    />
                  </span>
                  <span>
                    I agree to the{' '}
                    <Link href="/privacy" target="_blank" className="text-orange-400 underline hover:text-orange-300">
                      privacy policy
                    </Link>{' '}
                    and{' '}
                    <Link href="/terms" target="_blank" className="text-orange-400 underline hover:text-orange-300">
                      terms of use
                    </Link>
                  </span>
                </label>
                {errors.termsAccepted && <p className="mt-1 text-sm text-red-400">{errors.termsAccepted}</p>}
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
                Create account
              </Button>

              <p className="text-sm text-center text-zinc-400">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="font-semibold text-orange-400 underline hover:text-orange-300 transition-colors"
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
