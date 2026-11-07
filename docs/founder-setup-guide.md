# Founder setup: deadeye.ie, email, Stripe and club billing

Written 2026-11-07. Do the parts in order: each one needs the one before.
`docs/launch-checklist.md` has the background; this is the step by step.

**Deadlines**

| When | What | Why |
| --- | --- | --- |
| This week | Part 1 to 3 (domain, Vercel, Supabase, email) | Parent emails, Stripe's web address and the Play app all wait on the domain |
| By Mon 14 Dec 2026 | Part 4 and 5 (Stripe Pro live) | Leaves a month to fix problems |
| **Hard: Fri 8 Jan 2027** | Pro checkout working with real cards | The first founding members' 3 free months end about 20 Jan; the app asks them to keep Pro from about 13 Jan. No Stripe = they can't |
| **Hard: Mon 1 Feb 2027** | Club billing (part 6) | Founding clubs start paying |

You're 16, so a parent or guardian holds the domain, Stripe and (later)
Google Play in **their** name, with their ID and card. Sit down together for
parts 1 and 4.

---

## Part 1: buy the domains (parent, about 20 minutes, about €17)

1. Search "Deadeye" on TMview (tmdn.org/tmview, free) for a trademark
   clash in Ireland/EU. If a basketball or app brand already holds it, stop
   and tell Claude.
2. Go to an Irish registrar (Blacknight: blacknight.com). Search `deadeye.ie`.
3. Register it in the parent's name and Irish address. A `.ie` needs proof
   of a connection to Ireland: the parent's address is enough. **Do not
   tick "already hold a .ie".**
4. Optional: also buy `deadeyebasketball.com` (Cloudflare or Blacknight,
   about $10 a year). It will just redirect to deadeye.ie.
5. Keep the registrar login safe: you need its DNS settings in parts 2 and 3.

## Part 2: point the domain at the app (you, 20 minutes, then waiting)

1. vercel.com → the `deadeye` project → Settings → Domains → Add
   `deadeye.ie`, then `www.deadeye.ie` (and `deadeyebasketball.com` if bought).
2. Make `deadeye.ie` the primary one; set the others to redirect to it.
   Keep `deadeyeapp.vercel.app` too (old links keep working).
3. Vercel shows DNS records (usually an `A` record and a `CNAME`). In the
   registrar's DNS settings, add exactly those.
4. Wait until Vercel shows "Valid Configuration" (minutes to a few hours).
   HTTPS turns on by itself.
5. **Supabase** → Authentication → URL Configuration:
   - Site URL: `https://deadeye.ie`
   - Redirect URLs: add `https://deadeye.ie/**` (keep the old ones).
   Skip this and sign-up and password emails link to the old address.
6. Check: open https://deadeye.ie, sign in with the tester account, sign out,
   use "Forgot password" and check the email's link goes to deadeye.ie.

Heads-up: players who open the new address start with a fresh browser store
there (drafts, saved rims on the phone, sound settings, push reminders). Post
a founder notice: "Deadeye has moved to deadeye.ie: sync anything you logged
offline first, and turn reminders back on."

## Part 3: email from deadeye.ie with Resend (you, 30 minutes)

1. resend.com → sign up (free plan is plenty) → Domains → Add `deadeye.ie`.
2. Resend shows DNS records (MX, TXT/SPF, DKIM). Add them at the registrar.
   Wait for "Verified".
3. Resend → API Keys → create one with "Sending access". Copy it once.
4. Vercel → Settings → Environment Variables, **Production**:
   - `RESEND_API_KEY` = the key (tick Sensitive)
   - `EMAIL_FROM` = `Deadeye <no-reply@deadeye.ie>`
   - `SUPPORT_EMAIL` = an address people can reach you on. Easiest: in the
     registrar or Cloudflare, forward `hello@deadeye.ie` to your Gmail, and
     use that.
5. Supabase → Authentication → Emails → SMTP Settings: replace the Gmail
   stopgap with Resend: host `smtp.resend.com`, port `465`, username
   `resend`, password = the Resend API key, sender `no-reply@deadeye.ie`,
   name `Deadeye`.
