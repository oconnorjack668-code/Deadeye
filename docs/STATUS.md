# Deadeye status

The one place for what is open now and what was recently done. Every
session reads it first (a SessionStart hook prints it into each new Claude
Code chat; Codex reads it via `AGENTS.md`) and updates it before it ends
(`.claude/skills/handoff/SKILL.md`). Handoffs are history: an "Open" line in
an old handoff is what was open *that day*, not now.

Last updated: 2026-11-14 (Focus Finder live and checked as the tester; S34 now the follow-ups)

## Rules

- **This file wins over any handoff, memory note or subagent report.** If
  they disagree, check the evidence (PR state, code, `cron_runs`, the live
  site) and fix whichever is wrong.
- **Never tell the founder something is broken or still to do from an old
  note.** Say "unconfirmed since <date>" or check it first.
- **Close with evidence.** Move a done item to "Recently done" with the date
  and how it was confirmed (PR merged, commit, query, live check). Keep
  "Recently done" to the last 21 days; older lines are deleted (git keeps
  them).
- **Say exactly what is done and what is not.** An item names every place
  it applies and which are already fixed ("homepage fixed in #80; login,
  signup, privacy still old"). Check it where people see it (the live site,
  every copy of the text: grep the repo, `public/`, `docs/`), not one file.
  Founder, 2026-11-11: S7 read as if finished work was being raised again
  because it did not say the homepage was already fixed.
- Every open item has an id (`S<n>`, never reused), an owner, the date it
  was opened and when it was last checked and how.

## Open

