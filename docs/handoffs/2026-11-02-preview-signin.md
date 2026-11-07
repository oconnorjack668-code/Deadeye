# Preview deployments sign in, privately (2026-11-02)

Agent: Claude Code (Opus 5.5) · Commits: this handoff and the README section only (the work was Vercel settings) · Status: done, checked on a fresh preview

## Outcome
- Vercel previews can now be signed in to. They used to fail with "Failed to fetch" because the Supabase URL and public key were set for Production only, so the browser had no address to call.
- Preview links are private: Deployment Protection is set to Standard, so a preview asks for a Vercel login. The production address (deadeyeapp.vercel.app) is still public (checked: 200).
- No preview holds a key that bypasses row level security. `SUPABASE_SERVICE_ROLE_KEY` was already Production-only, and the user unticked Preview on an unused copy of it, `Supabase_service_role_api_key`.
- The user gave standing permission for Claude to check changes on the preview link before they go live (Claude memory `preview-checks`). Merging still needs "merge N".

## Decisions
- Previews share the live database rather than using a second Supabase project. Local dev already uses it, a second project would need every migration run twice, and the app is early. Revisit when migrations need testing on their own.
- Only the two public variables are on Preview: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Unreviewed code never gets the service key, and features that need it fail on previews by design.
- The user changed the Vercel settings; Claude only read them. They are account settings, and the permission rules leave them to the user.

## Where things are
- README.md, "Preview deployments": the rules for using previews.
- Claude memory `vercel-production` (preview setup) and `preview-checks` (the permission and its limits).

## Checks run
- Vercel API (no values decrypted): both public keys target Production and Preview; every service-role key is Production-only; Standard protection is on.
- A fresh preview, built from an empty throwaway branch (`check/preview-signin`, deleted after), checked in the user's Chrome after they logged in to Vercel and signed in as the tester. The dashboard, Hoops, Settings, Leaderboard, Achievements and Profile showed real data. The data export API returned 500 with an empty body, which is the safe failure without the service key.

## Open
- None from this session. Its fix closes the preview item in [ui-polish-desktop](2026-11-01-ui-polish-desktop.md). That handoff's light-mode spot check is still open, and is now easier, since it can be done on a preview.

## Gotchas
- `NEXT_PUBLIC_*` values are fixed at build time. After changing one in Vercel, push something (an empty commit on a throwaway branch works) to get a preview that has it.
- With protection on, a preview opened in a Chrome that is not logged in to Vercel lands on Vercel's login page. The user logs in; Claude does not.
- "Standard" protection covers previews and generated deployment URLs but not the production domain, so the live site is not affected. Check with curl after any change to it.
