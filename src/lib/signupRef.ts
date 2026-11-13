// src/lib/signupRef.ts
// Which outreach route brought a player: links the founder shares carry
// ?ref=<route> (docs/agent-os/outreach/routes.md, e.g. /?ref=friends). The
// route travels in the address only - the landing page passes it on to its
// sign-up links, and the sign-up form saves it on the account as
// user_metadata.signup_ref - so nothing is stored on the visitor's device
// (that would need consent under the ePrivacy rules). The funnel then counts
// players by route.
//
// A route is a short code for a place (a community, an event), never a person:
// anything that is not a plain code is dropped.

/** A route code: lower case letters, digits, - and _, up to 40 long; anything else is null */
export function normaliseRef(value: string | null | undefined): string | null {
  const v = (value ?? '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9_-]{0,39}$/.test(v) ? v : null;
}

/** The sign-up address, carrying the route on if there is one */
export function signupHref(ref: string | null | undefined): string {
  const r = normaliseRef(ref);
  return r ? `/signup?ref=${r}` : '/signup';
}

/** The route in a query string such as window.location.search, or null */
export function refFromSearch(search: string): string | null {
  return normaliseRef(new URLSearchParams(search).get('ref'));
}
