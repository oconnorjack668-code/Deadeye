# Founder notice to every player (2026-10-24)

Agent: Claude Code · Commits: see `git log -- supabase/migrations/00054_founder_notice.sql` · Status: PR open, not yet merged

## Outcome
- A founder post can now go to every player, not only followers. In Owner tools → Founder posts, tick "Show to every player": it shows as an amber banner above everything on every dashboard, "From the founder", can be dismissed (this device only), and stops after 14 days. Posting still defaults to followers only.

## Decisions
- One new column, `everyone boolean default false` (migration 00054). Access is unchanged: every signed-in player could already read founder posts (00050); the dashboard asks for the newest one marked everyone. Only the owner can write posts (api/founder/posts), so a player cannot broadcast.
- Amber, not red: the design rules keep red for errors and misses, and an apology from the founder should not look like something broke. Amber is the app's "worth a look" colour. Flat banner, no card inside a card.
- A post to everyone may not hold a link, a handle or a phone number (`LINK_OR_CONTACT` in `founderPosts.ts`), enforced in the API too, after the safety reviewer found it was only advice. Follower posts are unchanged.
- A confirm box before posting to everyone, because it reaches players under 18 and cannot be unsent to those who already saw it (it can be removed).
- Shown to first-run players too, as the founder asked for everyone. It is dismissible. If it distracts the first screen (Phase 3 of the plan keeps that to one ask), hold it behind `!firstRun` in `dashboard/page.tsx`.
- A player who follows the founder is not shown the same post twice (notice wins, follower card hides).
- Graceful before 00054 is run: a post to followers never touches the new column; the dashboard notice query just returns nothing; the admin page reads `*` so it still loads.

## Where things are
- `supabase/migrations/00054_founder_notice.sql`: **founder step: run it in the Supabase SQL editor** before using the tick box. Until then, ticking it fails with "could not be saved".
- `src/components/FounderNotice.tsx`: the dashboard notice and its dismiss.
- `src/lib/founderPosts.ts`: `everyone` in `checkFounderPost`, `FOUNDER_NOTICE_DAYS`, `founderNoticeCutoff`.
- `src/app/(app)/admin/posts/PostComposer.tsx`: the tick box, confirm and "Every player" tag.
- `src/app/(app)/dashboard/page.tsx`: the query and placement.

## Open
- Run 00054. Then post the "early days, sorry for bugs" notice (draft in the chat of 2026-10-24).
- Safety reviewer (2026-10-24): PASS, nothing blocking. Owner-only server-side, plain text, no new data, migration adds one boolean. Its low findings are fixed: links and contact details now refused, dismiss target 44px, no needless role. Left: tone is the founder's own judgement, and a post cannot be recalled from players who already saw it.

## Gotchas
- The safety-reviewer agent diffs against `origin/HEAD`, which is unset in the cloud checkout; `git remote set-head origin main` fixes it locally.
- `pkill -f "next dev"` run from the shell can kill the shell itself (exit 144); remove temp pages first.
- Tested the notice on a temporary page under `/parents/` (public path, since the dashboard needs a login): shows, dismisses, stays dismissed after reload, returns for a newer post, works with storage blocked. Page removed.

## Follow-up (2026-10-25)
- The founder found the amber banner bulky. It is now a slim strip: small icon, "From the founder ·" running into the message, cut to two lines with Read more / Show less, lighter tint, no kind label or All posts row. The long apology measures 82px collapsed, about 40% of the old banner.
- "Mark fixed" in App errors did nothing for crashes whose message has line breaks (the MediaPipe ones): a browser sends a line break in a form field as \r\n, so the message posted back no longer matched the stored one. Proven in Chromium. The button now sends the row id and the server reads the exact message (`admin/errors/page.tsx`, `markResolved`).
