// src/proxy.ts
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets (.svg, .png, .jpg, .json, .pdf, etc.): the club pricing sheet
     *   is a PDF, and without .pdf here a signed-out visitor downloaded the login page
     * - PWA files (sw.js, offline.html) and .well-known (app store domain verification)
     * - api/webhooks (Stripe webhook endpoint handles own signature auth)
     * - api/cron (scheduled jobs; protected by CRON_SECRET)
     */
    '/((?!_next/static|_next/image|favicon.ico|sw\\.js|offline\\.html|\\.well-known/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|json|mp3|mp4|pdf)$|api/webhooks|api/cron).*)',
  ],
};
