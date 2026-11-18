// src/lib/supabase/fresh-token-fetch.ts
// A fetch for the Supabase clients that waits out one database API error.
//
// Right after a session is refreshed, Supabase's database API sometimes turns
// the new token away for a second or two with 401 PGRST303 ("JWT issued at
// future"): its clock is a little behind the one that signed the token. Seen
// in the edge logs on 15 and 16 Nov 2026: each time the first query of a page
// load, one to two seconds after the token was issued, while the same token
// worked a few milliseconds later. When the failed query was the photo lookup
// the top bar showed the player's emoji instead of their photo; when it was
// profiles or age_checks, the page lost those too.
//
// So on that one error, wait and try again. Any other answer, 401s included,
// goes straight back to the caller.

const ISSUED_IN_FUTURE = 'PGRST303';
const RETRY_DELAYS_MS = [1000, 1500];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function isIssuedInFuture(response: Response): Promise<boolean> {
  if (response.status !== 401) return false;
  try {
    const body = (await response.clone().json()) as { code?: unknown } | null;
    return body?.code === ISSUED_IN_FUTURE;
  } catch {
    return false;
  }
}

export function freshTokenFetch(baseFetch: typeof fetch = fetch, delays: number[] = RETRY_DELAYS_MS): typeof fetch {
  return async (input, init) => {
    let response = await baseFetch(input, init);
    for (const delay of delays) {
      if (!(await isIssuedInFuture(response))) return response;
      await wait(delay);
      // The clients send string bodies, so the request can be sent again as is
      response = await baseFetch(input, init);
    }
    return response;
  };
}
