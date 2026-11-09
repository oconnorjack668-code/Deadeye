// src/lib/supabase/middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from './types';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

  const supabase = createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options as CookieOptions)
        );
        // No-cache headers from @supabase/ssr: a response that sets auth cookies must never be
        // cached by a CDN, or one player's session could be served to another.
        Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // IMPORTANT: Avoid writing logic between createServerClient and supabase.auth.getClaims().
  // A simple mistake could make it very hard to debug issues with users being randomly logged out.
  // getClaims() refreshes an expiring session and verifies the JWT, locally when the project
  // uses asymmetric signing keys, so most requests skip a round trip to Supabase Auth.
  const { data: claimsData } = await supabase.auth.getClaims();
  const user = claimsData?.claims?.sub ? { id: claimsData.claims.sub } : null;

  const pathname = request.nextUrl.pathname;

  // Public paths that do not require authentication
  const isAuthPath =
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/verify-email') ||
    pathname.startsWith('/reset-password') ||
    pathname.startsWith('/auth/callback');

  const isPublicMarketingPath =
    pathname === '/' || pathname.startsWith('/about') || pathname.startsWith('/privacy') || pathname.startsWith('/terms') ||
    pathname.startsWith('/.well-known') ||
    pathname.startsWith('/account-deletion') ||
    pathname === '/install' ||
    pathname === '/api/errors' ||
    // A parent approving an under-16 has no account; the token in the link is the access
    pathname.startsWith('/parents/') ||
    pathname.startsWith('/api/parents/');

  // If user is not authenticated and trying to access protected routes
  if (!user && !isAuthPath && !isPublicMarketingPath) {
    // Only redirect if accessing app routes
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return redirectKeepingSession(url, response);
  }

  // If user is authenticated and visits auth pages, redirect to dashboard
  if (user && (pathname === '/login' || pathname === '/signup')) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return redirectKeepingSession(url, response);
  }

  return response;
}

// A redirect is a new response, so it would drop the cookies getClaims() just wrote. If the
// session was refreshed on this request, the browser would keep the old, already-used refresh
// token and the player could be signed out. Copy the cookies and no-cache headers across.
function redirectKeepingSession(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  for (const header of ['Cache-Control', 'Expires', 'Pragma']) {
    const value = from.headers.get(header);
    if (value) redirect.headers.set(header, value);
  }
  return redirect;
}
