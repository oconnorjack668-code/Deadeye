# Design round and full build, D1-D11 plus D4 (2026-11-24)

Agent: Claude Code, Opus 5.5 (lead) with designer, marketing, builder, safety-reviewer and release-checker agents · PRs: #158, #159, #160, #161, #162, #163, #164, #165, #166, #167, #168 (all merged) · Status: shipped, phone check open (S56)

## Outcome
From new shooting footage (18 Nov clip) to a full design round and build. Live now: setup for Irish players with age brackets 13-15/16-17/18+ (D4), Today for a new player (D6), logo C (D9), Check your email and auth polish (D3/D5/D8), Watch it back and the decode screen (D1), shot chart v2, first-session result and share cards (D10/D2/D7), opening animations, slogans, page loader and landing (D11). Migrations 00068 and 00069 applied to the live database on the founder's yes.

## Decisions
- Blur rule narrowed: banners, logos and background faces may be blurred; a blur is never consent for an under-18 (founder; #158).
- Look: keep today's look and polish it; sleek, professional, simple, cool; modern touches only where they help. Three full restyles (Arena, HUD, Glass) turned down as "too much". `docs/design.md` loosened to allow that (founder).
- Shot chart: classic blue cold to red hot; red stays the brand colour (logo, "Aim is earned"), orange for actions; Log menu in section colours (founder).
- Logo C chosen; openings A, B2 (backspin) and C rotate per cold open, 0.8 s minimum, tap to skip; slogan per visit; tracker tips rotate three times then hold (founder).
- Slogans: the starred lines plus Kobe's "Rest at the end, not in the middle"; "Hard work outweighs talent" shown without a name (no source ties it to Kobe). Safety advises quotes stay off marketing surfaces and "Rest at the end" away from under-18s before any screen shows them (`docs/agent-os/marketing/2026-11-22-slogans.md`).
- Founding offer hidden on Today until the first log, still on /pro (founder). D6 built before the S42 read (founder accepted the mixed count).
- Age option A with two migrations and a backup table (founder); younger answer wins in the backfill.

## Where things are
- `docs/agent-os/design/`: 2026-11-20 screen review and Watch it back, 2026-11-22 polish, loading, logo/, 2026-11-23 setup; turned-down `2026-11-20-visual-direction.md`.
- Designs for the founder to look at: `Documents\Deadeye designs 2026-11-20\` on the laptop (some contain the 18 Nov clip; kept off the public repo).
- `docs/agent-os/backlog.md`: D1-D11.
- Live DB: `public.profiles_age_bracket_bak` backup (S57).

## Status changes
- Closed: S54, S55
- Opened: S56, S57

## Gotchas
- Usage limits stopped the subagents three times; the lead finished their last steps (rebase, privacy lines, PRs).
- Low laptop memory froze Chrome and killed dev servers, so nothing was seen signed in on a phone (S56). Run one or two agents at a time.
- Shared worktrees: agents switched each other's HEAD; each release check now uses its own worktree.
- Every new app marker must be named on the privacy page (S46); safety caught it on #165, #166, #168.
- CI runs Node 22: a `new Response(Blob)` mock passed on Node 24 locally and failed in CI (#166).
- Branch protection needs branches up to date: `gh pr update-branch` before each merge.
- Supabase `apply_migration` asks for a confirmation that expires after 10 minutes.
