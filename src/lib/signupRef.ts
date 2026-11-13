// src/lib/signupRef.ts
// Which outreach route brought a player: links the founder shares carry
// ?ref=<route> (docs/agent-os/outreach/routes.md, e.g. /?ref=friends). The
// route travels in the address only - the landing page passes it on to its
// sign-up links, and the sign-up form saves it on the account as
// user_metadata.signup_ref. The funnel then counts players by route. The app
// writes nothing to the device for it, but the EDPB reads a code in a link as
// still within ePrivacy art. 5(3) (Guidelines 2/2023, paras 49-51): see the
// DPIA for the founder's decision on that.
//
// A route is a code for a kind of place (a community, an event), never a
// person, a handle, a school or a youth team. Only the codes listed here are
// kept, on save and again on read (players can edit their own user_metadata),
// so nothing else can reach /admin/funnel or the counts file in the public
// repo (safety review, 2026-11-13).

/**
 * The known routes. Keep in step with the Ref column of
 * docs/agent-os/outreach/routes.md: a new route needs its code added here first.
 */
export const ROUTES = [
  'friends',
  'wexford-press',
  'fdys',
  'creator-trainer',
  'creator-women',
  'creator-rec',
  'bi-3x3',
] as const;

export type Route = (typeof ROUTES)[number];

/** A known route code (any case, spaces trimmed), or null for anything else */
export function normaliseRef(value: string | null | undefined): Route | null {
  const v = (value ?? '').trim().toLowerCase();
  return (ROUTES as readonly string[]).includes(v) ? (v as Route) : null;
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
