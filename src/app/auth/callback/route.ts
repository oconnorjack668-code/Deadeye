// src/app/auth/callback/route.ts
// Where every emailed link lands. See src/lib/authLink.ts for the two kinds of
// link and why a code link can fail after the email is already confirmed.
import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';
import { safeAppPath } from '@/lib/safePath';
import { authLinkError, parseEmailLinkType } from '@/lib/authLink';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const type = parseEmailLinkType(requestUrl.searchParams.get('type'));
  // Only follow links inside Deadeye ("?next=//other-site" must not leave the app)
  const next = safeAppPath(requestUrl.searchParams.get('next'));

  let kind: 'code' | 'token' | 'none' = 'none';
  if (tokenHash && type) {
    kind = 'token';
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) return NextResponse.redirect(new URL(next, requestUrl.origin));
  } else if (code) {
    kind = 'code';
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, requestUrl.origin));
  }

  // Back to sign in, with words that say what to do next
  return NextResponse.redirect(new URL(`/login?error=${authLinkError(kind, next)}`, requestUrl.origin));
}