| Id | What | Owner | Since | Last checked |
| --- | --- | --- | --- | --- |
| S1 | Sign the DPIA (`docs/legal/dpia.md`, section 7) with the account holder, then its 7 open actions (action 7, routine import, is done apart from S21). Add the marketing footage pipeline (stills go to Anthropic in Claude Code sessions), and Focus Finder AI plans (PR #103). From its safety review: section 1 row (free text, picked weaknesses, position, level, make rates, IQ scores, coach read counts, setup goals; team age group, level, size; contract plus parent consent for 13-15; plan kept for the account's life, text not kept, provider 30 days); R5 support line now shown in the browser; R11 extended to free text naming other people; note that suggestions are profiling for the core service only (ICO std 12) and free text may hold Art 9 health data, minimised by not storing it. | Founder | 2026-11-07 | 2026-11-13: still DRAFT; sign-up answer row and R8 added on PR #97 |
| S34 | Focus Finder follow-ups (live since 14 Nov, PR #103): (1) merge #107 if not yet merged (refs like "L4, L35" leaked into AI plan text; fixed there). (2) Matcher: "we give up open corner threes" also picks "Missing open catch-and-shoot shots" (the attacking side); teach it that "give up"/"allow" means defence. (3) Delete one saved plan (needs an `ai_reports` DELETE policy). (4) Arrow keys on the For me / For my team switch. (5) Test team name saved doubled ("Deadeye Test TeamDeadeye Test Team", code T8RM7J, no players): rename or leave. Founder question from the safety review: has any under-16 been approved since the parent page last changed? If so, fresh consent is a legal-advice question. | Builder; founder for the question | 2026-11-13 | 2026-11-14: live checks done (see Recently done) |
| S35 | 5 of 36 IQ lesson videos are gone from YouTube (oEmbed 404 on 13 Nov; the player sees "Video unavailable"): One-Motion Shooting Dip (`rCwr_b4sVQE`), Shot Pocket Alignment (`b7r-YJ6kLz8`), The Veer Finish (`W5b7fN_zRkk`), Reading Drop Coverage (`k9F7pX2_1sQ`), Running the Floor (`JBSAIy6npKY`). The first four are in free sections, and Focus Finder links straight to them. Pick replacement clips (watch them first), then update `study_items.youtube_video_id` in a migration. | Founder decides / builder | 2026-11-13 | 2026-11-13: all 36 ids checked |
| S2 | Hoop model credits (`ml/rim-detector/ATTRIBUTION.md`): rim-finding shipped 3 Nov, CC BY needs the credit. Done: ballllls, X-Basket, basketball-computer-vision (links added 11 Nov). Missing: the page link for Basketball Shot Tracking (311 images, CC BY 4.0, classes ball, rim, backboard; the Colab file was `Basketball Shot Tracking.coco.zip`). Not found by the founder or by web search. If it cannot be found, ask whether to drop that dataset and retrain. | Founder | 2026-11-03 | 2026-11-11: 3 of 4 linked |
| S3 | Billing: deadeye.ie, then Resend, then Stripe Pro live by 2027-01-08; club billing by 2027-02-01 (`docs/founder-setup-guide.md`); then the Play Store. | Founder | 2026-11-09 | 2026-11-09 |
| S5 | Tuesday video v4: parent/adult consent for the shooter and the bystander in clip 16761, then post with a TikTok/Meta library sound (AI label if the AI voice is used). | Founder | 2026-11-11 | 2026-11-11 |
| S6 | Send the promo's numbers per platform (profile visits, link taps, post dates) into `docs/agent-os/marketing/results.md`. | Founder | 2026-11-11 | 2026-11-11 |
| S27 | Tracker visuals (PR #99): try them on a phone in a real session, inline and full screen sideways; only checked on stills from the sample clip so far. Also decide whether "N in a row" should show at phone size (it is left out there when it would cover the full-screen button). | Founder | 2026-11-13 | 2026-11-13 |
| S9 | `docs/brand/promo-video/PLAN.md` says 150 drills; the app has 168 (`DRILL_COUNT`). | Marketing | 2026-11-11 | 2026-11-11 |
| S10 | New filming for posts: phone in shot on a bag, head height, not facing windows, nobody else in the hall, a girl player for some posts. | Founder | 2026-11-11 | 2026-11-11 |
| S11 | Getting players in: no new signups since 2026-10-24 (as of 9 Nov). Wexford Blazers trial by 16 Nov (`docs/agent-os/clubs/pipeline.md`), first social posts, E0 (message 5 players). | Founder + agents | 2026-11-09 | unconfirmed since 2026-11-09 |
| S12 | Run the first agent exams to set a baseline: `/agent-os exam all`. | Lead (local) | 2026-11-11 | 2026-11-11 |
| S13 | Hoop finder: retry with the live camera on a phone (Chrome's permission bubble blocked it in testing). | Founder | 2026-11-03 | unconfirmed since 2026-11-03 |
| S14 | PR check routine (`trig_01MSRh74ux3XbaYfzerJjJtz`) not yet seen firing on an agent PR; check it ran on #84. | Lead | 2026-11-09 | unconfirmed since 2026-11-09 |
| S15 | Error tracking: Sentry is not in the app, so support-triage has only Vercel errors (kept about an hour on Hobby). Adding Sentry needs a backlog item and a safety review. | Founder decides | 2026-11-11 | 2026-11-11 |
| S16 | `.agents/skills/agent-os/` in the main checkout is an untracked, outdated Codex copy of the agent-os skill: regenerate or delete. | Founder decides | 2026-11-11 | 2026-11-11 |
| S19 | Read the C4 parent-consent draft (backlog `C4`: parents of 16 and 17 year olds can see coach posts). | Founder | 2026-11-09 | 2026-11-11: still `idea` in the backlog |
| S21 | US transfer for AI data: sources disagree on whether Anthropic is on the EU-US Data Privacy Framework list. Its DPA's EU SCCs cover the transfer either way; record a check of dataprivacyframework.gov or a short transfer impact assessment in the DPIA (action 7). Applies to every AI feature, not only routine import. | Founder decides (legal advice) | 2026-11-11 | 2026-11-11: raised by the safety re-review |
| S25 | First runs of the new agents. Done: designer (reviewed S8, `docs/agent-os/design/2026-11-13-tracker-s8-review.md`, on main); player-outreach plan `docs/agent-os/outreach/2026-11-13-outreach.md` and qa-tester run `docs/agent-os/qa/2026-11-13-qa.md` (10 of 10 tested steps passed on `e330a94`, 2 P3s: slow sample-clip load, Today's 32px nested buttons; leave the Chrome window restored next run), both on main since PR #97. Left: exams (S12). | Lead | 2026-11-11 | 2026-11-13: all three have run |
| S32 | Trend board TikTok gap. Done 13 Nov: `docs/agent-os/trends/ads.md` filled from marketing's scan (written in by the lead on the founder's word; the agent's write was blocked by the older guard in the main checkout, fixed once the main checkout is pulled) plus the Meta Ad Library, Ireland, read in a browser. Left: TikTok Creative Center (Top Ads, Trend Discovery) needs a TikTok for Business login; the founder logs in (free) and pastes UK Trend Discovery, Sports, 7 days, or marketing keeps working without it. | Founder | 2026-11-13 | 2026-11-13: board written; TikTok login gap |
| S33 | FDYS poster (outreach plan, route 3): safety-reviewer reads it before it is printed: QR to the plain address only, no identifiable under-18s. Not drafted yet (designer). | Designer, then safety-reviewer | 2026-11-13 | 2026-11-13: poster not made |
| S17 | Optional: delete the unused `OPENAI_API_KEY` in Vercel; check `src/proxy.ts` refreshes sessions as current Supabase docs say. | Founder / builder | 2026-11-09 | unconfirmed since 2026-11-09 |

## Recently done (do not raise again)

- 2026-11-14 · Focus Finder live: PR #103 merged (`7858348`) on the founder's "merge 103", checks green, production READY. Checked live as the tester: free list, AI week plan (saved by claude-sonnet-5-5: 6 drills, 3 film, 6-day week with a rest day; what the player wrote not stored; 1 AI report spent, 3 to 2), and Send to team (test team made on the founder's word, tester is now player + coach, back on the playing side; assignment saved with weakness labels, lesson and drill names only, link `/focus?w=closeouts_help,boxing_out&from=coach`, due 21 Nov). Follow-ups are S34.
- 2026-11-13 · PR #97 merged (`9fb3b4c`) and live: optional "Where did you hear about Deadeye?" at sign-up (no `?ref` link codes), funnel and weekly counts by answer, answer cleared after 12 months, Settings → Privacy "Clear my answer", landing-demo localStorage mark removed, build id in Settings and `<meta name="deadeye-build">`, outreach plan with plain links. Live check: `/signup` shows the optional question, `/privacy` dated 13 Nov with the 12-month wording, build meta `9fb3b4c · production`, no `?ref=` on `/`. S30 closed; S24 closed (build id was its last part).
- 2026-11-13 · Drill and exercise demo videos: migration `00059` (PR #100) run on the live database 13 Nov. Query after: 165 of 168 drills and all 167 exercises have a video. No good match, so they keep the YouTube search link: game-winner-countdown, lane-line-touches, spacing-drive-and-drift. Swap any weak pick in Owner tools.
- 2026-11-13 · S31 closed: the #97 safety fix-soon items built on the PR #97 branch (`e6e4ccf` plus the follow-up commit): `heard_from` cleared 12 months after sign-up by the daily job (failures logged and returned), Settings → Privacy "Clear my answer", `deadeye-from-demo` mark and `signup_from_demo` step removed (old marks tidied on the welcome screen), public counts all-time only, DPIA row and R8, privacy page updated (13 Nov). Safety follow-up review: PASS. Live once #97 merges (S30).
- 2026-11-13 · S8 tracker visuals: flame beside the score, MAKE/MISS beside the rim with "N in a row" under it, saved-video end card with the red logo and no underline. Designer reviewed, founder signed off on the before/after page and said merge. PR #99. The phone check is S27.
- 2026-11-13 · PR #96 (13 Nov handoff) merged: `e330a94` on main. S26 closed.

- 2026-11-11 · New agents on main: designer, player-outreach, qa-tester and the weekly TikTok trend scan. PR #94 merged 11 Nov (`82e08bb`) with green checks, pinned to the reviewed commit. S23 closed.

- 2026-11-11 · PR #93 (planner / TY timetable handoff) merged: `a0404f2` on main. S22 closed.

- 2026-11-11 · Opera connected to Claude in Chrome beside Chrome: Opera for everyday Deadeye work, Chrome keeps the tester account for signed-in tests. Confirmed with switch_browser; device ids in Claude memory `test-live-in-chrome`.
- 2026-11-11 · **Gym routine import live** (paste, screenshot, CSV; 10 free AI reads a month): PR #88 merged (2f5f682), migration 00058 run by the founder, Anthropic terms checked (PR #89, DPIA action 7); founder confirmed the API key is Anthropic's and saved the DPA. Closes S20. Safety re-review 11 Nov: earlier fixes confirmed; its one block (count rows only deleted on the player's next import) and smaller items fixed in PR #91 (47ec091), daily clean-up in `cron/reminders`.
- 2026-11-11 · Overclaiming wording gone everywhere: homepage meta (#80, earlier); site-wide meta in `layout.tsx`, `public/manifest.json`, the welcome page and the Play Store short description in PR fix/overclaim-wording. Live check after merge: `/login` meta says "counts your makes and misses".
- 2026-11-11 · Status file and SessionStart hook live: PR #85 merged (4809180). The 9 Nov HQ redesign / hub worker handoff reached main with PR #81 (its open items are in S3, S7, S11, S19).
- 2026-11-11 · Agents to professional level: playbooks, briefs, exams, guard hooks, trade tools, video-editor upgrade. PR #84 merged (b676120). Canva, Figma, Ahrefs, Adobe connected; Sentry and Similarweb skipped (S15).
- 2026-11-11 · Old hand-made `.codex/agents/*.toml` removed from the main checkout; generated ones in sync (`node scripts/sync-codex-agents.mjs --check`).
- 2026-11-11 · Video-editor agent, Tuesday video v1-v4, marketing week plan: PRs #82, #83 merged.
- 2026-11-10 · Landing demo says "count makes and misses": PR #80 merged.
- 2026-11-09 · E4 reminders card, weekly run, Deadeye Bench hub: PRs #74, #75, #76 merged (checked 2026-11-11).
- 2026-11-07 · **Push keys (VAPID) are set.** Every reminders run since 7 Nov returns 200 in `cron_runs`. Never list push keys or "reminders don't send" as open.
- 2026-11-03 · Rim-finding ("Find the hoop for me") shipped and checked live (credits still open: S2).
