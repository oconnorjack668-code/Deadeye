# Domains, email on deadeye.ie, email links in any browser (2026-11-20)

Agent: Claude Code, Opus 5.5 · Commits: 023130e, fa10238, 570db80, 5a176c2 · PR: #151, #150 · Status: shipped (founder checks left in S52)

## Outcome
deadeye.ie is the live address; www, deadeyebasketball.com and www redirect to it (308). App and auth emails send through Resend from `hello@deadeye.ie`, which forwards to getdeadeye@gmail.com (ImprovMX), and Gmail sends as it. Confirm and reset links no longer fail when opened in another browser (#151). Sales docs point to hello@deadeye.ie (#150).

## Decisions
- deadeye.ie is primary; the .com only redirects: shorter, Irish audience, everything already built for .ie (founder agreed).
- Bought both at Blacknight, "hosting elsewhere", DNS kept at Blacknight; registrant is the parent as a private individual (founder is 16).
- Sender is `hello@deadeye.ie`, not `no-reply@`: Supabase has no reply-to and ImprovMX has no no-reply alias, so replies to auth emails bounced (founder agreed).
- Resend receiving left off: it would put an MX on the root and clash with ImprovMX forwarding.
- Gmail "Send mail as" uses Resend SMTP (free), not ImprovMX's paid SMTP.
- `deadeyeapp.vercel.app`: never delete; redirect to deadeye.ie about 4 Dec after a move notice (S53), because players lose offline drafts and reminders on a new origin.
- Email links: `/auth/callback` also takes `token_hash` + `type` (verifyOtp, any browser); a failed code link shows "Email confirmed. Sign in to carry on." (`src/lib/authLink.ts`).

## Where things are
- `docs/founder-setup-guide.md` Part 3: Resend steps plus the three template links.
- `src/app/auth/callback/route.ts`, `src/lib/authLink.ts`, `__tests__/authLink.test.ts`: the link fix.
- Deadeye wording for all Supabase templates (Confirm signup, Reset password, Change email, Magic link, Invite, Reauthentication, Password changed, Email changed): given in chat on 2026-11-19; the three link addresses are in the guide. Body = whole HTML block in Source, subject = words only.
- DNS at Blacknight for deadeye.ie: Vercel A + www CNAME; Resend `send` MX/TXT, `resend._domainkey`; `_dmarc` `v=DMARC1; p=none;`; ImprovMX MX mx1/mx2 + root SPF.

## Status changes
- Closed: S3 domain and email part (S3 now Stripe only)
- Opened: S52, S53
(The items themselves live in `docs/STATUS.md`; this list never restates them.)

## Gotchas
- Vercel did not auto-deploy the #151 merge to production (no deployment for fa10238); the founder started it from Deployments → Create Deployment → `main`. After a merge, check the `deadeye-build` meta on deadeye.ie.
- Signing up in Chrome and opening the confirm email elsewhere confirmed the email (`email_confirmed_at` set) but failed the PKCE code exchange; that was the "expired or invalid" report.
- The founder saw the old Gmail on /privacy after the change: a cached copy on the device. Server showed hello@ on all three hosts; a hard refresh fixed it.
- `gh pr merge` refuses when the branch is behind main and auto-merge is off for the repo: `gh pr update-branch <n>`, wait for checks, then merge.
- A fresh worktree has no `node_modules` or Next route types: junction main's `node_modules` (same lockfile) and run `npx next typegen` before `tsc`.
