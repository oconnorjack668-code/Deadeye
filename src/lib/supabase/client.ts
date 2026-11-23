// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';
import { freshTokenFetch } from './fresh-token-fetch';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder_anon_key';

  // Waits out the database API turning a just-refreshed token away (see fresh-token-fetch)
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, { global: { fetch: freshTokenFetch() } });
}