6. **Redeploy** in Vercel (Deployments → latest → Redeploy). New variables
   only reach new deployments.
7. Check: sign up a new test account and confirm the email arrives from
   deadeye.ie; sign up as a 14-year-old with your own email as the parent and
   confirm the parent email arrives.

While you're in Vercel, the **push keys** for training reminders are
missing (they fail every day): run `npx web-push generate-vapid-keys`, add
`NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` (Sensitive), redeploy
once for both. Never change the pair after players subscribe.

## Part 4: register the business and open Stripe (parent, about 1 hour)

1. Register as a **sole trader** with Revenue (ROS, free) in the parent's
   name, and the business name "Deadeye" with the CRO (core.cro.ie, about
   €20). Stripe works without these, but you'll want them before real money.
2. stripe.com → create an account **in the parent's name**: country Ireland,
   business type Individual / Sole trader, website `https://deadeye.ie`,
   product description "Basketball training app subscription", payouts to the
   parent's bank account. The parent is the representative (their ID).
3. Settings → Branding: logo and orange accent. Settings → Public details:
   support email from part 3, statement descriptor `DEADEYE`.
4. Vercel → Production: `LEGAL_NAME` and `LEGAL_ADDRESS` = the parent's name
   and the postal address that appears in the privacy policy and terms.

## Part 5: Pro checkout (you, about 1 hour; test first, then live)

Do it in **test mode** first (the toggle top right in Stripe).

1. Product catalogue → Add product "Deadeye Pro", in EUR, three recurring prices:
   - €6.99 monthly → its id (`price_...`) is `STRIPE_PRO_MONTHLY_PRICE_ID`
   - €49.99 yearly → `STRIPE_PRO_YEARLY_PRICE_ID`
   - €4.99 monthly, called "Founder" → `STRIPE_FOUNDER_MONTHLY_PRICE_ID`
2. Developers → API keys → the Secret key (`sk_test_...`) → `STRIPE_SECRET_KEY`.
3. Developers → Webhooks → Add endpoint `https://deadeye.ie/api/webhooks/stripe`
   with these 4 events: `checkout.session.completed`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`. Copy its Signing secret (`whsec_...`) →
   `STRIPE_WEBHOOK_SECRET`.
4. Settings → Billing → Customer portal: turn it on; allow cancelling and
   switching between monthly and yearly. (The app's "Manage Pro" opens it.)
5. Add the 5 variables in Vercel Production (keys Sensitive), redeploy.
6. Test on deadeye.ie with the tester account: buy Pro with card
   `4242 4242 4242 4242`, any future date, any CVC. Pro turns on. "Manage
   Pro" opens the portal; cancel; Pro ends at the period end. Ask Claude to
   check `/admin/errors` and the webhook log in Stripe (all 200s).
7. **Go live:** switch Stripe to live mode, repeat steps 1 to 4 there (live
   prices, `sk_live_` key, a new live webhook and secret), replace all 5
   values in Vercel, redeploy. Buy Pro once yourself with a real card, then
   refund it in Stripe.
8. Optional, later: Settings → Tax → turn on Stripe Tax to watch the €10,000
   EU threshold. No VAT registration until about €42,500 a year in Ireland.

Do parts 5.5 to 5.7 at a quiet time: for a few minutes test-mode keys are on
the live site.

## Part 6: club billing (Claude builds, you approve), by 1 Feb 2027

Not built yet. Ask Claude to start it by **mid-December**. It needs:
season and monthly club prices in Stripe, Pro for a whole team, invoices a
club treasurer can pay (card or SEPA), and a short club agreement. Prices
and the founding club offer are in `docs/sales/` and the
`2026-10-22-pricing-and-claude` handoff. Under-18 players' accounts stay in
the parent's name.

## After the domain: the Play Store app

Only once deadeye.ie is live: follow `docs/play-store/README.md` (the parent
opens the Google Play developer account, $25 once).
