# Pricing check, Pro guards, Stripe setup steps (2026-11-20)

Agent: Claude Code, Opus 5.5 · Commits: c20da7a (merge of #156) · PR: #156 · Status: shipped; Stripe waits for the founder and his mam (S3)

## Outcome
Prices checked against the market and kept: Pro €6.99/month, €49.99/year, founder €4.99/month. #156 (live, build c20da7a) added a Pro AI fair-use limit (50 coach questions a day, 20 AI reports in 24 h, owner exempt), a 7-day free trial on a player's first Pro subscription, and a 2-year end to the founding club price (until 31 Jan 2029). Stripe sandbox account started; the rest needs the founder's mam (account holder, 18+).

## Decisions
- Keep Pro prices: HomeCourt is $7.99/$69.99; cheaper does not win players, it only loses money. Activation and clubs are the money, not price (founder agreed).
- Prices set **tax-inclusive** in Stripe so nothing changes for players when VAT starts.
- No "unlimited" anywhere: daily fair-use ceiling instead (`src/lib/ai/fairUse.ts`), stated in the terms.
- Free week once: `trialFor()` in `src/lib/stripe.ts`; founding members keep their free months instead; any earlier Stripe subscription means no trial.
- Founding clubs: 2 years, not for life (founder chose 2 over 1: a jump to €179 after one paid season risks losing the club).
- Stripe onboarding choices: "Pick what you need", not Managed Payments (+3.5% a payment); tick Accept online payments, Create subscriptions, Send invoices; skip Collect tax (not VAT-registered; fee per payment); set up in the Dashboard; start in the sandbox and start live verification early.
- Payouts must go to an account in the mam's name (her bank or her Revolut IBAN); not the founder's own accounts, not PayPal.

## Where things are
- Market check sources: homecourt.ai/pricing, apppricinglab.com (HomeCourt), adapty.io (Ball AI), DribbleUp App Store.
- `docs/founder-setup-guide.md` Parts 4-6: the shorter version of the steps below.

## Stripe steps (do these with mam; sandbox for A-E, live in F)
Keep a note of the 5 values marked (V).

**A. Settings → Business → Public details:** name `Deadeye`; statement descriptor and shortened descriptor `DEADEYE`; support email `hello@deadeye.ie`; phone mam's if required; website `https://deadeye.ie`; privacy `https://deadeye.ie/privacy`; terms `https://deadeye.ie/terms`. **Branding:** logo, orange brand colour, dark accent.

**B. Product catalogue → + Add product:** name `Deadeye Pro`; description: "AI coaching on every session and video, up to 50 coach questions a day, a weekly AI report, every training program and Basketball IQ section, your all-time shot chart, and coaching for up to 10 teams." Prices, each Recurring, EUR, More options → Include tax in price: Yes, no free trial (the app adds it):
- `6.99` Monthly → (V) `STRIPE_PRO_MONTHLY_PRICE_ID` (`price_...`)
- `49.99` Yearly → (V) `STRIPE_PRO_YEARLY_PRICE_ID`
- `4.99` Monthly, nickname `Founder` → (V) `STRIPE_FOUNDER_MONTHLY_PRICE_ID`
Amounts exact: the app reads them from Stripe for the Pro page.

**C. Keys, webhook, portal**
- Developers → API keys → Secret key → Reveal → (V) `STRIPE_SECRET_KEY` (`sk_test_...`). Never share it.
- Developers → Webhooks → + Add destination: events from Your account; events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`; Webhook endpoint `https://deadeye.ie/api/webhooks/stripe`; description `Deadeye production`. Reveal Signing secret → (V) `STRIPE_WEBHOOK_SECRET` (`whsec_...`).
- Settings → Billing → Customer portal: Cancel subscriptions (at end of billing period); Switch plans between the €6.99 monthly and €49.99 yearly prices; Update payment methods; View invoice history; privacy and terms links as in A. Save.

**D. Vercel → deadeye → Settings → Environment Variables:** add the 5 (V) values, Production only, Sensitive ticked, no quotes, spaces or line breaks (a bad `EMAIL_FROM` broke parent emails on 20 Nov). Then Deployments → the top one → ⋯ → Redeploy; ask Claude to confirm the new build is live.

**E. Test (sandbox):** tester account on deadeye.ie → Pro shows €6.99/month, €49.99/year and "Your first 7 days are free" → Pro monthly → card `4242 4242 4242 4242`, expiry `12/30`, CVC `123`, country Ireland → checkout shows 7 days free then €6.99 → Pro turns on → Manage Pro opens the portal → cancel; Pro stays until the trial ends. Ask Claude to check the DB and logs; Stripe's webhook page shows 200s.

**F. Live:** mam completes Activate account: Individual / Sole trader, Ireland, her legal name, date of birth, address, phone, PPSN if asked, industry Software/SaaS, website `https://deadeye.ie`, description "Basketball training app subscription", payout IBAN in her name, photo ID. Copy the sandbox setup to live (or repeat B and C): new price ids, `sk_live_` key, new live webhook and `whsec_`. Replace all 5 in Vercel, redeploy at a quiet time. Buy Pro with a real card, cancel inside the free week, confirm no charge. Competition coupon: Coupons → + New, 25%, duration Once, redeem by 31 Mar 2027, promotion code `FOUNDING25`. Deadline: live by 8 Jan 2027; ask Claude to start club billing by mid-December.

## Status changes
- Closed: none
- Opened: none (S3 updated)
(The items themselves live in `docs/STATUS.md`; this list never restates them.)

## Gotchas
- The worktree's `node_modules` junction must be removed (`cmd //c rmdir`) before `git worktree remove --force`, or the force removal can follow it into the main checkout.
- The club sheet PDF is printed with headless Chrome: `chrome.exe --headless=new --no-pdf-header-footer --print-to-pdf=<out> file:///.../docs/sales/deadeye-club-plans.html`, then copied to `public/` and `docs/sales/`.
